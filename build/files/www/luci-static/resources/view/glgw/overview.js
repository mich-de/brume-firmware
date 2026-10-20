'use strict';
'require view';
'require rpc';
'require poll';
'require dom';
'require routerino.common as rt';

// Panoramica del Brume (equivalente di Internet + Sistema › Panoramica della GUI
// GL.iNet): collegamenti, servizi, VPN e hardware in una pagina.

const callStatus = rpc.declare({ object: 'luci.glgw', method: 'status' });
const callWan = rpc.declare({ object: 'network.interface.wan', method: 'status' });
const callBoard = rpc.declare({ object: 'system', method: 'board' });

const NAMES = { adguardhome: 'AdGuard Home', unbound: 'Unbound', netbird: 'NetBird', samba4: 'Condivisione USB', collectd: 'Statistiche' };
const WEAR = [ '', '0–10%', '10–20%', '20–30%', '30–40%', '40–50%', '50–60%', '60–70%', '70–80%', '80–90%', '90–100%', 'oltre la vita prevista' ];

// Riquadro di sintesi in cima alla pagina: la risposta in un colpo d'occhio, utile sul telefono.
function tile(tone, label, value, sub, path) {
	return E('a', { 'class': 'rt-card rt-tile rt-' + tone, 'href': L.url('admin/glgw/' + path), 'style': 'text-decoration:none;color:inherit' }, [
		E('div', { 'class': 'rt-tile-l' }, [ label ]),
		E('div', { 'class': 'rt-big' }, [ value ]),
		E('div', { 'class': 'rt-sub' }, [ sub ])
	]);
}

const LEVELS = { err: [ 'err', 'Grave' ], warn: [ 'warn', 'Attenzione' ], info: [ 'info', 'Da sapere' ] };

// Riquadro "Da sistemare": un avviso per riga con il pulsante che porta dove si risolve.
function alertsCard(list) {
	const errs = list.filter(a => a.level == 'err').length;

	if (!list.length)
		return rt.note('ok', [ E('b', {}, [ 'Tutto a posto. ' ]), 'Nessun problema trovato.' ]);

	return rt.card('alert', errs ? 'err' : 'warn', 'Da sistemare', rt.badge(errs ? 'err' : 'warn', list.length + (list.length == 1 ? ' avviso' : ' avvisi')), [
		E('div', { 'class': 'rt-alerts' }, list.map(a => E('div', { 'class': 'rt-alert-row rt-' + LEVELS[a.level][0] }, [
			E('div', { 'class': 'rt-alert-t' }, [ rt.badge(LEVELS[a.level][0], LEVELS[a.level][1]), E('b', {}, [ a.title ]) ]),
			E('div', { 'class': 'rt-sub' }, [ a.text ]),
			a.page != 'overview' ? E('a', { 'class': 'btn cbi-button', 'href': L.url('admin/glgw/' + a.page) }, [ 'Sistema' ]) : ''
		])))
	]);
}

function when(ts) {
	return ts ? new Date(ts * 1000).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'mai';
}

function link(path, text) {
	return E('a', { 'class': 'btn cbi-button', 'href': L.url('admin/glgw/' + path) }, [ text ]);
}

