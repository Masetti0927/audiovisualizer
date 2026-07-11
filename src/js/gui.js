import * as THREE from 'three';
import {GUI} from 'lil-gui';
import {hexToRgb, rgbToHex} from './utils.js';

function addLayerControls(gui, params, uniforms, layer, prefix, folderName, rebuildLayer, extraControls) {
	const folder = gui.addFolder(folderName);

	folder.add(params, prefix + 'Visible').name('显示').onChange(function(value) {
		layer.mesh.visible = value && params[prefix + 'Wireframe'];
		layer.points.visible = value;
	});
	folder.add(params, prefix + 'Detail', 1, 50, 1).name('细分级别').onChange(function() {
		rebuildLayer(layer, params, prefix);
	});
	folder.add(params, prefix + 'Wireframe').name('线框显示').onChange(function(value) {
		layer.mesh.visible = params[prefix + 'Visible'] && value;
	});
	folder.add(params, prefix + 'PointSize', 1, 10, 0.5).name('点大小').onChange(function(value) {
		uniforms[prefix + 'PointSize'].value = value;
	});
	folder.add(params, prefix + 'Scale', 0.5, 3, 0.1).name('缩放').onChange(function(value) {
		layer.mesh.scale.setScalar(value);
		layer.points.scale.setScalar(value);
	});
	folder.addColor(params, prefix + 'Color').name('颜色').onChange(function(value) {
		const rgb = hexToRgb(value);
		params[prefix + 'Red'] = rgb.r;
		params[prefix + 'Green'] = rgb.g;
		params[prefix + 'Blue'] = rgb.b;
		uniforms[prefix + 'Red'].value = rgb.r;
		uniforms[prefix + 'Green'].value = rgb.g;
		uniforms[prefix + 'Blue'].value = rgb.b;
		gui.updateDisplay();
	});
	folder.add(params, prefix + 'Red', 0, 1, 0.01).name('红').onChange(function() {
		uniforms[prefix + 'Red'].value = params[prefix + 'Red'];
		params[prefix + 'Color'] = rgbToHex(params[prefix + 'Red'], params[prefix + 'Green'], params[prefix + 'Blue']);
		gui.updateDisplay();
	});
	folder.add(params, prefix + 'Green', 0, 1, 0.01).name('绿').onChange(function() {
		uniforms[prefix + 'Green'].value = params[prefix + 'Green'];
		params[prefix + 'Color'] = rgbToHex(params[prefix + 'Red'], params[prefix + 'Green'], params[prefix + 'Blue']);
		gui.updateDisplay();
	});
	folder.add(params, prefix + 'Blue', 0, 1, 0.01).name('蓝').onChange(function() {
		uniforms[prefix + 'Blue'].value = params[prefix + 'Blue'];
		params[prefix + 'Color'] = rgbToHex(params[prefix + 'Red'], params[prefix + 'Green'], params[prefix + 'Blue']);
		gui.updateDisplay();
	});

	if (extraControls) {
		extraControls(folder);
	}

	return folder;
}

export function createGUI(params, uniforms, deps) {
	const {
		innerLayer, middleLayer, outerLayer,
		innerGlow, rays, bloomPass,
		listener, audio,
		rebuildLayer, rebuildRays
	} = deps;

	const gui = new GUI();

	const audioSourceFolder = gui.addFolder('音频源');
	audioSourceFolder.add({toggle: audio.togglePlayback}, 'toggle').name('播放/暂停');
	audioSourceFolder.add({builtin: audio.switchToBuiltin}, 'builtin').name('内置音频');
	audioSourceFolder.add({system: audio.switchToSystem}, 'system').name('系统音频');
	audioSourceFolder.add(params, 'systemPlaythrough').name('系统音频播放').onChange(function(value) {
		audio.togglePlaythrough(value);
	});

	addLayerControls(gui, params, uniforms, innerLayer, 'inner', '内层', rebuildLayer, function(folder) {
		folder.add(params, 'innerGlow').name('光球叠加').onChange(function(value) {
			innerGlow.mesh.visible = value;
		});
		folder.add(params, 'innerGlowIntensity', 0, 2, 0.1).name('光球强度').onChange(function(value) {
			uniforms.u_glowIntensity.value = value;
		});
	});

	addLayerControls(gui, params, uniforms, middleLayer, 'middle', '中层', rebuildLayer);

	addLayerControls(gui, params, uniforms, outerLayer, 'outer', '外层', rebuildLayer, function(folder) {
		folder.add(params, 'outerRays').name('射线显示').onChange(function(value) {
			rays.rayLines.visible = value && params.outerRayStyle === '细线';
			rays.rayCylinders.visible = value && params.outerRayStyle === '粗线';
		});
		folder.add(params, 'outerRayLength', 0, 10, 0.1).name('射线长度').onChange(function(value) {
			uniforms.u_rayLength.value = value;
		});
		folder.add(params, 'outerRayThreshold', 0, 1, 0.01).name('射线阈值').onChange(function(value) {
			uniforms.u_rayThreshold.value = value;
		});
		folder.add(params, 'outerRayStyle', ['细线', '粗线']).name('射线样式').onChange(function(value) {
			rays.rayLines.visible = params.outerRays && value === '细线';
			rays.rayCylinders.visible = params.outerRays && value === '粗线';
		});
		folder.add(params, 'outerRayThickness', 0.01, 0.1, 0.001).name('射线粗细').onChange(function() {
			rebuildRays();
		});
	});

	const audioFolder = gui.addFolder('音频');
	audioFolder.add(params, 'sensitivity', 1, 10, 0.1).name('灵敏度').onChange(function(value) {
		uniforms.u_sensitivity.value = value;
	});
	audioFolder.add(params, 'smoothing', 0, 0.95, 0.01).name('平滑度');

	const noiseFolder = gui.addFolder('噪声');
	noiseFolder.add(params, 'noiseSpeed', 1, 5, 0.1).name('速度');
	noiseFolder.add(params, 'rotationSpeed', 0, 3, 0.1).name('旋转速度');
	noiseFolder.add(params, 'rotationInterval', 1, 10, 0.5).name('切换间隔');
	noiseFolder.add(params, 'rotationSmoothness', 0.1, 1, 0.05).name('过渡平滑度');

	const bloomFolder = gui.addFolder('泛光');
	bloomFolder.add(params, 'threshold', 0, 1, 0.01).name('阈值').onChange(function(value) {
		bloomPass.threshold = Number(value);
	});
	bloomFolder.add(params, 'strength', 0, 1, 0.01).name('强度').onChange(function(value) {
		bloomPass.strength = Number(value);
	});
	bloomFolder.add(params, 'radius', 0, 1, 0.01).name('半径').onChange(function(value) {
		bloomPass.radius = Number(value);
	});

	return gui;
}
