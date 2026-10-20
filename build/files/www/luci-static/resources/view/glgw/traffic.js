'use strict';
'require view';
'require rpc';
'require ui';
'require dom';
'require poll';
'require routerino.common as rt';

// Analisi del traffico di un dispositivo: siti chiesti (registro di AdGuard Home),
// connessioni attive (solo per chi è collegato alla porta LAN del Brume) e
// blocchi su misura: un dominio solo per quel dispositivo, una destinazione o
// tutto internet (regola firewall sul MAC).

const callList = rpc.declare({ object: 'luci.glgw', method: 'dev_list' });
const callAnalyze = rpc.declare({ object: 'luci.glgw', method: 'dev_analyze', params: [ 'ip' ] });
const callBlock = rpc.declare({ object: 'luci.glgw', method: 'dev_block', params: [ 'ip', 'kind', 'value', 'port', 'proto' ] });
const callUnblock = rpc.declare({ object: 'luci.glgw', method: 'dev_unblock', params: [ 'ip', 'id' ] });
const callLanDhcp = rpc.declare({ object: 'luci.glgw', method: 'lan_dhcp', params: [ 'on' ] });

function check(r) {
	if (r && r.error) throw new Error(r.error);
	return r;
}

function label(d) {
	return d.name || (d.ip.indexOf(':') >= 0 ? 'Dispositivo IPv6' : d.ip);
}

function row(main, sub, side) {
	return E('div', { 'style': 'display:flex;flex-wrap:wrap;align-items:center;gap:.4em .8em;padding:.55em 0;border-bottom:1px solid var(--rt-line)' }, [
		E('div', { 'style': 'flex:1 1 14em;min-width:0' }, [
			E('div', { 'style': 'font-weight:600;overflow-wrap:anywhere' }, main),
			sub ? E('div', { 'class': 'rt-sub', 'style': 'overflow-wrap:anywhere' }, sub) : ''
		]),
		E('div', { 'style': 'display:flex;gap:.4em;align-items:center' }, side)
	]);
}

