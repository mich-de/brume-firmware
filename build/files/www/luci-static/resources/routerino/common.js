'use strict';
'require baseclass';
'require ui';

// Stile e componenti condivisi della GUI routerino. I colori vengono dalle
// variabili del tema LuCI, così la GUI segue il tema chiaro/scuro. I valori
// scelti dai dispositivi (hostname, domini) vanno passati a E() dentro un array:
// E() con una stringa sola la interpreta come HTML, in un array è testo.

const CSS = `
.rt{--rt-ok:var(--success-color-high,#15803d);--rt-warn:var(--warn-color-high,#b45309);--rt-err:var(--error-color-high,#b91c1c);
--rt-info:var(--primary-color-high,#2563eb);--rt-off:var(--text-color-medium,#6b7280);--rt-card:var(--background-color-high,#fff);
--rt-line:var(--border-color-medium,#e5e7eb);--rt-text:var(--text-color-highest,#111827);--rt-muted:var(--text-color-medium,#6b7280);
--rt-soft:color-mix(in srgb,var(--rt-text) 4%,var(--rt-card));--rt-r:16px;
--rt-shadow:0 1px 2px rgba(0,0,0,.05),0 10px 26px -18px rgba(0,0,0,.28);--rt-shadow-h:0 2px 4px rgba(0,0,0,.06),0 16px 34px -18px rgba(0,0,0,.36);
display:grid;gap:18px;margin-bottom:28px;color:var(--rt-text);line-height:1.45}
.rt *{box-sizing:border-box}
.rt>*{animation:rt-in .35s ease both}.rt>*:nth-child(2){animation-delay:.04s}.rt>*:nth-child(3){animation-delay:.08s}.rt>*:nth-child(n+4){animation-delay:.12s}
@keyframes rt-in{from{opacity:0;transform:translateY(6px)}}
.rt h2,.rt h3,.rt h4{border:0;padding:0;color:inherit;letter-spacing:-.01em}
.rt-hero{position:relative;overflow:hidden;display:flex;flex-wrap:wrap;align-items:center;gap:18px 26px;padding:24px 26px;border-radius:20px;color:#fff;
background:radial-gradient(120% 140% at 100% 0%,rgba(255,255,255,.18),transparent 55%),
linear-gradient(135deg,color-mix(in srgb,var(--rt-info) 86%,#000),color-mix(in srgb,var(--rt-info) 48%,#0f766e));
box-shadow:0 18px 36px -24px color-mix(in srgb,var(--rt-info) 90%,transparent)}
.rt-hero-t{flex:1 1 280px;min-width:0}
.rt-hero h2{margin:0;font-size:1.7rem;line-height:1.2}
.rt-hero p{margin:6px 0 0;opacity:.9;font-size:.95rem}
.rt-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.rt-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.16);font-weight:600;font-size:.82rem;white-space:nowrap}
.rt-pill.rt-bad{background:color-mix(in srgb,var(--rt-err) 82%,#000)}
.rt-ring{--p:0;flex:none;width:96px;height:96px;border-radius:50%;display:grid;place-items:center;
background:conic-gradient(#fff calc(var(--p) * 1%),rgba(255,255,255,.22) 0)}
.rt-ring b{width:76px;height:76px;border-radius:50%;display:grid;place-items:center;align-content:center;font-size:1.45rem;line-height:1;
background:color-mix(in srgb,var(--rt-info) 72%,#000)}
.rt-ring small{display:block;font-size:.68rem;font-weight:500;opacity:.85;margin-top:3px}
.rt-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}
.rt-card{background:var(--rt-card);border:1px solid var(--rt-line);border-radius:var(--rt-r);padding:18px;display:flex;flex-direction:column;gap:12px;min-width:0;
box-shadow:var(--rt-shadow);transition:box-shadow .2s}
.rt-card:hover{box-shadow:var(--rt-shadow-h)}
.rt-card-h{display:flex;align-items:center;gap:12px}
.rt-card-t{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;min-width:0;flex:1}
.rt-card-h h3{margin:0;font-size:1rem;line-height:1.3}
.rt-wide{grid-column:1/-1}
.rt-meters{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 24px}
.rt-bubble{flex:none;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:var(--rt-ink);
background:linear-gradient(135deg,color-mix(in srgb,var(--rt-tone) 20%,transparent),color-mix(in srgb,var(--rt-tone) 8%,transparent))}
.rt-ico{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
.rt-big{font-size:1.75rem;font-weight:700;line-height:1.1}
.rt-big small{font-size:.85rem;font-weight:500;color:var(--rt-muted);margin-left:6px}
.rt-sub{color:var(--rt-muted);font-size:.87rem}
.rt-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:.76rem;font-weight:650;white-space:nowrap;
color:var(--rt-ink);background:color-mix(in srgb,var(--rt-tone) 14%,transparent)}
.rt-badge::before{content:'';width:7px;height:7px;border-radius:50%;background:currentColor}
.rt-ok{--rt-tone:var(--rt-ok)}.rt-warn{--rt-tone:var(--rt-warn)}.rt-err{--rt-tone:var(--rt-err)}.rt-info{--rt-tone:var(--rt-info)}.rt-off{--rt-tone:var(--rt-off)}
.rt-ok,.rt-warn,.rt-err,.rt-info,.rt-off{--rt-ink:color-mix(in srgb,var(--rt-tone) 72%,var(--rt-text))}
.rt-chips{display:flex;flex-wrap:wrap;gap:6px}
.rt-chip{padding:3px 9px;border-radius:8px;font-size:.8rem;background:color-mix(in srgb,var(--rt-text) 7%,transparent);font-family:var(--font-mono,monospace)}
.rt-foot{margin-top:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.rt-meter{display:grid;gap:5px}
.rt-meter-l{display:flex;justify-content:space-between;gap:8px;font-size:.84rem;color:var(--rt-muted)}
.rt-meter-l b{color:var(--rt-text);font-weight:600}
.rt-bar{height:8px;border-radius:99px;background:color-mix(in srgb,var(--rt-text) 9%,transparent);overflow:hidden}
.rt-bar>i{display:block;height:100%;border-radius:inherit;background:var(--rt-tone,var(--rt-info));transition:width .4s}
.rt-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;font-size:.87rem;margin:0}
.rt-kv dt{color:var(--rt-muted)}.rt-kv dd{margin:0;word-break:break-all}
.rt-section-t{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.rt-section-t h3{margin:0;font-size:1.05rem}
.rt-table{width:100%;border-collapse:collapse;font-size:.87rem}
.rt-table th{text-align:left;font-weight:600;color:var(--rt-muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;padding:8px 10px;border-bottom:1px solid var(--rt-line)}
.rt-table td{padding:8px 10px;border-bottom:1px solid color-mix(in srgb,var(--rt-line) 55%,transparent);word-break:break-word;vertical-align:middle}
.rt-table tr:last-child td{border-bottom:0}
.rt-table tr:hover td{background:color-mix(in srgb,var(--rt-info) 5%,transparent)}
.rt-num{text-align:right!important;font-variant-numeric:tabular-nums;white-space:nowrap}
.rt-mono{font-family:var(--font-mono,monospace);font-size:.83rem}
.rt-proto{display:inline-block;min-width:44px;text-align:center;padding:2px 8px;border-radius:6px;font-weight:700;font-size:.72rem;text-transform:uppercase;
color:var(--rt-ink);background:color-mix(in srgb,var(--rt-tone) 14%,transparent)}
.rt-tl{position:relative;display:grid;gap:12px}
.rt-tl::before{content:'';position:absolute;left:19px;top:22px;bottom:22px;width:2px;background:var(--rt-line)}
.rt-st{position:relative;display:grid;grid-template-columns:40px 1fr;gap:14px;align-items:start}
.rt-st-m{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:700;background:var(--rt-card);border:2px solid var(--rt-line);color:var(--rt-muted);z-index:1}
.rt-st.rt-ok .rt-st-m{background:var(--rt-ok);border-color:var(--rt-ok);color:#fff}
.rt-st.rt-warn .rt-st-m{background:var(--rt-warn);border-color:var(--rt-warn);color:#fff}
.rt-st.rt-err .rt-st-m{background:var(--rt-err);border-color:var(--rt-err);color:#fff}
.rt-st.rt-info .rt-st-m{border-color:var(--rt-info);color:var(--rt-info)}
.rt-st.rt-off .rt-st-m{border-style:dashed}
.rt-st-c{background:var(--rt-card);border:1px solid var(--rt-line);border-radius:14px;box-shadow:var(--rt-shadow);min-width:0}
.rt-st-c>summary{list-style:none;display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;border-radius:14px}
.rt-st-c>summary::-webkit-details-marker{display:none}
.rt-st-c>summary:focus-visible{outline:2px solid var(--rt-info);outline-offset:2px}
.rt-st-c>summary h3{margin:0;font-size:1rem;line-height:1.3;flex:1;min-width:0}
.rt-st-c>summary .rt-chev{display:grid;transition:transform .2s;color:var(--rt-muted)}
.rt-st-c[open]>summary .rt-chev{transform:rotate(90deg)}
.rt-st-b{padding:0 16px 16px;display:grid;gap:12px}
.rt-sw{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-weight:600;user-select:none}
.rt-sw input{position:absolute;opacity:0;width:1px;height:1px}
.rt-sw i{position:relative;flex:none;width:48px;height:28px;border-radius:99px;background:color-mix(in srgb,var(--rt-text) 22%,transparent);transition:background .2s}
.rt-sw i::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .2s}
.rt-sw input:checked+i{background:var(--rt-ok)}
.rt-sw input:checked+i::after{transform:translateX(20px)}
.rt-sw input:focus-visible+i{outline:2px solid var(--rt-info);outline-offset:2px}
.rt-sw input:disabled+i{opacity:.55}
.rt-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;padding-top:6px}
.rt-opt{position:relative;display:grid;gap:3px;padding:12px 14px;border:1.5px solid var(--rt-line);border-radius:12px;cursor:pointer;transition:border-color .15s,box-shadow .15s}
.rt-opt:hover{border-color:color-mix(in srgb,var(--rt-info) 50%,var(--rt-line))}
.rt-opt input{position:absolute;opacity:0}
.rt-opt:has(input:checked){border-color:var(--rt-info);background:color-mix(in srgb,var(--rt-info) 7%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--rt-info) 16%,transparent)}
.rt-opt:has(input:focus-visible){outline:2px solid var(--rt-info);outline-offset:2px}
.rt-opt small{color:var(--rt-muted);font-size:.8rem}
.rt-tag{position:absolute;top:-9px;right:10px;padding:1px 8px;border-radius:99px;font-size:.68rem;font-weight:700;color:var(--on-primary-color,#fff);background:var(--rt-info)}
.rt-field{display:grid;gap:6px;max-width:420px}
.rt-field>span:first-child{font-weight:600;font-size:.88rem}
.rt-in{display:flex;gap:6px;align-items:center}
.rt-in .btn{height:40px;display:inline-flex;align-items:center;justify-content:center;margin:0}
.rt .rt-input{flex:1;min-width:0;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--rt-line);font-size:.95rem;
background:var(--background-color-high,#fff);color:var(--rt-text)}
.rt .rt-input:focus{outline:2px solid color-mix(in srgb,var(--rt-info) 60%,transparent);outline-offset:1px;border-color:var(--rt-info)}
.rt-hint{font-size:.8rem;color:var(--rt-muted);font-weight:400}
.rt-help{font-size:.86rem;color:var(--rt-muted)}
.rt-help>summary{display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:var(--rt-info);font-weight:600;list-style:none}
.rt-help>summary::-webkit-details-marker{display:none}
.rt-help>summary .rt-ico{width:16px;height:16px}
.rt-help>div{margin-top:6px;padding:10px 12px;border-radius:10px;background:var(--rt-soft);color:var(--rt-text)}
.rt-checks{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:6px 14px;margin-top:10px}
.rt-check{display:flex;align-items:center;gap:8px;font-size:.87rem;min-width:0}
.rt-check span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rt-check .rt-ico{width:16px;height:16px;color:var(--rt-tone)}
.rt textarea.rt-conf{width:100%;min-height:180px;font-family:var(--font-mono,monospace);font-size:.8rem;resize:vertical;border-radius:10px}
.rt-progress{height:10px;border-radius:99px;overflow:hidden;background:color-mix(in srgb,var(--rt-info) 15%,transparent)}
.rt-progress>i{display:block;height:100%;transition:width 1s linear;background-size:34px 34px;animation:rt-stripes 1s linear infinite;
background-image:repeating-linear-gradient(45deg,var(--rt-info) 0 12px,color-mix(in srgb,var(--rt-info) 70%,#fff) 12px 24px)}
@keyframes rt-stripes{to{background-position:34px 0}}
.rt-seg{display:inline-flex;flex-wrap:wrap;gap:6px}
.rt-seg .btn.rt-on{background:var(--rt-info);border-color:var(--rt-info);color:var(--on-primary-color,#fff)}
.rt-rule{display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border:1px solid var(--rt-line);border-radius:12px}
.rt-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.rt-empty{color:var(--rt-muted);text-align:center;padding:18px;display:grid;justify-items:center;gap:8px}
.rt-empty .rt-ico{width:34px;height:34px;opacity:.45}
.rt-note{display:flex;gap:10px;align-items:flex-start;padding:10px 14px;border-radius:12px;font-size:.88rem;
background:color-mix(in srgb,var(--rt-tone,var(--rt-info)) 10%,transparent);border-left:3px solid var(--rt-tone,var(--rt-info))}
.rt-note>.rt-ico{color:var(--rt-ink);margin-top:1px}
@media (max-width:600px){.rt-hero{padding:20px}.rt-hero h2{font-size:1.4rem}.rt-ring{width:80px;height:80px}.rt-ring b{width:62px;height:62px;font-size:1.2rem}
.rt-big{font-size:1.4rem}.rt-hide-s{display:none}.rt-foot .btn{flex:1 1 auto}.rt-st{grid-template-columns:32px 1fr;gap:10px}
.rt-st-m{width:32px;height:32px}.rt-tl::before{left:15px}.rt-st-c>summary .rt-bubble{display:none}}
@media (prefers-reduced-motion:reduce){.rt>*,.rt-progress>i{animation:none}.rt-sw i,.rt-sw i::after,.rt-card{transition:none}}
`;

