'use strict';
'require view';
'require rpc';
'require ui';
'require poll';
'require dom';
'require routerino.common as rt';

// NetBird: mesh VPN WireGuard. Collegamento al proprio account con chiave di
// registrazione o accesso dal browser (SSO), stato, peer e reti instradate.
// Il DNS resta ad AdGuard Home (--disable-dns).

const callStatus = rpc.declare({ object: 'luci.glgw', method: 'nb_status' });
const callUp = rpc.declare({ object: 'luci.glgw', method: 'nb_up', params: [ 'mode', 'key', 'management_url', 'hostname' ] });
const callDown = rpc.declare({ object: 'luci.glgw', method: 'nb_down' });
const callService = rpc.declare({ object: 'luci.glgw', method: 'service_set', params: [ 'name', 'enabled' ] });

const STATES = { Connected: [ 'ok', 'Collegato' ], NeedsLogin: [ 'warn', 'Da collegare al tuo account' ], Connecting: [ 'info', 'Collegamento in corso' ], Idle: [ 'off', 'Scollegato' ], LoginFailed: [ 'err', 'Accesso non riuscito' ], SessionExpired: [ 'warn', 'Sessione scaduta: ricollega' ] };

function check(r) {
	if (r && r.error) throw new Error(r.error);
	return r;
}

return view.extend({
	load: function() {
		return callStatus();
	},

	// Ridisegna solo se lo stato cambia: il modulo di accesso non perde ciò che si sta scrivendo.
	refresh: function(s) {
		const sig = JSON.stringify([ s.daemon, s.login_url, s.ip, s.service.running, s.peers.connected, s.peers.total, s.management.connected ]);

		if (sig == this.sig && s.daemon != 'Connected') return;

		this.sig = sig;
		dom.content(this.box, this.body(s));
	},

	login: function(s) {
		const key = E('input', { 'class': 'rt-input rt-mono', 'type': 'password', 'autocomplete': 'off', 'placeholder': 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX', 'maxlength': '128' });
		const mgmt = E('input', { 'class': 'rt-input rt-mono', 'placeholder': 'vuoto = netbird.io', 'maxlength': '200' });
		const host = E('input', { 'class': 'rt-input', 'placeholder': 'es. brume-casa', 'maxlength': '63' });
		const opts = () => [ mgmt.value.trim(), host.value.trim() ];

		return rt.card('lock', 'warn', 'Collega il Brume al tuo account NetBird', '', [
			s.login_url ? rt.note('info', [ 'Apri questo link, accedi al tuo account NetBird e conferma: la pagina si aggiorna da sola. ', E('a', { 'href': s.login_url, 'target': '_blank', 'rel': 'noopener' }, [ s.login_url ]) ]) : '',
			E('div', { 'class': 'rt-section-t' }, [ E('h3', {}, [ 'Con una chiave di registrazione' ]) ]),
			E('div', { 'class': 'rt-sub' }, [ 'La crei nel pannello NetBird (Setup Keys). Il modo più semplice per un router.' ]),
			rt.field('Chiave', key),
			E('div', { 'class': 'rt-foot' }, [
				E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, () =>
					callUp('key', key.value.trim(), opts()[0], opts()[1]).then(check).then(r => this.refresh(r))) }, [ 'Collega' ])
			]),
			E('div', { 'class': 'rt-section-t' }, [ E('h3', {}, [ 'Oppure accedendo dal browser' ]) ]),
			E('div', { 'class': 'rt-foot' }, [
				E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, () =>
					callUp('sso', '', opts()[0], opts()[1]).then(check).then(r => this.refresh(r))) }, [ 'Genera il link di accesso' ])
			]),
			E('details', { 'class': 'rt-help' }, [
				E('summary', {}, [ rt.icon('help'), 'Opzioni avanzate (server proprio, nome)' ]),
				E('div', {}, [ rt.field('Server di gestione', mgmt, 'Solo se usi un NetBird installato da te.'), rt.field('Nome del dispositivo', host) ])
			])
		]);
	},

	body: function(s) {
		const st = STATES[s.daemon] || [ 'off', s.daemon ];
		const connected = s.daemon == 'Connected';

		return [
			rt.hero('NetBird', 'Rete privata tra i tuoi dispositivi, ovunque siano, basata su WireGuard.', [
				rt.pill('radar', st[1], st[0] == 'err' || st[0] == 'warn'),
				connected ? rt.pill('home', s.peers.connected + ' di ' + s.peers.total + ' peer collegati') : ''
			]),
			!s.service.running ? rt.card('alert', 'err', 'Servizio fermo', '', [
				E('div', { 'class': 'rt-foot' }, [ E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, () => callService('netbird', true).then(() => callStatus()).then(r => this.refresh(r))) }, [ 'Avvia NetBird' ]) ])
			]) : connected ? rt.card('radar', 'ok', 'Collegato', rt.badge('ok', s.ip), [
				rt.kv([
					[ 'Nome nella rete', s.fqdn || '—' ],
					[ 'Indirizzo NetBird', s.ip || '—' ],
					[ 'Server di gestione', (s.management.url || '') + (s.management.connected ? '' : ' (non raggiungibile)') ],
					[ 'Segnalazione', s.signal.connected ? 'collegata' : 'non collegata' ],
					[ 'Versione', s.version || '—' ]
				]),
				E('div', { 'class': 'rt-foot' }, [
					E('button', { 'class': 'btn cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, () => callDown().then(check).then(r => this.refresh(r))) }, [ 'Scollega' ])
				])
			]) : this.login(s),
			connected ? rt.card('list', 'info', 'Peer', rt.badge('info', s.peers.list.length + ''), [
				s.peers.list.length ? E('table', { 'class': 'rt-table' }, [
					E('tr', {}, [ E('th', {}, [ 'Nome' ]), E('th', {}, [ 'Indirizzo' ]), E('th', {}, [ 'Stato' ]), E('th', {}, [ 'Collegamento' ]) ])
				].concat(s.peers.list.map(p => E('tr', {}, [
					E('td', { 'data-label': 'Nome' }, [ p.fqdn || '—' ]), E('td', { 'class': 'rt-mono', 'data-label': 'Indirizzo' }, [ p.ip ]),
					E('td', { 'data-label': 'Stato' }, [ rt.badge(p.status == 'Connected' ? 'ok' : 'off', p.status == 'Connected' ? 'Collegato' : p.status) ]),
					E('td', { 'data-label': 'Collegamento' }, [ p.type == 'P2P' ? 'diretto' : p.type == 'Relayed' ? 'tramite relay' : (p.type || '—') ])
				])))) : rt.empty('radar', 'Nessun altro peer nella tua rete NetBird.')
			]) : '',
			rt.card('home', 'info', 'Raggiungere la casa da NetBird', '', [
				E('div', { 'class': 'rt-sub' }, [ 'Il Brume può fare da porta verso la rete di casa: nel pannello NetBird crea una rete (Networks) con la risorsa 192.168.188.0/24 e scegli questo dispositivo come router.' ]),
				s.networks && s.networks.length ? rt.kv(s.networks.map(n => [ 'Rete instradata', String(n) ])) : '',
				rt.help('Il Brume non cambia il DNS dei dispositivi NetBird: se vuoi il blocco pubblicità anche lì, nel pannello NetBird (DNS) aggiungi come server l\'indirizzo NetBird del Brume.')
			])
		];
	},

	render: function(s) {
		this.box = rt.root([]);
		this.refresh(s);
		poll.add(() => callStatus().then(r => this.refresh(r)), 5);

		return this.box;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
