import {GUI} from 'lil-gui';
import {hexToRgb, syncColorFromRgb} from './utils.js';

export function createGUI(params, uniforms, deps) {
	const {
		mesh, points, bloomPass, listener,
		audio, rebuildGeometry, setWireframe
	} = deps;

	const gui = new GUI();

	const audioSourceFolder = gui.addFolder('Audio Source');
	audioSourceFolder.add({toggle: audio.togglePlayback}, 'toggle').name('播放/暂停');
	audioSourceFolder.add({builtin: audio.switchToBuiltin}, 'builtin').name('内置音频');
	audioSourceFolder.add({system: audio.switchToSystem}, 'system').name('系统音频');
	audioSourceFolder.add(params, 'systemPlaythrough').name('系统音频播放').onChange(function(value) {
		audio.togglePlaythrough(value);
	});

	const geometryFolder = gui.addFolder('Geometry');
	geometryFolder.add(params, 'detail', 1, 50, 1).name('细分级别').onChange(function(value) {
		rebuildGeometry(mesh, points, value);
	});
	geometryFolder.add(params, 'wireframe').name('线框显示').onChange(function(value) {
		setWireframe(mesh, points, value);
	});
	geometryFolder.add(params, 'pointSize', 1, 10, 0.5).name('点大小').onChange(function(value) {
		uniforms.u_pointSize.value = value;
	});
	geometryFolder.add(params, 'scale', 0.5, 3, 0.1).name('缩放').onChange(function(value) {
		mesh.scale.setScalar(value);
		points.scale.setScalar(value);
	});

	const audioFolder = gui.addFolder('Audio');
	audioFolder.add(params, 'sensitivity', 1, 10, 0.1).name('灵敏度').onChange(function(value) {
		uniforms.u_sensitivity.value = value;
	});
	audioFolder.add(params, 'smoothing', 0, 0.95, 0.01).name('平滑度');

	const noiseFolder = gui.addFolder('Noise');
	noiseFolder.add(params, 'noiseSpeed', 1, 5, 0.1).name('速度');

	const colorsFolder = gui.addFolder('Colors');
	colorsFolder.addColor(params, 'color').name('颜色').onChange(function(value) {
		const rgb = hexToRgb(value);
		params.red = rgb.r;
		params.green = rgb.g;
		params.blue = rgb.b;
		uniforms.u_red.value = rgb.r;
		uniforms.u_green.value = rgb.g;
		uniforms.u_blue.value = rgb.b;
	});
	colorsFolder.add(params, 'red', 0, 1, 0.01).name('R').onChange(function() {
		syncColorFromRgb(params, uniforms, gui);
	});
	colorsFolder.add(params, 'green', 0, 1, 0.01).name('G').onChange(function() {
		syncColorFromRgb(params, uniforms, gui);
	});
	colorsFolder.add(params, 'blue', 0, 1, 0.01).name('B').onChange(function() {
		syncColorFromRgb(params, uniforms, gui);
	});

	const bloomFolder = gui.addFolder('Bloom');
	bloomFolder.add(params, 'threshold', 0, 1, 0.01).onChange(function(value) {
		bloomPass.threshold = Number(value);
	});
	bloomFolder.add(params, 'strength', 0, 1, 0.01).onChange(function(value) {
		bloomPass.strength = Number(value);
	});
	bloomFolder.add(params, 'radius', 0, 1, 0.01).onChange(function(value) {
		bloomPass.radius = Number(value);
	});

	return gui;
}
