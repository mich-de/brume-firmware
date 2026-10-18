'use strict';
'require baseclass';
'require ui';

// Navigazione del tema routerino: tutte le pagine di LuCI raggruppate per
// argomento, con un nome e una frase comprensibili. Si parte dall'albero dei
// menu che LuCI calcola per l'utente (permessi e pacchetti installati): una
// pagina mappata qui ma non installata non compare; una pagina installata ma
// non mappata finisce in "Altro", così nessuna funzione resta nascosta.

const CATEGORIES = [
	{ id: 'start', title: 'Panoramica', icon: 'home', items: [
		[ 'glgw/overview', 'Stato del Brume', 'Internet, DNS, VPN, hardware e servizi in una pagina', 'dashboard riepilogo stato panoramica home' ],
		[ 'glgw/clients', 'Dispositivi', 'Chi è collegato al Brume', 'client dispositivi collegati lease dhcp' ]
	] },
	{ id: 'net', title: 'Internet e rete', icon: 'globe', items: [
		[ 'network/network', 'Connessioni', 'Internet (WAN), rete di casa (LAN) e altre interfacce', 'interfacce wan lan ip indirizzo pppoe dhcp client ipv6' ],
		[ 'glgw/network', 'Accelerazione e SQM', 'Motore hardware di rete oppure code anti-lag', 'offload accelerazione hardware ppe nat sqm cake lag latenza qos' ],
		[ 'network/sqm', 'SQM avanzato', 'Tutte le opzioni delle code anti-lag', 'sqm qos cake avanzato' ],
		[ 'network/dhcp', 'Indirizzi ai dispositivi', 'DHCP: indirizzi automatici e indirizzi fissi per dispositivo', 'dhcp lease statico riservato' ],
		[ 'network/routes', 'Percorsi', 'Rotte statiche e regole di instradamento', 'route rotte instradamento gateway' ],
		[ 'network/switch', 'Porte di rete', 'Porte del router e VLAN', 'switch vlan porte ethernet' ],
		[ 'network/diagnostics', 'Diagnostica', 'Ping, traceroute e nslookup dal router', 'ping traceroute nslookup test rete' ]
	] },
	{ id: 'wifi', title: 'Wi-Fi', icon: 'wifi', items: [
		[ 'network/wireless', 'Reti Wi-Fi', 'Accendi il Wi-Fi, nome della rete, password, canale', 'wireless ssid password wpa canale' ],
		[ 'status/channel_analysis', 'Canali occupati', 'Quali canali usano le reti vicine', 'canali interferenze analisi' ]
	] },
	{ id: 'safe', title: 'Protezione', icon: 'shield', items: [
		[ 'glgw/dns', 'DNS e blocco pubblicità', 'AdGuard Home e Unbound: il Pi-hole della casa', 'pihole pi-hole adguard adblock pubblicità dns unbound ricorsivo dnssec' ],
		[ 'services/unbound', 'Unbound avanzato', 'Tutte le opzioni del resolver ricorsivo', 'unbound dns dnssec avanzato' ],
		[ 'network/dns', 'dnsmasq (avanzato)', 'Uso interno: nomi .lan dei dispositivi collegati al Brume (porta 54, dietro AdGuard)', 'dnsmasq dns lan host locali avanzato' ],
		[ 'services/banip', 'Blocco IP malevoli', 'banIP: attaccanti noti bloccati in ingresso', 'banip blocco ip malevoli botnet scanner firewall' ],
		[ 'network/firewall', 'Firewall', 'Zone, porte aperte verso l\'esterno, regole del traffico', 'firewall porte nat regole zone sicurezza' ]
	] },
	{ id: 'vpn', title: 'VPN', icon: 'home2', items: [
		[ 'glgw/wireguard', 'Server WireGuard', 'Entra in casa da fuori: client e QR', 'vpn wireguard server client qr telefono' ],
		[ 'glgw/netbird', 'NetBird', 'Rete privata tra tutti i tuoi dispositivi', 'netbird mesh vpn peer' ],
		[ 'status/wireguard', 'Stato WireGuard', 'Collegamenti WireGuard attivi e traffico', 'wireguard peer handshake' ]
	] },
	{ id: 'apps', title: 'Applicazioni', icon: 'box', items: [
		[ 'glgw/storage', 'Archiviazione di rete', 'Disco USB condiviso in casa e in VPN', 'nas usb disco samba condivisione smb foto backup' ],
		[ 'services/samba4', 'Condivisione avanzata', 'Tutte le opzioni di Samba', 'samba smb avanzato' ]
	] },
	{ id: 'mon', title: 'Controllo', icon: 'pulse', items: [
		[ 'status/overview', 'Riepilogo di sistema', 'Router, memoria, rete e dispositivi collegati', 'status stato overview dispositivi collegati lease' ],
		[ 'status/realtime', 'Grafici in tempo reale', 'Traffico, carico e connessioni minuto per minuto', 'grafici banda traffico carico' ],
		[ 'statistics/graphs', 'Grafici storici', 'CPU, memoria, temperatura e traffico nel tempo', 'statistiche collectd storico temperatura' ],
		[ 'status/logs', 'Registri', 'Messaggi del sistema e del kernel', 'log registro syslog dmesg errori' ],
		[ 'status/processes', 'Programmi in esecuzione', 'Processi attivi, con la possibilità di fermarli', 'processi kill top' ],
		[ [ 'status/routes', 'status/routesj' ], 'Tabelle di instradamento', 'Rotte e vicini di rete attuali', 'routing arp vicini' ],
		[ [ 'status/nftables', 'status/iptables' ], 'Regole firewall attive', 'Le regole che il firewall sta applicando ora', 'nftables iptables regole attive' ]
	] },
	{ id: 'sys', title: 'Sistema', icon: 'gear', items: [
		[ 'glgw/access', 'Password e accessi', 'Router, AdGuard Home, cartella condivisa e chiavi SSH', 'password accesso login adguard nas samba ssh chiavi sicurezza root' ],
		[ 'glgw/update', 'Aggiornamenti del firmware', 'Nuove versioni di OpenWrt per il Brume, con un clic', 'aggiornamento firmware openwrt versione sysupgrade github upgrade' ],
		[ 'system/system', 'Nome, ora e lingua', 'Nome del router, fuso orario, server NTP, lingua e tema', 'sistema hostname ora ntp lingua tema aspetto' ],
		[ 'system/admin', 'Password e accesso', 'Password del router, SSH, chiavi, accesso web', 'password ssh chiavi accesso amministrazione' ],
		[ 'system/flash', 'Backup e firmware', 'Salva o ripristina la configurazione, aggiorna il firmware', 'backup ripristino firmware aggiornamento sysupgrade reset' ],
		[ 'system/package-manager', 'Software', 'Installa o rimuovi pacchetti', 'pacchetti apk opkg installa software' ],
		[ 'system/startup', 'Servizi all\'avvio', 'Avvia, ferma o disattiva i servizi; comandi all\'avvio', 'servizi init avvio rc.local' ],
		[ 'system/crontab', 'Attività pianificate', 'Comandi da eseguire a orari fissi', 'cron pianificazione' ],
		[ 'services/watchcat', 'Controllo connessione', 'Watchcat: riavvia la WAN se internet non risponde', 'watchcat ping riavvio connessione internet' ],
		[ 'system/mounts', 'Dischi e USB', 'Chiavette e dischi collegati', 'mount usb disco swap' ],
		[ 'system/leds', 'Luci (LED)', 'Cosa indicano le luci del router', 'led luci' ],
		[ 'system/reboot', 'Riavvia', 'Riavvia il router', 'reboot riavvio' ]
	] }
];

