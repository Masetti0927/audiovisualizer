import * as THREE from 'three';
import {vertexShader, fragmentShaderSimple, fragmentShaderPoints} from './shaders.js';
import {createRenderer, createScene, createCamera, createBloom, createMaterials, createGeometry, rebuildGeometry, setWireframe} from './scene.js';
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
	systemPlaythrough: false
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
	u_blue: {value: 1.0}
};

const {meshMat, pointsMat} = createMaterials(uniforms, vertexShader, fragmentShaderSimple, fragmentShaderPoints);

const {mesh, points} = createGeometry(params, meshMat, pointsMat);
scene.add(mesh);
scene.add(points);
setWireframe(mesh, points, params.wireframe);

const listener = new THREE.AudioListener();
camera.add(listener);

const audio = createAudioSystem(listener, params);

const gui = createGUI(params, uniforms, {
	mesh,
	points,
	bloomPass,
	listener,
	audio,
	rebuildGeometry,
	setWireframe
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
