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

export function createMaterials(uniforms, vertexShader, fragmentShaderSimple, fragmentShaderPoints) {
	const meshMat = new THREE.ShaderMaterial({
		uniforms,
		vertexShader,
		fragmentShader: fragmentShaderSimple
	});

	const pointsMat = new THREE.ShaderMaterial({
		uniforms,
		vertexShader,
		fragmentShader: fragmentShaderPoints
	});

	return {meshMat, pointsMat};
}

export function createGeometry(params, meshMat, pointsMat) {
	const geo = new THREE.IcosahedronGeometry(4, params.detail);

	const mesh = new THREE.Mesh(geo, meshMat);
	mesh.material.wireframe = true;

	const points = new THREE.Points(geo, pointsMat);

	return {mesh, points, geo};
}

export function rebuildGeometry(mesh, points, detail) {
	mesh.geometry.dispose();
	mesh.geometry = new THREE.IcosahedronGeometry(4, detail);
	points.geometry = mesh.geometry;
}

export function setWireframe(mesh, points, enabled) {
	mesh.visible = enabled;
	points.visible = true;
}
