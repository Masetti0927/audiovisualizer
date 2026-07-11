import * as THREE from 'three';
import {vertexShader, fragmentShader, fragmentShaderPoints, innerGlowVertexShader, innerGlowFragmentShader} from './shaders.js';
import {createRenderer, createScene, createCamera, createBloom, createLayer, rebuildLayer, createInnerGlow, createCircularBars, updateCircularBars, createRotationState, updateRotation} from './scene.js';
import {createAudioSystem} from './audio.js';
import {createGUI} from './gui.js';

const params = {
	innerVisible: true,
	innerRadius: 3,
	innerDetail: 30,
	innerWireframe: true,
	innerPointSize: 3.0,
	innerScale: 1.0,
	innerColor: '#3366ff',
	innerRed: 0.2,
	innerGreen: 0.4,
	innerBlue: 1.0,
	innerGlow: true,
	innerGlowIntensity: 1.0,
	innerAudioEnabled: true,

	middleVisible: true,
	middleRadius: 4,
	middleDetail: 30,
	middleWireframe: true,
	middlePointSize: 3.0,
	middleScale: 1.0,
	middleColor: '#00eeff',
	middleRed: 0.0,
	middleGreen: 0.93,
	middleBlue: 1.0,
	middleAudioEnabled: true,

	outerVisible: true,
	outerRadius: 5,
	outerDetail: 30,
	outerWireframe: true,
	outerPointSize: 3.0,
	outerScale: 1.0,
	outerColor: '#88ddff',
	outerRed: 0.53,
	outerGreen: 0.87,
	outerBlue: 1.0,
	outerAudioEnabled: false,

	circularBars: true,
	circularBarCount: 128,
	circularBarRadius: 6.5,
	circularBarHeight: 2.0,
	circularBarColor: '#00eeff',

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
	innerAudioEnabled: {value: params.innerAudioEnabled ? 1.0 : 0.0},
	innerRed: {value: params.innerRed},
	innerGreen: {value: params.innerGreen},
	innerBlue: {value: params.innerBlue},
	middlePointSize: {value: params.middlePointSize},
	middleAudioEnabled: {value: params.middleAudioEnabled ? 1.0 : 0.0},
	middleRed: {value: params.middleRed},
	middleGreen: {value: params.middleGreen},
	middleBlue: {value: params.middleBlue},
	outerPointSize: {value: params.outerPointSize},
	outerAudioEnabled: {value: params.outerAudioEnabled ? 1.0 : 0.0},
	outerRed: {value: params.outerRed},
	outerGreen: {value: params.outerGreen},
	outerBlue: {value: params.outerBlue},
	u_glowColor: {value: new THREE.Color(params.innerGlowColor)},
	u_glowIntensity: {value: params.innerGlowIntensity}
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

const circularBars = createCircularBars(params);
scene.add(circularBars);

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
	circularBars,
	bloomPass,
	listener,
	audio,
	rebuildLayer,
	rebuildCircularBars: function() {
		scene.remove(circularBars);
		const newBars = createCircularBars(params);
		scene.add(newBars);
		return newBars;
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

	updateCircularBars(circularBars, audio.analyser, params);

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
