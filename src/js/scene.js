import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';

export function createRenderer() {
	const renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	document.body.appendChild(renderer.domElement);
	return renderer;
}

export function createScene() {
	return new THREE.Scene();
}

export function createCamera() {
	const camera = new THREE.PerspectiveCamera(
		45,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	camera.position.set(0, -2, 14);
	camera.lookAt(0, 0, 0);
	return camera;
}

export function createBloom(renderer, scene, camera, params) {
	const renderScene = new RenderPass(scene, camera);

	const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight));
	bloomPass.threshold = params.threshold;
	bloomPass.strength = params.strength;
	bloomPass.radius = params.radius;

	const bloomComposer = new EffectComposer(renderer);
	bloomComposer.addPass(renderScene);
	bloomComposer.addPass(bloomPass);

	const outputPass = new OutputPass();
	bloomComposer.addPass(outputPass);

	return {bloomComposer, bloomPass};
}

export function createLayer(params, uniforms, prefix, vertexShader, fragmentShader, fragmentShaderPoints) {
	const radius = params[prefix + 'Radius'];
	const detail = params[prefix + 'Detail'];

	const geo = new THREE.IcosahedronGeometry(radius, detail);

	const layerUniforms = {
		u_time: uniforms.u_time,
		u_frequency: uniforms.u_frequency,
		u_sensitivity: uniforms.u_sensitivity,
		u_pointSize: uniforms[prefix + 'PointSize'],
		u_audioEnabled: uniforms[prefix + 'AudioEnabled'],
		u_red: uniforms[prefix + 'Red'],
		u_green: uniforms[prefix + 'Green'],
		u_blue: uniforms[prefix + 'Blue']
	};

	const meshMat = new THREE.ShaderMaterial({
		uniforms: layerUniforms,
		vertexShader,
		fragmentShader,
		wireframe: true
	});

	const pointsMat = new THREE.ShaderMaterial({
		uniforms: layerUniforms,
		vertexShader,
		fragmentShader: fragmentShaderPoints
	});

	const mesh = new THREE.Mesh(geo, meshMat);
	const points = new THREE.Points(geo, pointsMat);

	mesh.visible = params[prefix + 'Visible'] && params[prefix + 'Wireframe'];
	points.visible = params[prefix + 'Visible'];

	return {mesh, points, geo, meshMat, pointsMat};
}

export function rebuildLayer(layer, params, prefix) {
	layer.mesh.geometry.dispose();
	layer.mesh.geometry = new THREE.IcosahedronGeometry(
		params[prefix + 'Radius'],
		params[prefix + 'Detail']
	);
	layer.points.geometry = layer.mesh.geometry;
	layer.geo = layer.mesh.geometry;
}

export function createInnerGlow(params, uniforms, innerGlowVertexShader, innerGlowFragmentShader) {
	const geo = new THREE.SphereGeometry(params.innerRadius * 0.95, 32, 32);
	const mat = new THREE.ShaderMaterial({
		uniforms: {
			u_glowColor: uniforms.u_glowColor,
			u_glowIntensity: uniforms.u_glowIntensity
		},
		vertexShader: innerGlowVertexShader,
		fragmentShader: innerGlowFragmentShader,
		transparent: true,
		side: THREE.DoubleSide,
		depthWrite: false,
		blending: THREE.AdditiveBlending
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.visible = params.innerGlow;
	return {mesh, mat};
}

export function createCircularBars(params) {
	const barCount = params.circularBarCount;
	const radius = params.circularBarRadius;
	const barWidth = 0.03;
	const barDepth = 0.03;

	const barGeo = new THREE.BoxGeometry(barWidth, 1, barDepth);
	barGeo.translate(0, 0.5, 0);

	const barMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color(params.circularBarColor)
	});

	const group = new THREE.Group();

	for (let i = 0; i < barCount; i++) {
		const bar = new THREE.Mesh(barGeo, barMat);
		const angle = (i / barCount) * Math.PI * 2;
		bar.position.x = Math.cos(angle) * radius;
		bar.position.z = Math.sin(angle) * radius;
		bar.position.y = 0;
		bar.lookAt(0, 0, 0);
		bar.scale.y = 0.01;
		group.add(bar);
	}

	group.visible = params.circularBars;
	return group;
}

export function updateCircularBars(group, analyser, params) {
	if (!group.visible) return;

	const freqData = analyser.getFrequencyData();
	const barCount = group.children.length;
	const maxBarHeight = params.circularBarHeight;

	for (let i = 0; i < barCount; i++) {
		const freqIndex = Math.floor((i / barCount) * freqData.length * 0.75);
		const value = freqData[freqIndex] / 255;
		const targetHeight = value * maxBarHeight + 0.01;
		const bar = group.children[i];
		bar.scale.y += (targetHeight - bar.scale.y) * 0.3;
	}
}

export function createRotationState() {
	return {
		currentAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
		targetAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
		currentSpeed: (Math.random() - 0.5) * 2,
		targetSpeed: (Math.random() - 0.5) * 2,
		timer: Math.random() * 3 + 1
	};
}

export function updateRotation(state, delta, baseSpeed, interval, smoothness) {
	state.timer -= delta;
	if (state.timer <= 0) {
		state.targetAxis.set(
			Math.random() - 0.5,
			Math.random() - 0.5,
			Math.random() - 0.5
		).normalize();
		state.targetSpeed = (Math.random() - 0.5) * 2 * baseSpeed;
		state.timer = interval + Math.random() * 2;
	}

	state.currentAxis.lerp(state.targetAxis, delta * smoothness * 2);
	state.currentAxis.normalize();
	state.currentSpeed += (state.targetSpeed - state.currentSpeed) * delta * smoothness * 2;

	return state.currentSpeed * delta;
}