return view.extend({
	load: function() {
		return callList();
	},

	// porta LAN: stato del cavo e del DHCP, per collegarci la TV
	lan: function(l) {
		return rt.card('plug', l.dhcp ? 'ok' : 'info', 'Porta LAN del Brume', l.dhcp ? rt.badge('ok', 'Pronta') : rt.badge('off', 'DHCP spento'), [
			E('div', { 'class': 'rt-sub' }, [ 'Collega qui con il cavo il dispositivo da controllare (es. la TV): tutto il suo traffico passa dal Brume, quindi vedi le connessioni e puoi bloccarle. Per gli altri dispositivi di casa si vedono solo i siti chiesti.' ]),
			rt.kv([
				[ 'Cavo', l.carrier ? 'collegato' : 'nessuno' ],
				[ 'Indirizzi automatici (DHCP)', l.dhcp ? 'attivi: 192.168.1.x' : 'spenti' ]
			]),
			E('div', { 'class': 'rt-foot' }, [
				E('button', { 'class': 'btn cbi-button' + (l.dhcp ? '' : ' cbi-button-apply'), 'click': ui.createHandlerFn(this, () =>
					callLanDhcp(!l.dhcp).then(check).then(r => { this.devs = r; this.redraw(true); })) }, [ l.dhcp ? 'Spegni il DHCP sulla LAN' : 'Attiva il DHCP sulla LAN' ])
			]),
			l.dhcp ? '' : rt.help('Il Brume controlla prima che dalla porta LAN non risponda il FRITZ!Box: se il cavo va ancora alla rete di casa, rifiuta.', 'È sicuro?')
		]);
	},

	picker: function() {
		const sel = E('select', { 'class': 'rt-input', 'change': ev => { this.ip = ev.target.value; this.refresh(); } }, [
			E('option', { 'value': '' }, [ '— scegli —' ])
		].concat([ [ 'lan', 'Collegati al Brume (porta LAN)' ], [ 'casa', 'Rete di casa (solo siti chiesti)' ] ].map(g => {
			const list = this.devs.devices.filter(d => d.where == g[0]);
			return list.length ? E('optgroup', { 'label': g[1] }, list.map(d =>
				E('option', { 'value': d.ip, 'selected': d.ip == this.ip ? '' : null }, [ label(d) + (d.name ? ' — ' + d.ip : '') ]))) : '';
		})));

		return rt.card('radar', 'info', 'Dispositivo', '', [
			rt.field('Da analizzare', sel, 'L\'elenco comprende chi è sulla porta LAN e chi in casa ha usato il DNS del Brume nelle ultime 24 ore.')
		]);
	},

	block: function(kind, value, port, proto) {
		return callBlock(this.ip, kind, value, port || 0, proto || '').then(check).then(r => { this.data = r; this.redraw(); });
	},

	analysis: function(a) {
		const d = a.device, lan = d.where == 'lan';
		const blockedDom = {};

		a.rules.forEach(r => { if (r.kind == 'domain') blockedDom[r.what] = r.id; });

		const internet = a.rules.filter(r => r.kind == 'internet')[0];

		return [
			rt.card(lan ? 'plug' : 'home', lan ? 'ok' : 'info', label(d), rt.badge(lan ? 'ok' : 'info', lan ? 'Porta LAN' : 'Rete di casa'), [
				rt.kv([
					[ 'Indirizzo', E('span', { 'class': 'rt-mono' }, [ d.ip ]) ],
					[ 'MAC', E('span', { 'class': 'rt-mono' }, [ d.mac || '—' ]) ]
				]),
				lan ? E('div', { 'class': 'rt-foot' }, [
					internet
						? E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, () =>
							callUnblock(this.ip, internet.id).then(check).then(r => { this.data = r; this.redraw(); })) }, [ 'Ridai internet' ])
						: E('button', { 'class': 'btn cbi-button cbi-button-reset', 'click': ui.createHandlerFn(this, () => {
							if (confirm('Bloccare tutto internet per ' + label(d) + '? Resta raggiungibile solo dalla rete del Brume.'))
								return this.block('internet');
						}) }, [ 'Blocca tutto internet' ])
				]) : rt.note('info', [ 'Passa dal FRITZ!Box: qui vedi i siti che chiede e puoi bloccarli solo per lui; le connessioni no. Per vederle collegalo alla porta LAN.' ])
			]),
			rt.card('globe', 'info', 'Siti chiesti', rt.badge('off', a.dns.length + ' domini'), this.domains(a.dns, blockedDom)),
			lan ? rt.card('pulse', 'info', 'Connessioni attive', rt.badge('off', a.conns.length), a.conns.length ? a.conns.map(c => row(
				[ c.domain || c.dst ],
				[ (c.service || c.proto.toUpperCase()) + (c.port ? ' · porta ' + c.port + '/' + c.proto : '') + (c.domain ? ' · ' + c.dst : '') + ' · ' + rt.bytes(c.bytes) ],
				[ c.domain ? E('button', { 'class': 'btn cbi-button cbi-button-reset', 'click': ui.createHandlerFn(this, () => this.block('domain', c.domain)) }, [ 'Blocca sito' ]) : '',
				  E('button', { 'class': 'btn cbi-button' + (c.domain ? '' : ' cbi-button-reset'), 'click': ui.createHandlerFn(this, () =>
					this.block('dest', c.dst, c.port, c.port ? c.proto : null)) }, [ c.domain ? 'Blocca IP' : 'Blocca' ]) ]
			)) : [ rt.empty('pulse', 'Nessuna connessione in corso in questo momento.') ]) : '',
			rt.card('shield', a.rules.length ? 'warn' : 'ok', 'Regole per questo dispositivo', rt.badge(a.rules.length ? 'warn' : 'ok', a.rules.length + ''), a.rules.length ? a.rules.map(r => row(
				[ r.kind == 'domain' ? 'Dominio ' + r.what : r.kind == 'internet' ? 'Tutto internet' : 'Destinazione ' + r.what ],
				[ r.kind == 'domain' ? 'AdGuard Home, solo per questo dispositivo' : 'Firewall del Brume, sul MAC' ],
				[ E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, () =>
					callUnblock(this.ip, r.id).then(check).then(x => { this.data = x; this.redraw(); })) }, [ 'Rimuovi' ]) ]
			)) : [ rt.empty('shield', 'Nessun blocco su misura.') ])
		];
	},

	// filtro (raggiunti / bloccati / tutti) e righe mostrate restano tra un aggiornamento e l'altro
	domains: function(dns, blockedDom) {
		const blocked = x => x.blocked == x.count || blockedDom[x.name];
		const shown = dns.filter(x => this.show == 'all' || (this.show == 'blocked') == !!blocked(x));
		const tab = (id, text, n) => E('button', { 'class': 'btn cbi-button' + (this.show == id ? ' cbi-button-apply' : ''), 'click': () => {
			this.show = id;
			this.limit = 25;
			this.redraw();
		} }, [ text + ' (' + n + ')' ]);

		return [
			E('div', { 'style': 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:.4em' }, [
				tab('allowed', 'Raggiunti', dns.filter(x => !blocked(x)).length),
				tab('blocked', 'Bloccati', dns.filter(x => blocked(x)).length),
				tab('all', 'Tutti', dns.length)
			]),
			...(shown.length ? shown.slice(0, this.limit).map(x => row(
				[ x.name ],
				[ x.count + (x.count == 1 ? ' richiesta' : ' richieste') + (x.blocked ? ' · ' + (x.blocked == x.count ? 'bloccato dalle liste' : x.blocked + ' bloccate dalle liste') : '') ],
				[ blockedDom[x.name]
					? E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, () =>
						callUnblock(this.ip, blockedDom[x.name]).then(check).then(r => { this.data = r; this.redraw(); })) }, [ 'Sblocca' ])
					: x.blocked == x.count ? rt.badge('ok', 'bloccato')
					: E('button', { 'class': 'btn cbi-button cbi-button-reset', 'click': ui.createHandlerFn(this, () => this.block('domain', x.name)) }, [ 'Blocca' ]) ]
			)) : [ rt.empty('globe', 'Nessun dominio in questo elenco.') ]),
			shown.length > this.limit ? E('div', { 'class': 'rt-foot' }, [
				E('button', { 'class': 'btn cbi-button', 'click': () => { this.limit += 25; this.redraw(); } }, [ 'Mostra altri (' + (shown.length - this.limit) + ')' ])
			]) : '',
			rt.help('Il blocco di un sito vale solo per questo dispositivo ed è attivo in pochi secondi; il dispositivo può però ricordarsi l\'indirizzo per qualche minuto. Bloccare un IP o tutto internet chiude subito anche le connessioni già aperte (solo per chi è sulla porta LAN).', 'Quando ha effetto un blocco?')
		];
	},

	refresh: function() {
		if (!this.ip) {
			this.data = null;
			return Promise.resolve(this.redraw());
		}
		return callAnalyze(this.ip).then(r => { if (!r.error) { this.data = r; this.redraw(); } });
	},

	// il menu a tendina si ridisegna solo quando cambia l'elenco, non a ogni aggiornamento
	redraw: function(all) {
		dom.content(this.heroEl, rt.hero('Analisi traffico', 'Cosa fa in rete un dispositivo: siti che chiede, server a cui si collega e blocchi su misura solo per lui.', [
			rt.pill('plug', this.devs.lan.dhcp ? 'Porta LAN pronta' : 'Porta LAN senza DHCP', !this.devs.lan.dhcp),
			rt.pill('radar', this.devs.devices.length + ' dispositivi')
		]));
		if (all) dom.content(this.pickEl, this.picker());
		dom.content(this.anEl, this.data && this.data.device.ip == this.ip ? this.analysis(this.data) : []);
		dom.content(this.lanEl, this.lan(this.devs.lan));
	},

	render: function(devs) {
		this.devs = devs;
		this.ip = new URLSearchParams(window.location.search).get('ip') || '';
		this.show = 'allowed';
		this.limit = 25;
		this.heroEl = E('div');
		this.pickEl = E('div');
		this.anEl = E('div', { 'style': 'display:grid;gap:inherit' });
		this.lanEl = E('div');
		this.box = rt.root([ this.heroEl, this.pickEl, this.anEl, this.lanEl ]);
		this.redraw(true);
		this.refresh();

		poll.add(() => this.ip ? this.refresh() : Promise.resolve(), 10);

		return this.box;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
