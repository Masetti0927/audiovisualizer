import * as THREE from 'three';
import {vertexShader, fragmentShader, fragmentShaderPoints, innerGlowVertexShader, innerGlowFragmentShader, rayVertexShader, rayFragmentShader} from './shaders.js';
import {createRenderer, createScene, createCamera, createBloom, createLayer, rebuildLayer, createInnerGlow, createRays, rebuildRays, createRotationState, updateRotation} from './scene.js';
import {createAudioSystem} from './audio.js';
import {createGUI} from './gui.js';

const params = {
	innerVisible: true,
	innerRadius: 3,
	innerDetail: 30,
	innerWireframe: true,
	innerPointSize: 3.0,
	innerScale: 1.0,
	innerColor: '#4488ff',
	innerRed: 0.27,
	innerGreen: 0.53,
	innerBlue: 1.0,
	innerGlow: true,
	innerGlowIntensity: 1.0,

	middleVisible: true,
	middleRadius: 4,
	middleDetail: 30,
	middleWireframe: true,
	middlePointSize: 3.0,
	middleScale: 1.0,
	middleColor: '#ffffff',
	middleRed: 1.0,
	middleGreen: 1.0,
	middleBlue: 1.0,

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
	outerRays: true,
	outerRayLength: 2.0,
	outerRayThreshold: 0.3,
	outerRayStyle: '细线',
	outerRayThickness: 0.02,

	rotationSpeed: 0.5,
	rotationInterval: 3,
	rotationSmoothness: 0.5,

	sensitivity: 3,
	smoothing: 0.5,
	noiseSpeed: 1.0,
	systemPlaythrough: false,

	threshold: 0.5,
	strength: 0.1,
	radius: 0.8
};

const renderer = createRenderer();
const scene = createScene();
const camera = createCamera();

const {bloomComposer, bloomPass} = createBloom(renderer, scene, camera, params);

const uniforms = {
	u_time: {value: 0.0},
	u_frequency: {value: 0.0},
	u_sensitivity: {value: params.sensitivity},
	innerPointSize: {value: params.innerPointSize},
	innerRed: {value: params.innerRed},
	innerGreen: {value: params.innerGreen},
	innerBlue: {value: params.innerBlue},
	middlePointSize: {value: params.middlePointSize},
	middleRed: {value: params.middleRed},
	middleGreen: {value: params.middleGreen},
	middleBlue: {value: params.middleBlue},
	outerPointSize: {value: params.outerPointSize},
	outerRed: {value: params.outerRed},
	outerGreen: {value: params.outerGreen},
	outerBlue: {value: params.outerBlue},
	u_glowColor: {value: new THREE.Color(params.innerGlowColor)},
	u_glowIntensity: {value: params.innerGlowIntensity},
	u_rayLength: {value: params.outerRayLength},
	u_rayThreshold: {value: params.outerRayThreshold}
};

const innerLayer = createLayer(params, uniforms, 'inner', vertexShader, fragmentShader, fragmentShaderPoints);
scene.add(innerLayer.mesh);
scene.add(innerLayer.points);

const innerGlow = createInnerGlow(params, uniforms, innerGlowVertexShader, innerGlowFragmentShader);
scene.add(innerGlow.mesh);

const middleLayer = createLayer(params, uniforms, 'middle', vertexShader, fragmentShader, fragmentShaderPoints);
scene.add(middleLayer.mesh);
scene.add(middleLayer.points);

const outerLayer = createLayer(params, uniforms, 'outer', vertexShader, fragmentShader, fragmentShaderPoints);
scene.add(outerLayer.mesh);
scene.add(outerLayer.points);

const rays = createRays(params, uniforms, rayVertexShader, rayFragmentShader);
scene.add(rays.rayLines);
scene.add(rays.rayCylinders);

const innerRotation = createRotationState();
const middleRotation = createRotationState();
const outerRotation = createRotationState();

const listener = new THREE.AudioListener();
camera.add(listener);

const audio = createAudioSystem(listener, params);
audio.loadBuiltin();

const gui = createGUI(params, uniforms, {
	innerLayer,
	middleLayer,
	outerLayer,
	innerGlow,
	rays,
	bloomPass,
	listener,
	audio,
	rebuildLayer,
	rebuildRays: function() {
		scene.remove(rays.rayLines);
		scene.remove(rays.rayCylinders);
		rebuildRays(rays, params, uniforms, rayVertexShader, rayFragmentShader);
		scene.add(rays.rayLines);
		scene.add(rays.rayCylinders);
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

	const innerAngle = updateRotation(innerRotation, delta, params.rotationSpeed, params.rotationInterval, params.rotationSmoothness);
	innerLayer.mesh.rotateOnAxis(innerRotation.currentAxis, innerAngle);
	innerLayer.points.rotateOnAxis(innerRotation.currentAxis, innerAngle);
	innerGlow.mesh.rotateOnAxis(innerRotation.currentAxis, innerAngle);

	const middleAngle = updateRotation(middleRotation, delta, params.rotationSpeed, params.rotationInterval, params.rotationSmoothness);
	middleLayer.mesh.rotateOnAxis(middleRotation.currentAxis, middleAngle);
	middleLayer.points.rotateOnAxis(middleRotation.currentAxis, middleAngle);

	const outerAngle = updateRotation(outerRotation, delta, params.rotationSpeed, params.rotationInterval, params.rotationSmoothness);
	outerLayer.mesh.rotateOnAxis(outerRotation.currentAxis, outerAngle);
	outerLayer.points.rotateOnAxis(outerRotation.currentAxis, outerAngle);
	rays.rayLines.rotateOnAxis(outerRotation.currentAxis, outerAngle);
	rays.rayCylinders.rotateOnAxis(outerRotation.currentAxis, outerAngle);

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