return view.extend({
	load: function() {
		return Promise.all([ callStatus(), L.resolveDefault(callWan(), {}), L.resolveDefault(callBoard(), {}) ]);
	},

	body: function(st, wan, board) {
		const ip = (wan['ipv4-address'] || [])[0];
		const gw = (wan.route || []).filter(r => r.target == '0.0.0.0')[0];
		const svc = {};

		(st.services || []).forEach(s => { svc[s.name] = s; });

		const dnsOk = svc.adguardhome && svc.adguardhome.running && svc.unbound && svc.unbound.running;
		const nbOk = st.netbird && st.netbird.daemon == 'Connected';

		return [
			rt.hero(board.hostname || 'Brume', (board.model || '') + ' · ' + ((board.release || {}).description || ''), [
				rt.pill('globe', st.internet ? 'Internet raggiungibile' : 'Internet non raggiungibile', !st.internet),
				rt.pill('shield', dnsOk ? 'DNS protetto attivo' : 'DNS protetto fermo', !dnsOk),
				rt.pill('lock', st.wg.active + ' client VPN collegati'),
				rt.pill('radar', nbOk ? 'NetBird collegato' : 'NetBird non collegato', !nbOk)
			]),
			alertsCard(st.alerts || []),
			E('div', { 'class': 'rt-grid rt-tiles' }, [
				tile(st.internet ? 'ok' : 'err', 'Internet', st.internet ? 'Ok' : 'No', st.wan.carrier ? 'WAN a ' + st.wan.speed + ' Mbit/s' : 'nessun cavo WAN', 'overview'),
				tile(dnsOk ? 'ok' : 'err', 'Blocco DNS', dnsOk ? 'Attivo' : 'Fermo', 'AdGuard + Unbound', 'dns'),
				tile(st.wg.active ? 'ok' : 'info', 'VPN', String(st.wg.active), 'client collegati su ' + st.wg.peers, 'wireguard'),
				tile(st.temp < 70 ? 'ok' : 'warn', 'Temperatura', st.temp.toFixed(0) + ' °C', 'RAM libera ' + rt.bytes(st.mem_avail), 'overview')
			]),
			E('div', { 'class': 'rt-grid' }, [
				rt.card('globe', st.wan.carrier ? 'ok' : 'err', 'Internet', rt.badge(st.internet ? 'ok' : 'warn', st.internet ? 'Raggiungibile' : 'Non raggiungibile'), [
					rt.kv([
						[ 'Porta WAN (2,5G)', st.wan.carrier ? 'Collegata a ' + st.wan.speed + ' Mbit/s' : 'Nessun cavo' ],
						[ 'Indirizzo', ip ? ip.address + '/' + ip.mask : '—' ],
						[ 'Gateway', gw ? gw.nexthop : '—' ],
						[ 'Porta LAN', st.lan.carrier ? 'Collegata a ' + st.lan.speed + ' Mbit/s' : 'Nessun cavo' ]
					]),
					!st.wan.carrier ? rt.note('warn', [ 'Collega la porta WAN del Brume a una porta LAN del FRITZ!Box: serve a internet, al DNS per la casa e alla VPN.' ]) : ''
				]),
				rt.card('shield', dnsOk ? 'ok' : 'warn', 'DNS e blocco pubblicità', '', [
					rt.kv([
						[ 'AdGuard Home', rt.badge(svc.adguardhome && svc.adguardhome.running ? 'ok' : 'err', svc.adguardhome && svc.adguardhome.running ? 'Attivo' : 'Fermo') ],
						[ 'Unbound (ricorsivo)', rt.badge(svc.unbound && svc.unbound.running ? 'ok' : 'err', svc.unbound && svc.unbound.running ? 'Attivo' : 'Fermo') ]
					]),
					E('div', { 'class': 'rt-foot' }, [ link('dns', 'Gestisci') ])
				]),
				rt.card('lock', st.wg.up ? 'ok' : 'err', 'VPN', '', [
					rt.kv([
						[ 'Server WireGuard', st.wg.up ? st.wg.peers + ' client, ' + st.wg.active + ' collegati ora' : 'Spento' ],
						[ 'NetBird', nbOk ? 'Collegato (' + st.netbird.ip + ', ' + st.netbird.peers + ' peer)' : st.netbird.daemon == 'NeedsLogin' ? 'Da collegare al tuo account' : st.netbird.daemon ]
					]),
					E('div', { 'class': 'rt-foot' }, [ link('wireguard', 'WireGuard'), link('netbird', 'NetBird') ])
				]),
				rt.card('chip', st.temp < 70 ? 'ok' : 'warn', 'Hardware', rt.badge('info', st.temp.toFixed(0) + ' °C'), [
					rt.meter('Memoria', st.mem_total - st.mem_avail, st.mem_total, rt.bytes(st.mem_total - st.mem_avail) + ' di ' + rt.bytes(st.mem_total)),
					rt.kv([
						[ 'Usura eMMC', st.emmc_wear != null ? (WEAR[st.emmc_wear] || '?') : '—' ],
						[ 'Acceso da', rt.duration(st.uptime) ],
						[ 'CPU', '2× Cortex-A53 a 1,3 GHz' ]
					])
				]),
				rt.card('spark', 'info', 'Rete', rt.badge(st.net.offload ? 'ok' : st.net.sqm ? 'info' : 'off', st.net.offload ? 'Accelerazione hardware' : st.net.sqm ? 'SQM attivo' : 'Nessuna ottimizzazione'), [
					E('div', { 'class': 'rt-sub' }, [ st.net.sqm ? 'Code anti-lag: ' + (st.net.down / 1000) + ' / ' + (st.net.up / 1000) + ' Mbit/s.' : st.net.offload ? 'Il traffico instradato passa dal motore hardware (PPE), senza pesare sulla CPU.' : '' ]),
					E('div', { 'class': 'rt-foot' }, [ link('network', 'Cambia') ])
				]),
				rt.card('shield', 'info', 'Protezione e manutenzione', '', [
					rt.kv([
						[ 'Blocco pubblicità (24 h)', st.maint.adguard ? st.maint.adguard.blocked + ' bloccate su ' + st.maint.adguard.queries + ' (' + (st.maint.adguard.queries ? Math.round(st.maint.adguard.blocked * 100 / st.maint.adguard.queries) : 0) + '%)' : 'nel pannello AdGuard (login attivo)' ],
						[ 'Liste di blocco', st.maint.filters + ' scaricate' ],
						[ 'banIP', st.maint.banip.status == 'active' ? st.maint.banip.elements.toLocaleString('it-IT') + ' indirizzi bloccati' : 'non attivo' ],
						[ 'Controllo connessione', st.maint.watchcat ? 'attivo (Watchcat)' : 'spento' ],
						[ 'Firmware', 'OpenWrt ' + st.maint.firmware.current + (st.maint.firmware.available ? ' (disponibile ' + st.maint.firmware.latest + ')' : '') ],
						[ 'Ultimo backup', when(st.maint.backup) ],
						[ 'Memoria interna', rt.bytes(st.maint.overlay.used) + ' di ' + rt.bytes(st.maint.overlay.total) ]
					])
				]),
				rt.card('list', 'info', 'Servizi', '', [
					rt.kv((st.services || []).map(s => [ NAMES[s.name] || s.name, rt.badge(s.running ? 'ok' : s.enabled ? 'err' : 'off', s.running ? 'In funzione' : s.enabled ? 'Non partito' : 'Disattivato') ]))
				])
			])
		];
	},

	render: function(data) {
		this.box = rt.root(this.body(data[0], data[1], data[2]));

		poll.add(() => Promise.all([ callStatus(), L.resolveDefault(callWan(), {}) ]).then(r => dom.content(this.box, this.body(r[0], r[1], data[2]))), 10);

		return this.box;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