// Barra in basso sul telefono: [ percorso, etichetta, icona ].
const BOTTOM = [
	[ 'glgw/overview', 'Stato', 'home' ],
	[ 'glgw/wireguard', 'VPN', 'lock' ],
	[ 'glgw/dns', 'DNS', 'shield' ],
	[ 'glgw/storage', 'NAS', 'box' ],
	[ 'glgw/access', 'Accessi', 'key' ]
];

// Parole con cui si cerca una scheda interna (oltre al suo nome).
const SUBKEYS = {
	'network/firewall/forwards': 'apri porta port forward inoltro porte server gioco',
	'network/firewall/rules': 'regole traffico blocca consenti',
	'network/firewall/zones': 'zone impostazioni generali',
	'network/firewall/snats': 'nat masquerade',
	'system/admin/password': 'password cambia password amministratore',
	'system/admin/dropbear': 'ssh accesso remoto',
	'system/admin/sshkeys': 'chiavi ssh',
	'system/admin/uhttpd': 'https web certificato',
	'status/logs/syslog': 'log sistema errori',
	'status/logs/dmesg': 'kernel',
	'status/realtime/bandwidth': 'banda traffico velocità',
	'status/realtime/connections': 'connessioni attive'
};

const ICONS = {
	home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
	home2: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
	globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
	wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.8 16a5 5 0 0 1 6.4 0"/><path d="M12 19.5h.01"/>',
	shield: '<path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/>',
	pulse: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
	gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
	box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
	lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
	key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
	more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
	chev: '<path d="M9 6l6 6-6 6"/>',
	moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
	sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
	auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
	out: '<path d="M15 4h4v16h-4"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h10"/>',
	search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
};

