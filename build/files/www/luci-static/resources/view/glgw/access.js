'use strict';
'require view';
'require rpc';
'require ui';
'require dom';
'require routerino.common as rt';

// Password e accessi (come Sistema › Admin password della GUI GL.iNet, esteso):
// router (pannello e SSH), pannello AdGuard Home, cartella condivisa (nas), più
// i rimandi a chiavi SSH, VPN e NetBird. La password di AdGuard Home viene
// trasformata in hash bcrypt qui nel browser: al router arriva solo l'hash.

const callStatus = rpc.declare({ object: 'luci.glgw', method: 'acc_status' });
const callSetPassword = rpc.declare({ object: 'luci', method: 'setPassword', params: [ 'username', 'password' ] });
const callRootClear = rpc.declare({ object: 'luci.glgw', method: 'root_clear' });
const callAghLogin = rpc.declare({ object: 'luci.glgw', method: 'agh_login', params: [ 'username', 'hash' ] });
const callNasPassword = rpc.declare({ object: 'luci.glgw', method: 'st_password', params: [ 'password' ] });

function check(r) {
	if (r && r.error) throw new Error(r.error);
	return r;
}

function loadBcrypt() {
	const ready = () => window.dcodeIO && window.dcodeIO.bcrypt;

	if (ready()) return Promise.resolve(ready());

	return new Promise((resolve, reject) => {
		const s = E('script', { 'src': L.resource('glgw/bcrypt.min.js') });

		s.onload = () => ready() ? resolve(ready()) : reject(new Error('Libreria bcrypt non caricata'));
		s.onerror = () => reject(new Error('Libreria bcrypt non trovata sul router'));
		document.head.appendChild(s);
	});
}

function bcryptHash(pw) {
	return loadBcrypt().then(b => new Promise((resolve, reject) =>
		b.hash(pw, 10, (err, hash) => err ? reject(err) : resolve(hash))));
}

// Campo password con "mostra/nascondi", comodo sul telefono.
function pwInput(placeholder) {
	const input = E('input', { 'class': 'rt-input rt-mono', 'type': 'password', 'autocomplete': 'new-password', 'maxlength': '64', 'placeholder': placeholder || '' });
	const eye = E('button', { 'class': 'btn cbi-button', 'type': 'button', 'aria-label': 'Mostra la password' }, [ 'Mostra' ]);

	eye.addEventListener('click', () => {
		const show = input.type == 'password';

		input.type = show ? 'text' : 'password';
		eye.textContent = show ? 'Nascondi' : 'Mostra';
	});

	return { input: input, el: E('div', { 'class': 'rt-row rt-pw' }, [ input, eye ]) };
}

// Due campi (password + conferma) e controllo comune.
function pwPair() {
	const a = pwInput('almeno 8 caratteri'), b = pwInput('ripeti');

	return {
		fields: [ rt.field('Nuova password', a.el), rt.field('Ripeti la password', b.el) ],
		value: function() {
			const v = a.input.value;

			if (v.length < 8) throw new Error('La password deve avere almeno 8 caratteri');
			if (v.length > 64) throw new Error('La password può avere al massimo 64 caratteri');
			if (v != b.input.value) throw new Error('Le due password non coincidono');

			return v;
		},
		clear: function() { a.input.value = b.input.value = ''; }
	};
}

function done(text) {
	ui.addNotification(null, E('p', {}, [ text ]), 'info');
}

