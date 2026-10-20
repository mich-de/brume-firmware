'use strict';
'require view';
'require rpc';
'require ui';
'require dom';
'require routerino.common as rt';

// Aggiornamenti del firmware: le immagini le costruisce GitHub Actions (una
// release per ogni OpenWrt stabile); qui si leggono le novità, si controlla e
// si installa con un clic.

const callStatus = rpc.declare({ object: 'luci.glgw', method: 'fw_status' });
const callCheck = rpc.declare({ object: 'luci.glgw', method: 'fw_check' });
const callUpgrade = rpc.declare({ object: 'luci.glgw', method: 'fw_upgrade' });

// [ stato in fw-state, cosa succede, dettaglio ]
const STEPS = [
	[ 'download', 'Scarico il nuovo firmware da GitHub', 'circa 45 MB, di solito meno di un minuto' ],
	[ 'verifica', 'Controllo che sia integro e adatto al Brume', 'SHA-256 della release e prova di sysupgrade' ],
	[ 'installazione', 'Installo e riavvio', '3–4 minuti: internet e DNS di casa si fermano, non spegnere il Brume' ],
	[ 'fatto', 'Questa pagina si ricarica da sola', 'quando il Brume torna, già con la nuova versione' ]
];

function check(r) {
	if (r && r.error) throw new Error(r.error);
	return r;
}

function when(ts) {
	return ts ? new Date(ts * 1000).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'mai';
}

// Elenco dei passi; current = indice del passo in corso (-1 = non ancora partito).
function steps(current) {
	return E('div', {}, STEPS.map((s, i) => E('div', { 'style': 'display:flex;gap:.7em;align-items:flex-start;margin:.7em 0' }, [
		current < 0 ? E('b', { 'style': 'min-width:1.4em' }, [ (i + 1) + '.' ])
			: rt.badge(i < current ? 'ok' : i == current ? 'info' : 'off', i < current ? 'fatto' : i == current ? 'in corso' : 'dopo'),
		E('div', {}, [ E('b', {}, [ s[1] ]), E('div', { 'class': 'rt-sub' }, [ s[2] ]) ])
	])));
}

