'use strict';
'require view';
'require rpc';
'require ui';
'require poll';
'require dom';
'require routerino.common as rt';

// DNS e blocco pubblicità (come Applicazioni › AdGuard Home + Rete › DNS della
// GUI GL.iNet): catena dispositivi → AdGuard Home → Unbound → root server.

const callDns = rpc.declare({ object: 'luci.glgw', method: 'dns_status' });
const callService = rpc.declare({ object: 'luci.glgw', method: 'service_set', params: [ 'name', 'enabled' ] });

function pct(a, b) {
	return b > 0 ? Math.round(a * 100 / b) + '%' : '—';
}

return view.extend({
	load: function() {
		return callDns();
	},

	toggle: function(name, s, label) {
		return rt.toggle(s.running, on => on ? label + ' acceso' : label + ' spento', on =>
			callService(name, on).then(r => { if (r.error) throw new Error(r.error); }).then(() => callDns()).then(d => dom.content(this.box, this.body(d))));
	},

	body: function(d) {
		const u = d.unbound_stats;
		const host = window.location.hostname;

		return [
			rt.hero('DNS e blocco pubblicità', 'Ogni richiesta passa da AdGuard Home, che blocca pubblicità e tracciamento, poi da Unbound, che chiede direttamente ai server radice di internet: nessun provider DNS vede le tue richieste.', [
				rt.pill('shield', d.adguard.running ? 'AdGuard Home attivo' : 'AdGuard Home fermo', !d.adguard.running),
				rt.pill('globe', d.unbound.running ? 'Unbound attivo' : 'Unbound fermo', !d.unbound.running)
			]),
			rt.steps([
				{ icon: 'home', tone: 'ok', title: 'Dispositivi', open: false, body: [ E('div', { 'class': 'rt-sub' }, [ 'Il FRITZ!Box dà l\'indirizzo del Brume come DNS a tutta la casa; i client VPN lo ricevono dal tunnel.' ]) ] },
				{ icon: 'shield', tone: d.adguard.running ? 'ok' : 'err', title: 'AdGuard Home', badge: d.adguard.running ? [ 'ok', 'attivo' ] : [ 'err', 'fermo' ], open: true, body: [
					E('div', { 'class': 'rt-sub' }, [ 'Blocca pubblicità e tracciamento con le liste AdGuard DNS, AdAway e HaGeZi Pro. Statistiche, log delle richieste e liste si gestiscono nel suo pannello.' ]),
					E('div', { 'class': 'rt-row' }, [
						this.toggle('adguardhome', d.adguard, 'AdGuard Home'),
						E('a', { 'class': 'btn cbi-button cbi-button-action', 'href': 'http://' + host + ':' + d.adguard_port + '/', 'target': '_blank', 'rel': 'noopener' }, [ 'Apri il pannello AdGuard Home' ])
					]),
					d.adguard.running ? '' : rt.note('err', [ 'Con AdGuard Home spento i dispositivi della casa restano senza DNS: riaccendilo o cambia il DNS nel FRITZ!Box.' ])
				] },
				{ icon: 'globe', tone: d.unbound.running ? 'ok' : 'err', title: 'Unbound (resolver ricorsivo)', badge: d.unbound.running ? [ 'ok', 'attivo' ] : [ 'err', 'fermo' ], open: true, body: [
					E('div', { 'class': 'rt-row' }, [ this.toggle('unbound', d.unbound, 'Unbound') ]),
					rt.kv([
						[ 'Richieste', String(u.queries) ],
						[ 'Risposte dalla cache', pct(u.cachehits, u.queries) ],
						[ 'Firmate DNSSEC verificate', String(u.secure) ],
						[ 'DNSSEC non valide (bloccate)', String(u.bogus) ],
						[ 'Attivo da', rt.duration(Math.round(u.uptime)) ]
					]),
					d.unbound.running ? '' : rt.note('warn', [ 'Con Unbound spento AdGuard Home usa i DNS di riserva (Quad9, Cloudflare) in chiaro.' ]),
					E('a', { 'class': 'btn cbi-button', 'href': L.url('admin/services/unbound') }, [ 'Impostazioni avanzate di Unbound' ])
				] }
			]),
			rt.card('list', 'info', 'Server a cui AdGuard Home inoltra', '', [
				rt.kv(d.upstreams.map(x => {
					const m = x.match(/^\[\/([^/]+)\/\](.*)$/);
					return m ? [ 'Nomi .' + m[1], m[2] ] : [ 'Tutto il resto', x == '127.0.0.1:5335' ? 'Unbound (127.0.0.1:5335)' : x ];
				})),
				rt.help('I nomi .lan sono i dispositivi collegati al Brume (dnsmasq), i .fritz.box quelli della rete di casa (FRITZ!Box). Gli indirizzi locali al contrario (chi è 192.168.x.y) vengono chiesti a loro.')
			])
		];
	},

	render: function(d) {
		this.box = rt.root(this.body(d));
		poll.add(() => callDns().then(r => dom.content(this.box, this.body(r))), 15);

		return this.box;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