return view.extend({
	load: function() {
		return callStatus();
	},

	refresh: function(s) {
		dom.content(this.box, this.body(s));
	},

	body: function(s) {
		const root = pwPair(), agh = pwPair(), nas = pwPair();
		const aghUser = E('input', { 'class': 'rt-input rt-mono', 'value': s.adguard.users[0] || 'admin', 'maxlength': '32', 'autocomplete': 'username' });
		const host = window.location.hostname;
		const open = [ !s.root.set, !s.adguard.login, !s.nas.ready ].filter(x => x).length;

		return [
			rt.hero('Password e accessi', 'Chi può entrare nel Brume e nei suoi servizi.', [
				rt.pill('lock', s.root.set ? 'Router protetto' : 'Router senza password', !s.root.set),
				rt.pill('shield', s.adguard.login ? 'AdGuard protetto' : 'AdGuard senza login', !s.adguard.login),
				rt.pill('home', s.nas.ready ? 'Cartella condivisa protetta' : 'Cartella condivisa da configurare', !s.nas.ready)
			], [ 3 - open, 3 ]),

			rt.card('lock', s.root.set ? 'ok' : 'err', 'Router: pannello e SSH', rt.badge(s.root.set ? 'ok' : 'err', s.root.set ? 'Password impostata' : 'Nessuna password'), [
				E('div', { 'class': 'rt-sub' }, [ 'Utente ', E('b', { 'class': 'rt-mono' }, [ 'root' ]), '. È la password per questa interfaccia e per SSH.' ]),
				s.root.set ? '' : rt.note('err', [ 'Senza password chiunque sia sulla rete di casa può cambiare tutto il router.' ]),
				...root.fields,
				E('div', { 'class': 'rt-foot' }, [
					E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, () => {
						const pw = root.value();

						return callSetPassword('root', pw).then(r => {
							if (!r || r.result === false) throw new Error('Il router non ha accettato la password');
							root.clear();
							done('Password del router salvata: serve per entrare qui e in SSH.');
							return callStatus().then(st => this.refresh(st));
						});
					}) }, [ s.root.set ? 'Cambia password' : 'Imposta password' ]),
					s.root.set ? E('button', { 'class': 'btn cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, () => {
						if (!confirm('Togliere la password del router? Chiunque sia sulla rete di casa potrà entrare.')) return;
						return callRootClear().then(check).then(st => { done('Password del router rimossa.'); this.refresh(st); });
					}) }, [ 'Togli la password' ]) : ''
				]),
				E('a', { 'class': 'btn cbi-button', 'href': L.url('admin/system/admin/sshkeys') }, [ 'Chiavi SSH (' + s.ssh_keys + ')' ]),
				rt.help('Con una chiave SSH un computer entra in SSH senza scrivere la password: più comodo e più sicuro. Aggiungere una password non blocca le chiavi già inserite.', 'Chiavi SSH')
			]),

			rt.card('shield', s.adguard.login ? 'ok' : 'warn', 'Pannello AdGuard Home', rt.badge(s.adguard.login ? 'ok' : 'warn', s.adguard.login ? 'Login attivo (' + s.adguard.users.join(', ') + ')' : 'Senza login'), [
				E('div', { 'class': 'rt-sub' }, [ 'Il pannello su ', E('a', { 'href': 'http://' + host + ':3000/', 'target': '_blank', 'rel': 'noopener' }, [ host + ':3000' ]), ' con statistiche, liste e regole di blocco.' ]),
				s.adguard.login ? '' : rt.note('warn', [ 'Senza login chiunque in casa può spegnere il blocco o cambiare le liste.' ]),
				rt.field('Nome utente', aghUser),
				...agh.fields,
				E('div', { 'class': 'rt-foot' }, [
					E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, () => {
						const pw = agh.value(), user = aghUser.value.trim();

						if (!/^[A-Za-z0-9_.-]{1,32}$/.test(user)) throw new Error('Nome utente non valido: lettere, numeri, . - _');

						return bcryptHash(pw).then(hash => callAghLogin(user, hash)).then(check).then(st => {
							agh.clear();
							done('Login di AdGuard Home attivo: utente «' + user + '».');
							this.refresh(st);
						});
					}) }, [ s.adguard.login ? 'Cambia password' : 'Attiva il login' ]),
					s.adguard.login ? E('button', { 'class': 'btn cbi-button cbi-button-negative', 'click': ui.createHandlerFn(this, () => {
						if (!confirm('Togliere il login di AdGuard Home? Chiunque in casa potrà aprire il pannello.')) return;
						return callAghLogin('', '').then(check).then(st => { done('Login di AdGuard Home disattivato.'); this.refresh(st); });
					}) }, [ 'Togli il login' ]) : ''
				]),
				rt.help('La password viene trasformata in un hash bcrypt qui nel browser: al router arriva solo l\'hash. AdGuard Home si riavvia per qualche secondo; il blocco delle pubblicità riprende da solo. La configurazione precedente resta salvata in adguardhome.yaml.bak-gui.', 'Come viene salvata?')
			]),

			rt.card('home', s.nas.ready ? 'ok' : 'warn', 'Cartella condivisa (disco USB)', rt.badge(s.nas.ready ? 'ok' : 'warn', s.nas.ready ? 'Password impostata' : 'Da impostare'), [
				E('div', { 'class': 'rt-sub' }, [ 'Utente ', E('b', { 'class': 'rt-mono' }, [ 'nas' ]), ' per ', E('span', { 'class': 'rt-mono' }, [ '\\\\' + host + '\\usb' ]), '.' ]),
				...nas.fields,
				E('div', { 'class': 'rt-foot' }, [
					E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, () => {
						const pw = nas.value();

						return callNasPassword(pw).then(check).then(() => {
							nas.clear();
							done('Password della cartella condivisa salvata.');
							return callStatus().then(st => this.refresh(st));
						});
					}) }, [ s.nas.ready ? 'Cambia password' : 'Imposta password' ])
				])
			]),

			rt.card('radar', 'info', 'Altri accessi', '', [
				rt.kv([
					[ 'VPN WireGuard', E('a', { 'href': L.url('admin/glgw/wireguard') }, [ 'Chiavi dei client' ]) ],
					[ 'NetBird', E('a', { 'href': L.url('admin/glgw/netbird') }, [ 'Account NetBird' ]) ],
					[ 'Chiavi SSH', E('a', { 'href': L.url('admin/system/admin/sshkeys') }, [ s.ssh_keys + ' chiavi' ]) ]
				]),
				rt.help('WireGuard e NetBird non usano password: si entra con chiavi generate per ogni dispositivo, che si revocano eliminandolo dall\'elenco.')
			])
		];
	},

	render: function(s) {
		this.box = rt.root(this.body(s));

		return this.box;
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