const THEMES = [ [ 'auto', 'Tema automatico' ], [ 'light', 'Tema chiaro' ], [ 'dark', 'Tema scuro' ] ];

function icon(name) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('aria-hidden', 'true');
	svg.innerHTML = ICONS[name] || '';

	return svg;
}

function store(key, value) {
	try {
		if (value === undefined) return localStorage.getItem(key);
		localStorage.setItem(key, value);
	} catch (e) {}

	return null;
}

function fold(s) {
	return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

return baseclass.extend({
	__init__: function() {
		ui.menu.load().then(tree => this.render(tree));
	},

	// Nodo dell'albero per "admin/<a>/<b>", solo se l'utente lo può usare.
	lookup: function(tree, path) {
		let node = tree;

		for (const part of ('admin/' + path).split('/')) {
			node = node && node.children && node.children[part];
			if (!node || !node.satisfied) return null;
		}

		return node;
	},

	render: function(tree) {
		const admin = tree.children && tree.children.admin;

		if (!admin) return;

		const used = {}, cats = [];

		// Pagine curate, nell'ordine delle categorie.
		CATEGORIES.forEach(c => {
			const items = [];

			c.items.forEach(it => {
				const path = [].concat(it[0]).filter(p => this.lookup(tree, p))[0];

				if (!path || used[path]) return;

				used[path] = true;
				items.push({ path: path, title: it[1], desc: it[2], keys: it[3], node: this.lookup(tree, path) });
			});

			if (items.length) cats.push({ id: c.id, title: c.title, icon: c.icon, items: items });
		});

		// Tutto il resto che LuCI espone (app installate in futuro comprese).
		const rest = [];

		ui.menu.getChildren(admin).forEach(sec => {
			if (sec.name == 'logout') return;

			ui.menu.getChildren(sec).forEach(page => {
				const path = sec.name + '/' + page.name;

				if (!used[path] && !(sec.name == 'routerino'))
					rest.push({ path: path, title: _(page.title), desc: _(sec.title), keys: '', node: page });
			});
		});

		if (rest.length) cats.push({ id: 'more', title: 'Altro', icon: 'more', items: rest });

		this.cats = cats;
		this.active = this.findActive(cats);
		this.renderNav(cats);
		this.renderFoot(admin);
		this.renderBottomNav(tree);
		this.renderCrumbAndTabs(tree);
		this.bindShell();
	},

	findActive: function(cats) {
		const cur = L.env.dispatchpath.slice(1).join('/');
		let best = null;

		cats.forEach(c => c.items.forEach(it => {
			if ((cur == it.path || cur.indexOf(it.path + '/') == 0) && (!best || it.path.length > best.item.path.length))
				best = { cat: c, item: it };
		}));

		return best;
	},

	renderNav: function(cats) {
		const nav = document.getElementById('rt-nav');
		const closed = JSON.parse(store('rt-nav-closed') || '{}');

		cats.forEach(c => {
			const isActive = this.active && this.active.cat == c;
			const open = isActive || !closed[c.id];
			const list = E('ul', { 'id': 'rt-cat-' + c.id, 'hidden': open ? null : '' }, c.items.map(it => {
				const on = this.active && this.active.item == it;

				return E('li', {}, [
					E('a', { 'href': L.url('admin', it.path), 'class': on ? 'rt-on' : null, 'aria-current': on ? 'page' : null, 'title': it.desc }, [ it.title ])
				]);
			}));
			const head = E('button', { 'type': 'button', 'class': 'rt-cat' + (isActive ? ' rt-cat-on' : ''),
				'aria-expanded': open ? 'true' : 'false', 'aria-controls': 'rt-cat-' + c.id }, [
				icon(c.icon), E('span', {}, [ c.title ]), E('i', { 'class': 'rt-chev' }, [ icon('chev') ])
			]);

			head.addEventListener('click', () => {
				const show = list.hidden;

				list.hidden = !show;
				head.setAttribute('aria-expanded', show ? 'true' : 'false');
				closed[c.id] = !show;
				store('rt-nav-closed', JSON.stringify(closed));
			});

			nav.appendChild(E('div', { 'class': 'rt-group' }, [ head, list ]));
		});
	},

	renderFoot: function(admin) {
		const foot = document.getElementById('rt-side-foot');
		const pref = store('rt-theme') || 'auto';
		const idx = Math.max(0, THEMES.findIndex(t => t[0] == pref));
		const btn = E('button', { 'type': 'button', 'class': 'rt-foot-btn' }, [ icon(THEMES[idx][0]), E('span', {}, [ THEMES[idx][1] ]) ]);

		btn.addEventListener('click', () => {
			const next = THEMES[(THEMES.findIndex(t => t[0] == (store('rt-theme') || 'auto')) + 1) % THEMES.length];
			const dark = next[0] == 'dark' || (next[0] == 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

			store('rt-theme', next[0]);
			document.documentElement.setAttribute('data-darkmode', dark);
			document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
			btn.replaceChildren(icon(next[0]), E('span', {}, [ next[1] ]));
		});

		foot.appendChild(btn);

		if (admin.children.logout)
			foot.appendChild(E('a', { 'class': 'rt-foot-btn', 'href': L.url('admin/logout') }, [ icon('out'), E('span', {}, [ 'Esci' ]) ]));
	},

	// Barra in basso per il telefono (visibile solo su schermi stretti, vedi
	// routerino.css): le pagine Brume più usate a portata di pollice.
	renderBottomNav: function(tree) {
		const items = BOTTOM.filter(b => this.lookup(tree, b[0]));

		if (items.length < 2) return;

		const cur = L.env.dispatchpath.slice(1).join('/');
		const nav = E('nav', { 'class': 'rt-bottomnav', 'aria-label': 'Pagine principali', 'style': '--n:' + items.length }, items.map(b => {
			const on = cur == b[0] || cur.indexOf(b[0] + '/') == 0;

			return E('a', { 'href': L.url('admin', b[0]), 'aria-current': on ? 'page' : null }, [ icon(b[2]), E('span', {}, [ b[1] ]) ]);
		}));

		document.body.appendChild(nav);
		document.body.classList.add('rt-has-bottomnav');
	},

	// Percorso "Categoria › Pagina" e, per le pagine con sotto-pagine, le schede.
	renderCrumbAndTabs: function(tree) {
		const crumb = document.getElementById('rt-crumb');
		const a = this.active;

		if (a) {
			crumb.appendChild(E('span', {}, [ a.cat.title ]));
			crumb.appendChild(E('b', {}, [ a.item.title ]));
			if (a.cat.id != 'more' && a.item.desc)
				crumb.appendChild(E('small', {}, [ a.item.desc ]));
		}

		const dp = L.env.dispatchpath;

		if (dp.length < 3) return;

		let node = tree, url = '';

		for (let i = 0; i < 3 && node; i++) {
			node = node.children && node.children[dp[i]];
			url += (url ? '/' : '') + dp[i];
		}

		if (node) this.renderTabs(node, url, 0);
	},

	renderTabs: function(node, url, level) {
		const container = document.getElementById('tabmenu');
		const children = ui.menu.getChildren(node);
		const ul = E('ul', { 'class': 'tabs' });
		let activeNode = null;

		children.forEach(child => {
			const on = L.env.dispatchpath[3 + level] == child.name;

			ul.appendChild(E('li', { 'class': 'tabmenu-item-' + child.name + (on ? ' active' : '') }, [
				E('a', { 'href': L.url(url, child.name) }, [ _(child.title) ])
			]));
			if (on) activeNode = child;
		});

		if (!ul.children.length) return;

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode) this.renderTabs(activeNode, url + '/' + activeNode.name, level + 1);
	},

	bindShell: function() {
		const body = document.body, burger = document.getElementById('rt-burger');
		const setOpen = on => { body.classList.toggle('rt-menu-open', on); burger.setAttribute('aria-expanded', on ? 'true' : 'false'); };

		burger.addEventListener('click', () => setOpen(!body.classList.contains('rt-menu-open')));
		document.getElementById('rt-scrim').addEventListener('click', () => setOpen(false));
		document.getElementById('rt-search-btn').addEventListener('click', () => this.openSearch());
		document.addEventListener('keydown', ev => {
			const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);

			if ((ev.key == 'k' && (ev.ctrlKey || ev.metaKey)) || (ev.key == '/' && !typing)) {
				ev.preventDefault();
				this.openSearch();
			}
			else if (ev.key == 'Escape') setOpen(false);
		});
	},

	// Ricerca di tutte le funzioni: pagine, schede interne e parole chiave.
	index: function() {
		if (this.entries) return this.entries;

		const entries = [];

		// own = testo proprio della voce; text = anche quello della pagina che la contiene.
		this.cats.forEach(c => c.items.forEach(it => {
			const own = fold([ it.title, it.desc, it.keys, _(it.node.title || '') ].join(' '));

			entries.push({ cat: c.title, title: it.title, desc: it.desc, url: L.url('admin', it.path), own: own, text: own + ' ' + fold(c.title) });
			ui.menu.getChildren(it.node).forEach(sub => {
				const subOwn = fold([ _(sub.title), sub.title, SUBKEYS[it.path + '/' + sub.name] || '' ].join(' '));

				entries.push({ cat: c.title, title: it.title + ' › ' + _(sub.title), desc: it.desc, url: L.url('admin', it.path, sub.name),
					own: subOwn, text: subOwn + ' ' + own });
			});
		}));

		return (this.entries = entries);
	},

	openSearch: function() {
		const input = E('input', { 'type': 'search', 'class': 'rt-q', 'placeholder': 'Cosa vuoi fare? Es. "password wifi", "apri porta", "backup"', 'aria-label': 'Cerca una funzione' });
		const list = E('ul', { 'class': 'rt-results', 'role': 'listbox' });
		let sel = 0, hits = [];

		const paint = () => {
			const words = fold(input.value).split(/\s+/).filter(Boolean);

			const score = e => words.every(w => e.own.indexOf(w) >= 0) ? 2 : words.every(w => e.text.indexOf(w) >= 0) ? 1 : 0;

			hits = this.index().map(e => [ score(e), e ]).filter(x => x[0]).sort((a, b) => b[0] - a[0]).map(x => x[1]).slice(0, 12);
			sel = Math.min(sel, Math.max(0, hits.length - 1));
			list.replaceChildren(...(hits.length ? hits.map((e, i) => E('li', { 'role': 'option', 'aria-selected': i == sel ? 'true' : 'false' }, [
				E('a', { 'href': e.url }, [ E('b', {}, [ e.title ]), E('small', {}, [ e.cat + ' · ' + e.desc ]) ])
			])) : [ E('li', { 'class': 'rt-none' }, [ 'Nessuna funzione trovata.' ]) ]));
		};

		input.addEventListener('input', () => { sel = 0; paint(); });
		input.addEventListener('keydown', ev => {
			if (ev.key == 'ArrowDown') { sel = Math.min(sel + 1, hits.length - 1); paint(); ev.preventDefault(); }
			else if (ev.key == 'ArrowUp') { sel = Math.max(sel - 1, 0); paint(); ev.preventDefault(); }
			else if (ev.key == 'Enter' && hits[sel]) window.location.href = hits[sel].url;
		});

		ui.showModal('Cerca una funzione', [
			E('div', { 'class': 'rt-search' }, [ input, list ]),
			E('div', { 'class': 'right' }, [ E('button', { 'class': 'btn cbi-button', 'click': ui.hideModal }, [ 'Chiudi' ]) ])
		], 'rt-search-modal');
		paint();
		input.focus();
	}
});
