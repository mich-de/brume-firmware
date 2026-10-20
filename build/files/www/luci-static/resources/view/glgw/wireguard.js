'use strict';
'require view';
'require rpc';
'require ui';
'require dom';
'require uqr';
'require routerino.common as rt';

// Server WireGuard (come VPN › WireGuard Server della GUI GL.iNet): client, nuovo
// client con QR, indirizzo pubblico di casa. La chiave privata di un nuovo
// client viene generata sul router e mostrata una sola volta: non resta salvata.

const callList = rpc.declare({ object: 'luci.glgw', method: 'wg_list' });
const callAdd = rpc.declare({ object: 'luci.glgw', method: 'wg_add', params: [ 'name' ] });
const callDel = rpc.declare({ object: 'luci.glgw', method: 'wg_del', params: [ 'public_key' ] });
const callEndpoint = rpc.declare({ object: 'luci.glgw', method: 'wg_endpoint', params: [ 'endpoint' ] });
const callFile = rpc.declare({ object: 'luci.glgw', method: 'wg_file', params: [ 'name', 'action' ] });

function check(r) {
	if (r && r.error) throw new Error(r.error);
	return r;
}

function showConfig(title, name, config, note) {
	const qr = E('div', { 'style': 'max-width:300px;background:#fff;padding:8px;border-radius:8px' });

	dom.content(qr, Object.assign(E(uqr.renderSVG(config, { pixelSize: 4, whiteColor: 'white', blackColor: 'black' })), { style: 'width:100%;height:auto' }));

	ui.showModal(title, [
		note ? rt.note('warn', [ note ]) : '',
		E('p', {}, [ 'Inquadra il QR con l\'app WireGuard del telefono, oppure scarica il file per il computer.' ]),
		E('div', { 'class': 'rt-row', 'style': 'align-items:flex-start;flex-wrap:wrap;gap:1em' }, [
			qr, E('pre', { 'class': 'rt-conf', 'style': 'flex:1;min-width:16em;white-space:pre-wrap' }, [ config ])
		]),
		E('div', { 'class': 'right' }, [
			E('button', { 'class': 'btn', 'click': () => {
				const a = E('a', { 'href': URL.createObjectURL(new Blob([ config ], { type: 'text/plain' })), 'download': name.replace(/[^A-Za-z0-9_-]/g, '_') + '.conf' });
				document.body.appendChild(a); a.click(); a.remove();
			} }, [ 'Scarica il file' ]), ' ',
			E('button', { 'class': 'btn cbi-button-action', 'click': ui.hideModal }, [ 'Chiudi' ])
		])
	]);
}

function ago(s) {
	return s == null ? 'mai' : s < 180 ? 'collegato ora' : 'collegato ' + rt.duration(s) + ' fa';
}

