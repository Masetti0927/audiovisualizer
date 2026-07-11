import * as THREE from 'three';
import {GUI} from 'lil-gui';
import {hexToRgb, syncColorFromRgb} from './utils.js';

export function createGUI(params, uniforms, deps) {
	const {
		mesh, points, bloomPass, listener,
		audio, rebuildGeometry, setWireframe,
		innerSphere, outerLayer, rebuildOuterLayer
	} = deps;

	const gui = new GUI();

	const audioSourceFolder = gui.addFolder('音频源');
	audioSourceFolder.add({toggle: audio.togglePlayback}, 'toggle').name('播放/暂停');
	audioSourceFolder.add({builtin: audio.switchToBuiltin}, 'builtin').name('内置音频');
	audioSourceFolder.add({system: audio.switchToSystem}, 'system').name('系统音频');
	audioSourceFolder.add(params, 'systemPlaythrough').name('系统音频播放').onChange(function(value) {
		audio.togglePlaythrough(value);
	});

	const innerFolder = gui.addFolder('内层');
	innerFolder.add(params, 'innerGlowVisible').name('光球显示').onChange(function(value) {
		innerSphere.mesh.visible = value;
	});
	innerFolder.add(params, 'innerGlowRadius', 1, 5, 0.1).name('光球半径').onChange(function(value) {
		innerSphere.mesh.geometry.dispose();
		innerSphere.mesh.geometry = new THREE.SphereGeometry(value, 32, 32);
	});
	innerFolder.add(params, 'innerGlowIntensity', 0, 2, 0.1).name('光球强度').onChange(function(value) {
		uniforms.u_glowIntensity.value = value;
	});
	innerFolder.addColor(params, 'innerGlowColor').name('光球颜色').onChange(function(value) {
		uniforms.u_glowColor.value.set(value);
	});

	const middleFolder = gui.addFolder('中层');
	middleFolder.add(params, 'detail', 1, 50, 1).name('细分级别').onChange(function(value) {
		rebuildGeometry(mesh, points, value);
	});
	middleFolder.add(params, 'wireframe').name('线框显示').onChange(function(value) {
		setWireframe(mesh, points, value);
	});
	middleFolder.add(params, 'pointSize', 1, 10, 0.5).name('点大小').onChange(function(value) {
		uniforms.u_pointSize.value = value;
	});
	middleFolder.add(params, 'scale', 0.5, 3, 0.1).name('缩放').onChange(function(value) {
		mesh.scale.setScalar(value);
		points.scale.setScalar(value);
	});
	middleFolder.addColor(params, 'color').name('颜色').onChange(function(value) {
		const rgb = hexToRgb(value);
		params.red = rgb.r;
		params.green = rgb.g;
		params.blue = rgb.b;
		uniforms.u_red.value = rgb.r;
		uniforms.u_green.value = rgb.g;
		uniforms.u_blue.value = rgb.b;
	});
	middleFolder.add(params, 'red', 0, 1, 0.01).name('红').onChange(function() {
		syncColorFromRgb(params, uniforms, gui);
	});
	middleFolder.add(params, 'green', 0, 1, 0.01).name('绿').onChange(function() {
		syncColorFromRgb(params, uniforms, gui);
	});
	middleFolder.add(params, 'blue', 0, 1, 0.01).name('蓝').onChange(function() {
		syncColorFromRgb(params, uniforms, gui);
	});

	const outerFolder = gui.addFolder('外层');
	outerFolder.add(params, 'outerVisible').name('外层显示').onChange(function(value) {
		outerLayer.outerMesh.visible = value && params.outerWireframe;
		outerLayer.outerPoints.visible = value;
		outerLayer.rayLines.visible = value && params.rayVisible && params.rayStyle === '细线';
		outerLayer.rayCylinders.visible = value && params.rayVisible && params.rayStyle === '粗线';
	});
	outerFolder.add(params, 'outerRadius', 4.5, 8, 0.1).name('外层半径').onChange(function() {
		rebuildOuterLayer();
	});
	outerFolder.add(params, 'outerDetail', 1, 50, 1).name('外层细分').onChange(function() {
		rebuildOuterLayer();
	});
	outerFolder.add(params, 'outerWireframe').name('外层线框').onChange(function(value) {
		outerLayer.outerMesh.visible = params.outerVisible && value;
	});
	outerFolder.add(params, 'outerPointSize', 1, 10, 0.5).name('外层点大小').onChange(function(value) {
		uniforms.u_outerPointSize.value = value;
	});
	outerFolder.add(params, 'outerScale', 0.5, 3, 0.1).name('外层缩放').onChange(function(value) {
		outerLayer.outerMesh.scale.setScalar(value);
		outerLayer.outerPoints.scale.setScalar(value);
		outerLayer.rayLines.scale.setScalar(value);
		outerLayer.rayCylinders.scale.setScalar(value);
	});
	outerFolder.addColor(params, 'outerColor').name('外层颜色').onChange(function(value) {
		const rgb = hexToRgb(value);
		params.outerRed = rgb.r;
		params.outerGreen = rgb.g;
		params.outerBlue = rgb.b;
		uniforms.u_outerRed.value = rgb.r;
		uniforms.u_outerGreen.value = rgb.g;
		uniforms.u_outerBlue.value = rgb.b;
	});
	outerFolder.add(params, 'outerRed', 0, 1, 0.01).name('外层红').onChange(function() {
		uniforms.u_outerRed.value = params.outerRed;
		params.outerColor = '#' + [params.outerRed, params.outerGreen, params.outerBlue].map(function(v) {
			return Math.round(v * 255).toString(16).padStart(2, '0');
		}).join('');
		gui.updateDisplay();
	});
	outerFolder.add(params, 'outerGreen', 0, 1, 0.01).name('外层绿').onChange(function() {
		uniforms.u_outerGreen.value = params.outerGreen;
		params.outerColor = '#' + [params.outerRed, params.outerGreen, params.outerBlue].map(function(v) {
			return Math.round(v * 255).toString(16).padStart(2, '0');
		}).join('');
		gui.updateDisplay();
	});
	outerFolder.add(params, 'outerBlue', 0, 1, 0.01).name('外层蓝').onChange(function() {
		uniforms.u_outerBlue.value = params.outerBlue;
		params.outerColor = '#' + [params.outerRed, params.outerGreen, params.outerBlue].map(function(v) {
			return Math.round(v * 255).toString(16).padStart(2, '0');
		}).join('');
		gui.updateDisplay();
	});
	outerFolder.add(params, 'rayVisible').name('射线显示').onChange(function(value) {
		outerLayer.rayLines.visible = params.outerVisible && value && params.rayStyle === '细线';
		outerLayer.rayCylinders.visible = params.outerVisible && value && params.rayStyle === '粗线';
	});
	outerFolder.add(params, 'rayLength', 0, 10, 0.1).name('射线长度').onChange(function(value) {
		uniforms.u_rayLength.value = value;
	});
	outerFolder.add(params, 'rayThreshold', 0, 1, 0.01).name('射线阈值').onChange(function(value) {
		uniforms.u_rayThreshold.value = value;
	});
	outerFolder.add(params, 'rayStyle', ['细线', '粗线']).name('射线样式').onChange(function(value) {
		const isThin = value === '细线';
		outerLayer.rayLines.visible = params.outerVisible && params.rayVisible && isThin;
		outerLayer.rayCylinders.visible = params.outerVisible && params.rayVisible && !isThin;
	});
	outerFolder.add(params, 'rayThickness', 0.01, 0.1, 0.001).name('射线粗细').onChange(function() {
		rebuildOuterLayer();
	});

	const audioFolder = gui.addFolder('音频');
	audioFolder.add(params, 'sensitivity', 1, 10, 0.1).name('灵敏度').onChange(function(value) {
		uniforms.u_sensitivity.value = value;
	});
	audioFolder.add(params, 'smoothing', 0, 0.95, 0.01).name('平滑度');

	const noiseFolder = gui.addFolder('噪声');
	noiseFolder.add(params, 'noiseSpeed', 1, 5, 0.1).name('速度');

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
