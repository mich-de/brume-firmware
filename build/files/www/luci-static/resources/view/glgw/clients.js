'use strict';
'require view';
'require rpc';
'require poll';
'require dom';
'require routerino.common as rt';

// Dispositivi collegati alla porta LAN del Brume (indirizzi dati dal suo DHCP) e
// altri visti in rete. I dispositivi della casa stanno sulla rete del FRITZ!Box:
// le loro richieste DNS si vedono in AdGuard Home.

const callLeases = rpc.declare({ object: 'luci-rpc', method: 'getDHCPLeases', expect: { '': {} } });
const callHints = rpc.declare({ object: 'luci-rpc', method: 'getHostHints', expect: { '': {} } });

return view.extend({
	load: function() {
		return Promise.all([ L.resolveDefault(callLeases(), {}), L.resolveDefault(callHints(), {}) ]);
	},

	body: function(leases, hints) {
		const l4 = leases.dhcp_leases || [];
		const leased = {};

		l4.forEach(l => { leased[(l.macaddr || '').toUpperCase()] = true; });

		const others = Object.keys(hints).filter(mac => !leased[mac.toUpperCase()] && (hints[mac].ipaddrs || []).length);

		return [
			rt.hero('Dispositivi', 'Chi è collegato al Brume. I dispositivi della casa (rete del FRITZ!Box) usano il Brume solo come DNS: li trovi nelle statistiche di AdGuard Home.'),
			rt.card('list', 'info', 'Collegati alla LAN del Brume', rt.badge('info', l4.length + ''), [
				l4.length ? E('table', { 'class': 'rt-table' }, [
					E('tr', {}, [ E('th', {}, [ 'Nome' ]), E('th', {}, [ 'Indirizzo' ]), E('th', {}, [ 'MAC' ]), E('th', {}, [ 'Indirizzo scade tra' ]) ])
				].concat(l4.map(l => E('tr', {}, [
					E('td', { 'data-label': 'Nome' }, [ l.hostname || '—' ]),
					E('td', { 'class': 'rt-mono', 'data-label': 'Indirizzo' }, [ l.ipaddr ]),
					E('td', { 'class': 'rt-mono', 'data-label': 'MAC' }, [ l.macaddr ]),
					E('td', { 'data-label': 'Scade tra' }, [ l.expires > 0 ? rt.duration(l.expires) : 'fisso' ])
				])))) : rt.empty('plug', 'Nessun dispositivo ha ancora un indirizzo dal Brume.')
			]),
			rt.card('radar', 'off', 'Altri dispositivi visti', rt.badge('off', others.length + ''), [
				others.length ? E('table', { 'class': 'rt-table' }, [
					E('tr', {}, [ E('th', {}, [ 'Nome' ]), E('th', {}, [ 'Indirizzi' ]), E('th', {}, [ 'MAC' ]) ])
				].concat(others.map(mac => E('tr', {}, [
					E('td', { 'data-label': 'Nome' }, [ hints[mac].name || '—' ]),
					E('td', { 'class': 'rt-mono', 'data-label': 'Indirizzi' }, [ (hints[mac].ipaddrs || []).join(', ') ]),
					E('td', { 'class': 'rt-mono', 'data-label': 'MAC' }, [ mac ])
				])))) : rt.empty('radar', 'Nessun altro dispositivo visto.')
			])
		];
	},

	render: function(data) {
		this.box = rt.root(this.body(data[0], data[1]));
		poll.add(() => this.load().then(r => dom.content(this.box, this.body(r[0], r[1]))), 15);

		return this.box;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
