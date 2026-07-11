export function hexToRgb(hex) {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return {r, g, b};
}

export function rgbToHex(r, g, b) {
	return '#' + [r, g, b].map(function(v) {
		return Math.round(v * 255).toString(16).padStart(2, '0');
	}).join('');
}

export function syncColorFromRgb(params, uniforms, gui) {
	params.color = rgbToHex(params.red, params.green, params.blue);
	uniforms.u_red.value = params.red;
	uniforms.u_green.value = params.green;
	uniforms.u_blue.value = params.blue;
	gui.updateDisplay();
}