return view.extend({
	load: function() {
		return callList();
	},

	refresh: function(d) {
		dom.content(this.box, this.body(d));
	},

	body: function(d) {
		const endpoint = E('input', { 'class': 'rt-input rt-mono', 'value': d.endpoint || '', 'placeholder': 'es. xxxxxxxx.myfritz.net', 'maxlength': '253' });
		const name = E('input', { 'class': 'rt-input', 'placeholder': 'es. telefono di Mario', 'maxlength': '24' });

		return [
			rt.hero('Server WireGuard', 'Entra nella rete di casa da fuori, con il blocco pubblicità di AdGuard anche in giro.', [
				rt.pill('lock', d.up ? 'Server attivo sulla porta UDP ' + d.port : 'Server spento', !d.up),
				rt.pill('home', d.peers.length + ' client')
			]),
			rt.card('globe', d.endpoint ? 'ok' : 'warn', 'Indirizzo pubblico di casa', d.endpoint ? rt.badge('ok', 'Impostato') : rt.badge('warn', 'Da impostare'), [
				E('div', { 'class': 'rt-sub' }, [ 'Il nome con cui i client trovano casa da internet (es. l\'indirizzo MyFRITZ!). Finisce nei file dei nuovi client.' ]),
				rt.field('Indirizzo', endpoint),
				E('div', { 'class': 'rt-foot' }, [
					E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, () =>
						callEndpoint(endpoint.value.trim()).then(check).then(r => this.refresh(r))) }, [ 'Salva' ])
				]),
				rt.help('Sul FRITZ!Box: Internet › Freigaben › Portfreigaben, aggiungi il dispositivo Brume con la porta UDP ' + d.port + '. L\'indirizzo MyFRITZ! lo trovi in Internet › MyFRITZ!-Konto. Se la linea è DS-Lite (nessun IPv4 pubblico) da fuori funziona solo via IPv6.', 'Come si apre la porta sul FRITZ!Box?')
			]),
			rt.card('lock', 'info', 'Client', rt.badge('info', d.peers.length + ''), [
				d.peers.length ? E('table', { 'class': 'rt-table' }, [
					E('tr', {}, [ E('th', {}, [ 'Nome' ]), E('th', {}, [ 'Indirizzo VPN' ]), E('th', {}, [ 'Stato' ]), E('th', {}, [ 'Traffico ↓/↑' ]), E('th', {}, []) ])
				].concat(d.peers.map(p => E('tr', {}, [
					E('td', { 'data-label': 'Nome' }, [ p.name || '—' ]),
					E('td', { 'class': 'rt-mono', 'data-label': 'Indirizzo VPN' }, [ p.address ]),
					E('td', { 'data-label': 'Stato' }, [ rt.badge(p.handshake_ago != null && p.handshake_ago < 180 ? 'ok' : 'off', ago(p.handshake_ago)) ]),
					E('td', { 'data-label': 'Traffico ↓/↑' }, [ rt.bytes(p.tx) + ' / ' + rt.bytes(p.rx) ]),
					E('td', {}, [ E('button', { 'class': 'btn cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, () => {
						if (!confirm('Eliminare il client «' + (p.name || p.address) + '»? Non potrà più collegarsi.')) return;
						return callDel(p.public_key).then(check).then(r => this.refresh(r));
					}) }, [ 'Elimina' ]) ])
				])))) : rt.empty('lock', 'Nessun client: creane uno qui sotto.')
			]),
			rt.card('spark', 'info', 'Nuovo client', '', [
				rt.field('Nome', name, 'Per riconoscerlo: telefono, portatile…'),
				E('div', { 'class': 'rt-foot' }, [
					E('button', { 'class': 'btn cbi-button cbi-button-add', 'click': ui.createHandlerFn(this, () =>
						callAdd(name.value.trim()).then(check).then(r => {
							showConfig('Client «' + r.name + '»', r.name, r.config, r.endpoint_set ? null :
								'Indirizzo pubblico non ancora impostato: nel file c\'è INDIRIZZO_PUBBLICO_DI_CASA. Impostalo sopra e ricrea il client, oppure correggilo a mano.');
							return callList().then(l => this.refresh(l));
						})) }, [ 'Crea e mostra il QR' ])
				]),
				rt.help('Il client riceve un indirizzo 10.66.66.x, usa il Brume come DNS (blocco pubblicità) e manda nel tunnel tutto il traffico. La chiave privata del client compare solo adesso: se perdi il QR, elimina il client e creane un altro.')
			]),
			d.files.length ? rt.card('alert', 'warn', 'File di client salvati sul router', '', [
				E('div', { 'class': 'rt-sub' }, [ 'Contengono la chiave privata del client: dopo averli importati è meglio cancellarli.' ]),
				E('div', { 'class': 'rt-row' }, d.files.map(f => E('span', {}, [
					E('b', { 'class': 'rt-mono' }, [ f ]), ' ',
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, () => callFile(f, 'get').then(check).then(r => showConfig('File «' + f + '»', f, r.config))) }, [ 'Mostra QR' ]), ' ',
					E('button', { 'class': 'btn cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, () => callFile(f, 'delete').then(check).then(r => this.refresh(r))) }, [ 'Cancella' ])
				])))
			]) : ''
		];
	},

	render: function(d) {
		this.box = rt.root(this.body(d));

		return this.box;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