// Testo della release (Markdown semplice) -> titoli, elenchi, link.
function inline(text) {
	return text.replace(/[*`]/g, '').split(/(https?:\/\/\S+)/).map((p, i) =>
		i % 2 ? E('a', { 'href': p, 'target': '_blank', 'rel': 'noreferrer' }, [ p ]) : p);
}

function notes(md) {
	const out = [];
	let list = null;

	md.split('\n').forEach(l => {
		l = l.trim();
		if (/^- /.test(l)) {
			if (!list) out.push(list = E('ul', { 'style': 'margin:.3em 0 .6em 1.3em;padding:0;list-style:disc' }));
			list.appendChild(E('li', { 'style': 'display:list-item;margin:.25em 0' }, inline(l.slice(2))));
			return;
		}
		list = null;
		if (/^#+ Novità$/.test(l))
			return; // è già il titolo della card
		if (/^#+ /.test(l))
			out.push(E('div', { 'class': 'rt-section-t' }, [ E('h3', {}, [ l.replace(/^#+ /, '') ]) ]));
		else if (l)
			out.push(E('p', {}, inline(l)));
	});

	return out;
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
		const go = E('button', { 'class': 'btn cbi-button cbi-button-apply', 'disabled': s.nas ? '' : null,
			'click': ui.createHandlerFn(this, () => this.confirm(s)) }, [ 'Aggiorna a OpenWrt ' + s.latest ]);

		copied.addEventListener('change', () => { go.disabled = !copied.checked; });

		return [
			rt.hero('Aggiornamenti del firmware', 'Per ogni nuova OpenWrt stabile GitHub costruisce l\'immagine del Brume con tutte le sue funzioni; da qui la installi mantenendo la configurazione.', [
				rt.pill('box', 'OpenWrt ' + s.current),
				s.available ? rt.pill('download', 'Disponibile ' + s.latest, true) : rt.pill('check', s.checked ? 'Aggiornato' : 'Non ancora controllato')
			]),
			rt.card('download', s.available ? 'warn' : s.checked ? 'ok' : 'info', 'Firmware',
				s.available ? rt.badge('warn', 'Nuova versione') : s.checked ? rt.badge('ok', 'Aggiornato') : rt.badge('off', 'Da controllare'), [
				rt.kv([
					[ 'Installato', 'OpenWrt ' + s.current ],
					[ 'Ultimo su GitHub', s.latest ? E('a', { 'href': s.url, 'target': '_blank', 'rel': 'noreferrer' }, [ 'OpenWrt ' + s.latest ]) : '—' ],
					[ 'Controllato', when(s.checked) ]
				]),
				err ? rt.note('err', [ 'Ultimo aggiornamento non riuscito: ' + err + '. Il firmware installato non è cambiato.' ]) : '',
				E('div', { 'class': 'rt-foot' }, [
					E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, () =>
						callCheck().then(check).then(r => this.update(r))) }, [ 'Controlla ora' ])
				])
			]),
			s.latest && s.notes ? rt.card('spark', 'info', (s.available ? 'Cosa porta OpenWrt ' : 'Novità di OpenWrt ') + s.latest, '', notes(s.notes)) : '',
			s.available ? rt.card('alert', 'warn', 'Aggiorna', '', [
				E('div', { 'class': 'rt-sub' }, [ 'Cosa succede quando premi il pulsante:' ]),
				steps(-1),
				rt.note('info', [ 'Restano configurazione, password, AdGuard Home, VPN WireGuard, NetBird e dischi USB. Si perdono i pacchetti installati a mano' + (s.nas ? ' e lo spazio interno (cartella «brume»).' : '.') ]),
				s.nas ? E('label', { 'style': 'display:flex;gap:.6em;align-items:center;margin:.8em 0;font-weight:600' }, [
					copied, 'Ho copiato altrove i file della cartella «brume» (verrà cancellata)'
				]) : '',
				E('div', { 'class': 'rt-foot' }, [ go ])
			]) : '',
			rt.help('GitHub Actions controlla ogni giorno se è uscita una nuova OpenWrt stabile e costruisce l\'immagine nel repository pubblico ' + s.repo + '. Il Brume guarda le release ogni 6 ore e lo segnala nella Panoramica.', 'Da dove arrivano gli aggiornamenti?')
		];
	},

	update: function(s) {
		dom.content(this.box, this.body(s));
	},

	confirm: function(s) {
		ui.showModal('Aggiornare a OpenWrt ' + s.latest + '?', [
			steps(-1),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'btn', 'click': ui.hideModal }, [ 'Annulla' ]), ' ',
				E('button', { 'class': 'btn cbi-button-apply important', 'click': ui.createHandlerFn(this, () =>
					callUpgrade().then(check).then(() => this.progress()).catch(e => {
						ui.hideModal();
						ui.addNotification(null, E('p', {}, [ 'Aggiornamento non partito: ' + e.message ]), 'error');
						window.scrollTo(0, 0);
					})) }, [ 'Aggiorna ora' ])
			])
		]);
	},

	// Avanzamento: lo script gira sul router; quando inizia la scrittura il
	// router non risponde più e LuCI aspetta che torni.
	progress: function() {
		const box = E('div', {}, [ steps(0) ]);
		let reconnecting = false;

		ui.showModal('Aggiornamento in corso', [ box ]);

		const reconnect = () => {
			if (reconnecting) return;
			reconnecting = true;
			dom.content(box, [ steps(2), E('p', { 'class': 'spinning' }, [ 'Aspetto che il Brume torni…' ]) ]);
			ui.awaitReconnect(window.location.host);
		};

		const tick = () => callStatus().then(s => {
			if (/^errore: /.test(s.state)) {
				ui.hideModal();
				this.update(s);
				window.scrollTo(0, 0);
				return;
			}
			if (s.state == 'installazione')
				return reconnect();
			dom.content(box, [ steps(Math.max(0, STEPS.findIndex(x => x[0] == s.state))) ]);
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
