'use strict';
'require view';
'require rpc';
'require ui';
'require poll';
'require dom';
'require routerino.common as rt';

// Archiviazione di rete (come Applicazioni › Network Storage della GUI GL.iNet):
// dischi USB montati da soli e condivisi in rete con Samba (utente "nas").

const callStatus = rpc.declare({ object: 'luci.glgw', method: 'st_status' });
const callPassword = rpc.declare({ object: 'luci.glgw', method: 'st_password', params: [ 'password' ] });
const callUmount = rpc.declare({ object: 'luci.glgw', method: 'st_umount', params: [ 'dev' ] });
const callService = rpc.declare({ object: 'luci.glgw', method: 'service_set', params: [ 'name', 'enabled' ] });
const callInternal = rpc.declare({ object: 'luci.glgw', method: 'st_internal_create', params: [ 'gb' ] });

function check(r) {
	if (r && r.error) throw new Error(r.error);
	return r;
}

return view.extend({
	load: function() {
		return callStatus();
	},

	disks: function(s) {
		return s.disks.length ? E('div', {}, s.disks.map(d => E('div', { 'class': 'rt-row', 'style': 'flex-wrap:wrap;gap:1em' }, [
			E('b', {}, [ (d.label || d.dev) + ' ' ]), E('span', { 'class': 'rt-mono' }, [ '/dev/' + d.dev + ' · ' + (d.type || '?') ]),
			d.mount ? rt.meter(d.mount, d.used, d.total, rt.bytes(d.used) + ' di ' + rt.bytes(d.total)) : rt.badge('warn', 'non montato'),
			d.mount ? E('button', { 'class': 'btn cbi-button', 'click': ui.createHandlerFn(this, () =>
				callUmount(d.dev).then(check).then(r => this.update(r))) }, [ 'Rimuovi in sicurezza' ]) : ''
		]))) : rt.empty('plug', 'Nessun disco: collega una chiavetta o un disco alla porta USB 3 (ext4, exFAT, NTFS o FAT), compare qui da solo.');
	},

	update: function(s) {
		dom.content(this.disksEl, this.disks(s));
		dom.content(this.internalEl, this.internal(s));
	},

	// Spazio sulla memoria interna (soluzione senza disco USB).
	internal: function(s) {
		const i = s.internal, host = window.location.hostname;

		if (i.exists && i.mounted)
			return E('div', {}, [
				rt.meter('/srv/nas', i.used, i.total, rt.bytes(i.used) + ' di ' + rt.bytes(i.total)),
				rt.kv([
					[ 'Da Windows', E('span', { 'class': 'rt-mono' }, [ '\\\\' + host + '\\' + i.share ]) ],
					[ 'Da Mac / Linux', E('span', { 'class': 'rt-mono' }, [ 'smb://' + host + '/' + i.share ]) ],
					[ 'Utente', E('b', { 'class': 'rt-mono' }, [ s.user ]) ]
				]),
				rt.note('warn', [ 'Un aggiornamento del firmware cancella questo spazio: prima di aggiornare copia altrove i file che ti servono.' ])
			]);

		if (i.exists)
			return rt.note('err', [ 'Lo spazio interno esiste ma non è montato: riavvia il router o controlla i registri.' ]);

		const maxGb = Math.max(0, Math.min(6, Math.floor((i.free - 1610612736) / 1073741824)));
		const size = E('select', { 'class': 'rt-input' }, Array.from({ length: maxGb }, (_, k) => k + 1).map(g =>
			E('option', { 'value': g, 'selected': g == Math.min(5, maxGb) ? '' : null }, [ g + ' GB' ])));

		return maxGb < 1 ? rt.note('warn', [ 'Spazio interno libero insufficiente.' ]) : E('div', {}, [
			E('div', { 'class': 'rt-sub' }, [ 'Una cartella sulla memoria interna del Brume, senza bisogno di dischi: comoda per documenti e foto. Velocità circa 10 MB/s; resta libero almeno 1,5 GB per il sistema.' ]),
			rt.field('Dimensione', size, 'Lo spazio si occupa solo man mano che lo riempi.'),
			E('div', { 'class': 'rt-foot' }, [
				E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, () =>
					callInternal(+size.value).then(check).then(r => {
						this.update(r);
						ui.addNotification(null, E('p', {}, [ 'Spazio interno creato: cartella «' + r.internal.share + '», utente «' + s.user + '».' ]), 'info');
					})) }, [ 'Crea lo spazio interno' ])
			]),
			rt.help('Un aggiornamento del firmware riscrive la memoria interna: lo spazio e i file vengono cancellati e va ricreato da qui. Per dati da tenere a lungo usa un disco USB.', 'Cosa succede con gli aggiornamenti?')
		]);
	},

	render: function(s) {
		const host = window.location.hostname;
		const pw = E('input', { 'class': 'rt-input rt-mono', 'type': 'password', 'autocomplete': 'new-password', 'minlength': '8', 'maxlength': '64' });
		const pw2 = E('input', { 'class': 'rt-input rt-mono', 'type': 'password', 'autocomplete': 'new-password', 'minlength': '8', 'maxlength': '64' });

		this.disksEl = E('div', {}, [ this.disks(s) ]);
		this.internalEl = E('div', {}, [ this.internal(s) ]);
		poll.add(() => callStatus().then(r => this.update(r)), 10);

		return rt.root([
			rt.hero('Archiviazione di rete', 'Un disco USB o uno spazio sulla memoria interna del Brume diventano cartelle condivise per tutta la casa e per chi entra in VPN.', [
				rt.pill('plug', s.disks.length + ' dischi'),
				rt.pill('home', s.samba.running ? 'Condivisione attiva' : 'Condivisione spenta', !s.samba.running)
			]),
			rt.card('box', 'info', 'Spazio interno (memoria del Brume)', '', [ this.internalEl ]),
			rt.card('plug', 'info', 'Dischi USB', '', [ this.disksEl ]),
			rt.card('home', s.user_ready ? 'ok' : 'warn', 'Cartella condivisa «' + s.share + '»', s.user_ready ? rt.badge('ok', 'Pronta') : rt.badge('warn', 'Imposta una password'), [
				E('div', { 'class': 'rt-row' }, [
					rt.toggle(s.samba.running, on => on ? 'Condivisione accesa' : 'Condivisione spenta', on =>
						callService('samba4', on).then(check))
				]),
				rt.kv([
					[ 'Da Windows', E('span', { 'class': 'rt-mono' }, [ '\\\\' + host + '\\' + s.share ]) ],
					[ 'Da Mac / Linux', E('span', { 'class': 'rt-mono' }, [ 'smb://' + host + '/' + s.share ]) ],
					[ 'Utente', E('b', { 'class': 'rt-mono' }, [ s.user ]) ]
				]),
				E('div', { 'class': 'rt-section-t' }, [ E('h3', {}, [ s.user_ready ? 'Cambia password' : 'Scegli la password' ]) ]),
				rt.field('Password', pw, 'Da 8 a 64 caratteri.'),
				rt.field('Ripeti la password', pw2),
				E('div', { 'class': 'rt-foot' }, [
					E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, () => {
						if (pw.value != pw2.value) throw new Error('Le due password non coincidono');
						return callPassword(pw.value).then(check).then(() => {
							pw.value = pw2.value = '';
							ui.addNotification(null, E('p', {}, [ 'Password salvata: accedi alla cartella con l\'utente «' + s.user + '».' ]), 'info');
						});
					}) }, [ 'Salva la password' ])
				]),
				rt.help('Per il backup automatico delle foto dal telefono usa un\'app che scrive su una cartella SMB (es. PhotoSync) puntando a questa condivisione.', 'Backup delle foto')
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
