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

	const layersFolder = gui.addFolder('Layers');

	layersFolder.add(params, 'innerGlowVisible').name('内层光球').onChange(function(value) {
		innerSphere.mesh.visible = value;
	});
	layersFolder.add(params, 'innerGlowRadius', 1, 5, 0.1).name('光球半径').onChange(function(value) {
		innerSphere.mesh.geometry.dispose();
		innerSphere.mesh.geometry = new THREE.SphereGeometry(value, 32, 32);
	});
	layersFolder.add(params, 'innerGlowIntensity', 0, 2, 0.1).name('光球强度').onChange(function(value) {
		uniforms.u_glowIntensity.value = value;
	});
	layersFolder.addColor(params, 'innerGlowColor').name('光球颜色').onChange(function(value) {
		uniforms.u_glowColor.value.set(value);
	});

	layersFolder.add(params, 'outerVisible').name('外层显示').onChange(function(value) {
		outerLayer.outerMesh.visible = value && params.outerWireframe;
		outerLayer.outerPoints.visible = value;
		outerLayer.rayLines.visible = value && params.rayVisible && params.rayStyle === 'thin';
		outerLayer.rayCylinders.visible = value && params.rayVisible && params.rayStyle === 'thick';
	});
	layersFolder.add(params, 'outerRadius', 4.5, 8, 0.1).name('外层半径').onChange(function() {
		rebuildOuterLayer();
	});
	layersFolder.add(params, 'outerDetail', 1, 50, 1).name('外层细分').onChange(function() {
		rebuildOuterLayer();
	});
	layersFolder.add(params, 'outerWireframe').name('外层线框').onChange(function(value) {
		outerLayer.outerMesh.visible = params.outerVisible && value;
	});
	layersFolder.addColor(params, 'outerColor').name('外层颜色').onChange(function(value) {
		const rgb = hexToRgb(value);
		outerLayer.outerMeshMat.uniforms.u_red.value = rgb.r;
		outerLayer.outerMeshMat.uniforms.u_green.value = rgb.g;
		outerLayer.outerMeshMat.uniforms.u_blue.value = rgb.b;
		outerLayer.outerPointsMat.uniforms.u_red.value = rgb.r;
		outerLayer.outerPointsMat.uniforms.u_green.value = rgb.g;
		outerLayer.outerPointsMat.uniforms.u_blue.value = rgb.b;
	});

	layersFolder.add(params, 'rayVisible').name('射线显示').onChange(function(value) {
		outerLayer.rayLines.visible = params.outerVisible && value && params.rayStyle === 'thin';
		outerLayer.rayCylinders.visible = params.outerVisible && value && params.rayStyle === 'thick';
	});
	layersFolder.add(params, 'rayLength', 0, 10, 0.1).name('射线长度').onChange(function(value) {
		uniforms.u_rayLength.value = value;
	});
	layersFolder.add(params, 'rayStyle', ['thin', 'thick']).name('射线样式').onChange(function(value) {
		outerLayer.rayLines.visible = params.outerVisible && params.rayVisible && value === 'thin';
		outerLayer.rayCylinders.visible = params.outerVisible && params.rayVisible && value === 'thick';
	});
	layersFolder.add(params, 'rayThickness', 0.01, 0.1, 0.001).name('射线粗细').onChange(function() {
		rebuildOuterLayer();
	});

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