// Icone disegnate a tratto (viewBox 24×24): markup statico, mai dati esterni.
const ICONS = {
	shield: '<path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
	lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
	home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
	radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12l6.5-6.5"/>',
	clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
	globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
	chip: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
	wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.5a9.5 9.5 0 0 1 13 0"/><path d="M8.8 16a5 5 0 0 1 6.4 0"/><path d="M12 19.5h.01"/>',
	plug: '<path d="M9 2v5M15 2v5"/><path d="M6 7h12v4a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
	box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
	download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
	help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.4"/><path d="M12 17h.01"/>',
	info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
	alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
	eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
	spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
	chevron: '<path d="M9 6l6 6-6 6"/>',
	list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
	check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
	cross: '<path d="M6 6l12 12M18 6L6 18"/>'
};

const units = [ 'B', 'KiB', 'MiB', 'GiB' ];
// Passi aperti o chiusi a mano: restano così anche quando la pagina si aggiorna da sola.
const opened = {};

return baseclass.extend({
	// Inserisce lo stile una volta sola e restituisce il contenitore radice.
	root: function(children) {
		if (!document.getElementById('rt-style'))
			document.head.appendChild(E('style', { 'id': 'rt-style' }, CSS));

		return E('div', { 'class': 'rt' }, children);
	},

	icon: function(name) {
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('class', 'rt-ico');
		svg.setAttribute('aria-hidden', 'true');
		svg.innerHTML = ICONS[name] || '';

		return svg;
	},

	badge: function(tone, text) {
		return E('span', { 'class': 'rt-badge rt-' + tone }, [ text ]);
	},

	pill: function(icon, text, bad) {
		return E('span', { 'class': 'rt-pill' + (bad ? ' rt-bad' : '') }, [ this.icon(icon), text ]);
	},

	// Testata di pagina: titolo, frase, pillole di stato, anello facoltativo [fatti, totale].
	hero: function(title, text, pills, ring) {
		return E('div', { 'class': 'rt-hero' }, [
			ring ? E('div', {
				'class': 'rt-ring', 'style': '--p:' + Math.round(ring[0] * 100 / ring[1]),
				'role': 'img', 'aria-label': ring[0] + ' di ' + ring[1] + ' a posto'
			}, [ E('b', {}, [ ring[0] + '/' + ring[1], E('small', {}, [ 'a posto' ]) ]) ]) : '',
			E('div', { 'class': 'rt-hero-t' }, [
				E('h2', {}, [ title ]),
				text ? E('p', {}, [ text ]) : '',
				pills && pills.length ? E('div', { 'class': 'rt-pills' }, pills) : ''
			])
		]);
	},

	// Scheda: icona colorata, titolo, badge di stato, poi il contenuto.
	card: function(iconName, tone, title, status, children) {
		return E('div', { 'class': 'rt-card' }, [
			E('div', { 'class': 'rt-card-h' }, [
				E('div', { 'class': 'rt-bubble rt-' + tone }, [ this.icon(iconName) ]),
				E('div', { 'class': 'rt-card-t' }, [ E('h3', {}, [ title ]), status || '' ])
			])
		].concat(children));
	},

	// Passi guidati: { icon, title, tone ok|warn|err|info|off, badge: [tono, testo], open, body };
	// il segno sulla linea mostra lo stato (✓ fatto, ! da sistemare, numero da fare,
	// bordo tratteggiato facoltativo). first = numero del primo passo (default 1).
	steps: function(items, first) {
		return E('div', { 'class': 'rt-tl' }, items.map((s, i) => {
			const det = E('details', { 'class': 'rt-st-c', 'open': (s.title in opened ? opened[s.title] : s.open) ? '' : null }, [
				E('summary', {}, [
					E('div', { 'class': 'rt-bubble rt-' + s.tone }, [ this.icon(s.icon) ]),
					E('h3', {}, [ s.title ]),
					s.badge ? this.badge(s.badge[0], s.badge[1]) : '',
					E('span', { 'class': 'rt-chev' }, [ this.icon('chevron') ])
				]),
				E('div', { 'class': 'rt-st-b' }, s.body)
			]);

			det.addEventListener('toggle', () => { opened[s.title] = det.open; });

			return E('div', { 'class': 'rt-st rt-' + s.tone }, [
				E('div', { 'class': 'rt-st-m', 'aria-hidden': 'true' }, [
					s.tone == 'ok' ? this.icon('check') : (s.tone == 'warn' || s.tone == 'err') ? this.icon('alert') : String(i + (first || 1))
				]),
				det
			]);
		}));
	},

	// Interruttore on/off accessibile: label(on) dà il testo, onchange(on) una
	// promessa durante la quale l'interruttore resta bloccato (se fallisce torna com'era).
	toggle: function(on, label, onchange) {
		const input = E('input', { 'type': 'checkbox', 'role': 'switch', 'checked': on ? '' : null });
		const text = E('span', {}, [ label(on) ]);

		input.addEventListener('change', () => {
			input.disabled = true;
			text.textContent = label(input.checked);
			Promise.resolve().then(() => onchange(input.checked)).catch(e => {
				input.checked = !input.checked;
				text.textContent = label(input.checked);
				ui.addNotification(null, E('p', {}, [ 'Operazione non riuscita: ' + (e && e.message || e) ]), 'danger');
			}).finally(() => { input.disabled = false; });
		});

		return E('label', { 'class': 'rt-sw' }, [ input, E('i'), text ]);
	},

	// Schede di scelta (radio): options = [{ value, title, text, tag }].
	options: function(name, options, selected, onchange) {
		return E('div', { 'class': 'rt-opts', 'role': 'radiogroup' }, options.map(o => {
			const input = E('input', { 'type': 'radio', 'name': name, 'value': o.value, 'checked': o.value == selected ? '' : null });

			input.addEventListener('change', () => onchange(o.value));

			return E('label', { 'class': 'rt-opt' }, [
				input, o.tag ? E('span', { 'class': 'rt-tag' }, [ o.tag ]) : '',
				E('b', {}, [ o.title ]), E('small', {}, [ o.text ])
			]);
		}));
	},

	field: function(label, control, hint) {
		return E('label', { 'class': 'rt-field' }, [ E('span', {}, [ label ]), control, hint ? E('span', { 'class': 'rt-hint' }, [ hint ]) : '' ]);
	},

	// Spiegazione richiudibile per chi non conosce i termini tecnici.
	help: function(text, title) {
		return E('details', { 'class': 'rt-help' }, [
			E('summary', {}, [ this.icon('help'), title || 'Cosa significa?' ]),
			E('div', {}, [ text ])
		]);
	},

	meter: function(label, used, total, text) {
		const pct = total > 0 ? Math.min(100, Math.round(used * 100 / total)) : 0;
		const tone = pct >= 90 ? 'err' : pct >= 75 ? 'warn' : 'info';

		return E('div', { 'class': 'rt-meter rt-' + tone }, [
			E('div', { 'class': 'rt-meter-l' }, [ E('span', {}, [ label ]), E('b', {}, [ text ]) ]),
			E('div', { 'class': 'rt-bar' }, [ E('i', { 'style': 'width:' + pct + '%' }) ])
		]);
	},

	kv: function(pairs) {
		const dl = E('dl', { 'class': 'rt-kv' });

		pairs.forEach(p => { if (p) dl.append(E('dt', {}, [ p[0] ]), E('dd', {}, [ p[1] ])); });

		return dl;
	},

	note: function(tone, children) {
		return E('div', { 'class': 'rt-note rt-' + tone }, [
			this.icon(tone == 'ok' ? 'check' : tone == 'info' ? 'info' : 'alert'), E('div', {}, children)
		]);
	},

	empty: function(icon, text) {
		return E('div', { 'class': 'rt-empty' }, [ this.icon(icon), E('div', {}, [ text ]) ]);
	},

	proto: function(name) {
		const tone = { tcp: 'info', udp: 'warn', icmp: 'ok' }[name] || 'off';

		return E('span', { 'class': 'rt-proto rt-' + tone }, [ name ]);
	},

	bytes: function(n) {
		let i = 0;

		n = +n || 0;
		while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }

		return (i ? n.toFixed(n < 10 ? 1 : 0) : n) + ' ' + units[i];
	},

	// Durata leggibile: "2 g 4 h", "3 h 5 min", "42 s".
	duration: function(s) {
		s = Math.max(0, Math.floor(+s || 0));

		const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);

		if (d) return d + ' g ' + h + ' h';
		if (h) return h + ' h ' + m + ' min';
		if (m) return m + ' min';

		return s + ' s';
	},

	ago: function(s) {
		return this.duration(s) + ' fa';
	},

	isIPv4: function(s) {
		return /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(s);
	},

	// Le query DNS come un tabellone delle partenze (componente quadro-partenze):
	// ora, dominio e dispositivo, tipo di record al "binario", esito come stato.
	// rows: righe del log di AdGuard Home (luci.routerino agh_querylog), le più recenti prima.
	dnsBoard: function(rows, now) {
		const STATUS = {
			reply: [ 'on-time', 'Risolta' ], cached: [ 'arrived', 'Dalla cache' ], local: [ 'changed', 'Locale' ],
			blocked: [ 'cancelled', 'Bloccata' ]
		};
		const qp = cls => 'quadro-partenze__' + cls;
		const cell = (kind, label, children) => E('td', { 'class': qp('cell') + ' ' + qp('cell--' + kind), 'data-label': label }, children);
		const blocked = rows.filter(q => q.result == 'blocked').length;
		const trs = rows.slice(0, 12).map(q => {
			const st = STATUS[q.result] || STATUS.reply;

			return E('tr', { 'class': qp('row') + ' ' + qp('row--' + st[0]) }, [
				cell('time', 'Ora', [ E('span', { 'class': qp('value'), 'title': q.time }, [ q.time.slice(0, 5) ]), E('span', { 'class': qp('secondary') }, [ q.time.slice(5) ]) ]),
				cell('destination', 'Dominio', [ E('span', { 'class': qp('value') }, [ q.name ]),
					E('span', { 'class': qp('secondary') }, [ q.client_name ? q.client_name.replace(/\.lan$/, '') + ' · ' + q.client : q.client ]) ]),
				cell('platform', 'Tipo', [ E('span', { 'class': qp('platform') }, [ q.type ]) ]),
				cell('status', 'Esito', [ E('span', { 'class': qp('status') + ' ' + qp('status--' + st[0]) }, [ st[1] ]) ]),
				cell('note', 'Risposta', [ E('span', { 'class': qp('value') }, [ q.answer ]) ])
			]);
		});
		const theme = document.documentElement.getAttribute('data-theme') || 'dark';

		return E('section', { 'class': 'quadro-partenze quadro-partenze--full quadro-partenze--wrap-destinations' + (trs.length ? '' : ' quadro-partenze--empty'),
			'data-theme': theme, 'aria-label': 'Ultime query DNS dei dispositivi' }, [
			E('header', { 'class': qp('header') }, [
				E('div', { 'class': qp('heading') }, [
					E('h3', { 'class': qp('title') }, [ 'Partenze DNS' ]),
					E('p', { 'class': qp('subtitle') }, [ 'Le ultime richieste passate da AdGuard Home' + (rows.length ? ': ' + blocked + ' bloccate su ' + rows.length + '.' : '.') ])
				]),
				E('div', { 'class': qp('meta') }, [ E('span', { 'class': qp('updated') }, [ E('span', { 'class': qp('live-dot'), 'aria-hidden': 'true' }),
					'Aggiornato alle ' + (now ? new Date(now * 1000).toLocaleTimeString('it-IT') : '') ]) ])
			]),
			E('div', { 'class': qp('viewport'), 'tabindex': '0' }, [
				E('table', { 'class': qp('table') }, [
					E('thead', { 'class': qp('head') }, [ E('tr', {}, [ 'Ora', 'Dominio e dispositivo', 'Tipo', 'Esito', 'Risposta' ].map(h => E('th', { 'class': qp('head-cell'), 'scope': 'col' }, [ h ]))) ]),
					E('tbody', { 'class': qp('body') }, trs)
				])
			]),
			E('div', { 'class': qp('message') + ' ' + qp('message--empty') }, [ E('strong', {}, [ 'Nessuna richiesta' ]), 'AdGuard Home non ha ancora registrato richieste.' ]),
			E('ul', { 'class': qp('legend') }, [ [ 'on-time', 'Risolta' ], [ 'arrived', 'Dalla cache' ], [ 'cancelled', 'Bloccata' ], [ 'changed', 'Nome locale' ] ]
				.map(l => E('li', { 'class': qp('legend-item') + ' ' + qp('legend-item--' + l[0]) }, [ E('span', { 'class': qp('legend-swatch') }), l[1] ])))
		]);
	},

	// Testo in formato /etc/config → [{ type, name, options, note }]; le liste sono
	// array. note = primo commento dentro la sezione (fw-profile ci elenca le destinazioni).
	parseUci: function(text) {
		const sections = [];
		let cur = null;

		String(text || '').split('\n').forEach(raw => {
			const line = raw.trim();
			const c = line.match(/^#\s?(.*)$/);

			if (c) {
				if (cur && cur.note == null) cur.note = c[1];
				return;
			}

			const m = line.match(/^(config|option|list)\s+(\S+)(?:\s+(.+))?$/);

			if (!m) return;

			const v = m[3] == null ? null : m[3].replace(/^'([^']*)'$|^"([^"]*)"$/, (all, a, b) => a ?? b);

			if (m[1] == 'config')
				sections.push(cur = { type: m[2], name: v, options: {}, note: null });
			else if (cur && m[1] == 'option')
				cur.options[m[2]] = v;
			else if (cur)
				cur.options[m[2]] = [].concat(cur.options[m[2]] || [], [ v ]);
		});

		return sections;
	}
});
