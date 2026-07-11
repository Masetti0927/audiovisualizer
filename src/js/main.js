import * as THREE from 'three';
import {vertexShader, fragmentShaderSimple, fragmentShaderPoints, innerGlowVertexShader, innerGlowFragmentShader, outerVertexShader, outerFragmentShader, outerWireframeFragmentShader, rayVertexShader, rayFragmentShader} from './shaders.js';
import {createRenderer, createScene, createCamera, createBloom, createMaterials, createGeometry, rebuildGeometry, setWireframe, createInnerSphere, createOuterLayer, rebuildOuterLayer} from './scene.js';
import {createAudioSystem} from './audio.js';
import {createGUI} from './gui.js';

const params = {
	red: 1.0,
	green: 1.0,
	blue: 1.0,
	color: '#ffffff',
	threshold: 0.5,
	strength: 0.1,
	radius: 0.8,
	detail: 30,
	wireframe: true,
	pointSize: 3.0,
	scale: 1.0,
	sensitivity: 3,
	smoothing: 0.5,
	noiseSpeed: 1.0,
	systemPlaythrough: false,
	innerGlowVisible: true,
	innerGlowRadius: 3,
	innerGlowIntensity: 1.0,
	innerGlowColor: '#4488ff',
	outerVisible: true,
	outerRadius: 5,
	outerDetail: 30,
	outerWireframe: true,
	outerPointSize: 3.0,
	outerScale: 1.0,
	outerColor: '#ff4488',
	outerRed: 1.0,
	outerGreen: 0.27,
	outerBlue: 0.53,
	rayVisible: true,
	rayLength: 2.0,
	rayThreshold: 0.3,
	rayStyle: '细线',
	rayThickness: 0.02,
	rotationSpeed: 0.5
};

const renderer = createRenderer();
const scene = createScene();
const camera = createCamera();

const {bloomComposer, bloomPass} = createBloom(renderer, scene, camera, params);

const uniforms = {
	u_time: {value: 0.0},
	u_frequency: {value: 0.0},
	u_sensitivity: {value: params.sensitivity},
	u_pointSize: {value: params.pointSize},
	u_red: {value: 1.0},
	u_green: {value: 1.0},
	u_blue: {value: 1.0},
	u_outerRed: {value: params.outerRed},
	u_outerGreen: {value: params.outerGreen},
	u_outerBlue: {value: params.outerBlue},
	u_outerPointSize: {value: params.outerPointSize},
	u_glowColor: {value: new THREE.Color(params.innerGlowColor)},
	u_glowIntensity: {value: params.innerGlowIntensity},
	u_rayLength: {value: params.rayLength},
	u_rayThreshold: {value: params.rayThreshold}
};

const {meshMat, pointsMat} = createMaterials(uniforms, vertexShader, fragmentShaderSimple, fragmentShaderPoints);

const {mesh, points} = createGeometry(params, meshMat, pointsMat);
scene.add(mesh);
scene.add(points);
setWireframe(mesh, points, params.wireframe);

const innerSphere = createInnerSphere(params, uniforms, innerGlowVertexShader, innerGlowFragmentShader);
scene.add(innerSphere.mesh);

const outerLayer = createOuterLayer(params, uniforms, outerVertexShader, outerWireframeFragmentShader, outerFragmentShader, rayVertexShader, rayFragmentShader);
scene.add(outerLayer.outerMesh);
scene.add(outerLayer.outerPoints);
scene.add(outerLayer.rayLines);
scene.add(outerLayer.rayCylinders);

const innerRotationAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
const middleRotationAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
const outerRotationAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

const listener = new THREE.AudioListener();
camera.add(listener);

const audio = createAudioSystem(listener, params);
audio.loadBuiltin();

const gui = createGUI(params, uniforms, {
	mesh,
	points,
	bloomPass,
	listener,
	audio,
	rebuildGeometry,
	setWireframe,
	innerSphere,
	outerLayer,
	rebuildOuterLayer: function() {
		scene.remove(outerLayer.rayLines);
		scene.remove(outerLayer.rayCylinders);
		rebuildOuterLayer(outerLayer, params, uniforms, rayVertexShader, rayFragmentShader);
		scene.add(outerLayer.rayLines);
		scene.add(outerLayer.rayCylinders);
	}
});

let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', function(e) {
	let windowHalfX = window.innerWidth / 2;
	let windowHalfY = window.innerHeight / 2;
	mouseX = (e.clientX - windowHalfX) / 100;
	mouseY = (e.clientY - windowHalfY) / 100;
});

let elapsedTime = 0;
let lastTime = performance.now();

function animate() {
	const now = performance.now();
	const delta = (now - lastTime) / 1000;
	lastTime = now;

	elapsedTime += delta * params.noiseSpeed;

	camera.position.x += (mouseX - camera.position.x) * .05;
	camera.position.y += (-mouseY - camera.position.y) * 0.5;
	camera.lookAt(scene.position);

	uniforms.u_time.value = elapsedTime;
	uniforms.u_frequency.value = audio.getFrequency();

	const angle = delta * params.rotationSpeed;
	mesh.rotateOnAxis(middleRotationAxis, angle);
	points.rotateOnAxis(middleRotationAxis, angle);
	outerLayer.outerMesh.rotateOnAxis(outerRotationAxis, angle);
	outerLayer.outerPoints.rotateOnAxis(outerRotationAxis, angle);
	outerLayer.rayLines.rotateOnAxis(outerRotationAxis, angle);
	outerLayer.rayCylinders.rotateOnAxis(outerRotationAxis, angle);
	innerSphere.mesh.rotateOnAxis(innerRotationAxis, angle);

	bloomComposer.render();
	requestAnimationFrame(animate);
}

window.addEventListener('resize', function() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	bloomComposer.setSize(window.innerWidth, window.innerHeight);
});

animate();
