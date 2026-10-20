'use strict';
'require view';
'require rpc';
'require ui';
'require dom';
'require routerino.common as rt';

// Accelerazione e SQM (come Sicurezza › Accelerazione e Flow control › SQM della
// GUI GL.iNet). Si escludono: i flussi in offload non passano dalle code.

const callStatus = rpc.declare({ object: 'luci.glgw', method: 'net_status' });
const callSet = rpc.declare({ object: 'luci.glgw', method: 'net_set', params: [ 'mode', 'down', 'up' ] });

const MODES = [
	{ value: 'offload', title: 'Accelerazione hardware', tag: 'consigliato', text: 'Il motore di rete del chip (PPE) instrada il traffico senza usare la CPU: massima velocità, fino ai 2,5 Gbit/s della porta WAN.' },
	{ value: 'sqm', title: 'Anti-lag (SQM)', text: 'Code intelligenti (cake) che tengono bassa la latenza quando la linea è piena: utile per giochi e videochiamate. Serve indicare la velocità della linea.' },
	{ value: 'none', title: 'Nessuna', text: 'Instradamento normale dalla CPU.' }
];

return view.extend({
	load: function() {
		return callStatus();
	},

	render: function(s) {
		let mode = s.offload ? 'offload' : s.sqm ? 'sqm' : 'none';
		const down = E('input', { 'class': 'rt-input', 'type': 'number', 'min': '1', 'max': '2500', 'value': s.down ? s.down / 1000 : '' });
		const up = E('input', { 'class': 'rt-input', 'type': 'number', 'min': '1', 'max': '2500', 'value': s.up ? s.up / 1000 : '' });
		const speeds = E('div', { 'style': mode == 'sqm' ? '' : 'display:none' }, [
			rt.field('Download (Mbit/s)', down, 'Circa il 90% della velocità reale misurata.'),
			rt.field('Upload (Mbit/s)', up)
		]);

		return rt.root([
			rt.hero('Accelerazione e SQM', 'Come il Brume tratta il traffico che instrada: vale per i dispositivi collegati dietro di lui o in VPN, non per il solo DNS della casa.'),
			rt.card('spark', 'info', 'Modalità', '', [
				rt.options('glgw-net', MODES, mode, v => { mode = v; speeds.style.display = v == 'sqm' ? '' : 'none'; }),
				speeds,
				E('div', { 'class': 'rt-foot' }, [
					E('button', { 'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, () =>
						callSet(mode, Math.round((+down.value || 0) * 1000), Math.round((+up.value || 0) * 1000)).then(r => {
							if (r.error) throw new Error(r.error);
							ui.addNotification(null, E('p', {}, [ 'Applicato.' ]), 'info');
						})) }, [ 'Applica' ])
				]),
				rt.help('L\'accelerazione hardware e SQM non si possono usare insieme: il traffico accelerato salta le code, quindi SQM non avrebbe effetto. Scegline una.')
			])
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
