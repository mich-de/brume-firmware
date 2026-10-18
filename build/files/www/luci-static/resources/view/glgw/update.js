'use strict';
'require view';
'require rpc';
'require ui';
'require dom';
'require routerino.common as rt';

// Aggiornamenti del firmware: le immagini le costruisce GitHub Actions (una
// release per ogni OpenWrt stabile); qui si controlla e si installa con un clic.

const callStatus = rpc.declare({ object: 'luci.glgw', method: 'fw_status' });
const callCheck = rpc.declare({ object: 'luci.glgw', method: 'fw_check' });
const callUpgrade = rpc.declare({ object: 'luci.glgw', method: 'fw_upgrade' });

const STATES = {
	download: 'Scarico l\'immagine da GitHub (circa 45 MB)…',
	verifica: 'Controllo SHA-256 e compatibilità con il Brume…',
	installazione: 'Scrivo il nuovo firmware: non spegnere il Brume. Si riavvia da solo in 3–4 minuti.'
};

function check(r) {
	if (r && r.error) throw new Error(r.error);
	return r;
}

function when(ts) {
	return ts ? new Date(ts * 1000).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'mai';
}

return view.extend({
	load: function() {
		// controllo automatico se l'ultimo ha più di 6 ore (o non c'è: /tmp si svuota a ogni riavvio)
		return callStatus().then(s => (Date.now() / 1000 - s.checked > 21600)
			? L.resolveDefault(callCheck(), s).then(r => r.error ? s : r) : s);
	},

	body: function(s) {
		const err = /^errore: /.test(s.state) ? s.state.replace(/^errore: /, '') : null;
		const copied = E('input', { 'type': 'checkbox' });

		return [
			rt.hero('Aggiornamenti del firmware', 'Per ogni nuova OpenWrt stabile GitHub costruisce l\'immagine del Brume con tutte le sue funzioni; da qui la installi mantenendo la configurazione.', [
				rt.pill('box', 'OpenWrt ' + s.current),
				s.available ? rt.pill('download', 'Disponibile ' + s.latest, true) : rt.pill('check', s.checked ? 'Aggiornato' : 'Non ancora controllato')
			]),
			rt.card('download', s.available ? 'warn' : 'ok', 'Firmware', s.available ? rt.badge('warn', 'Nuova versione') : rt.badge('ok', 'Aggiornato'), [
				rt.kv([
					[ 'Installato', 'OpenWrt ' + s.current ],
					[ 'Ultimo su GitHub', s.latest ? E('a', { 'href': s.url, 'target': '_blank', 'rel': 'noreferrer' }, [ 'OpenWrt ' + s.latest ]) : '—' ],
					[ 'Controllato', when(s.checked) ]
				]),
				err ? rt.note('err', [ 'Ultimo aggiornamento non riuscito: ' + err + '. Il firmware installato non è cambiato.' ]) : '',
				s.available && s.nas ? rt.note('warn', [
					'L\'aggiornamento cancella lo spazio interno (cartella «brume»). ',
					E('label', {}, [ copied, ' Ho copiato altrove i file che mi servono' ])
				]) : '',
				E('div', { 'class': 'rt-foot' }, [
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, () =>
						callCheck().then(check).then(r => this.update(r))) }, [ 'Controlla ora' ]),
					s.available ? E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, () => {
						if (s.nas && !copied.checked)
							throw new Error('Prima copia altrove i file della cartella «brume» e spunta la casella');
						if (!confirm('Aggiornare il Brume a OpenWrt ' + s.latest + '? Internet e DNS della casa si fermano per qualche minuto.'))
							return;
						return callUpgrade().then(check).then(() => this.progress());
					}) }, [ 'Aggiorna a OpenWrt ' + s.latest ]) : ''
				]),
				rt.help('Restano: configurazione, password, AdGuard Home con statistiche e liste, VPN WireGuard, identità NetBird, dischi USB. Si perdono: lo spazio interno «brume» e i pacchetti installati a mano. L\'immagine è verificata con lo SHA-256 pubblicato nella release e con il controllo di compatibilità di sysupgrade.', 'Cosa resta dopo l\'aggiornamento?'),
				rt.help('GitHub Actions controlla ogni giorno se è uscita una nuova OpenWrt stabile e costruisce l\'immagine nel repository pubblico ' + s.repo + '. Il Brume guarda le release ogni 6 ore e lo segnala nella Panoramica.', 'Da dove arrivano gli aggiornamenti?')
			])
		];
	},

	update: function(s) {
		dom.content(this.box, this.body(s));
	},

	// Avanzamento: lo script gira sul router; quando inizia la scrittura il
	// router non risponde più e LuCI aspetta che torni.
	progress: function() {
		const msg = E('p', { 'class': 'spinning' }, [ STATES.download ]);
		let reconnecting = false;

		ui.showModal('Aggiornamento del firmware', [ msg ]);

		const reconnect = () => {
			if (reconnecting) return;
			reconnecting = true;
			msg.textContent = STATES.installazione;
			ui.awaitReconnect(window.location.host);
		};

		const tick = () => callStatus().then(s => {
			if (/^errore: /.test(s.state)) {
				ui.hideModal();
				this.update(s);
				return;
			}
			if (s.state == 'installazione')
				return reconnect();
			msg.textContent = STATES[s.state] || STATES.download;
			window.setTimeout(tick, 2000);
		}).catch(reconnect);

		window.setTimeout(tick, 1000);
	},

	render: function(s) {
		this.box = rt.root(this.body(s));
		return this.box;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
