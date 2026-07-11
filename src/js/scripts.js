import * as THREE from 'three';
import {GUI} from 'lil-gui';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';

const vertexShader = `
  uniform float u_time;

  vec3 mod289(vec3 x)
  {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 mod289(vec4 x)
  {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 permute(vec4 x)
  {
    return mod289(((x*34.0)+10.0)*x);
  }
  
  vec4 taylorInvSqrt(vec4 r)
  {
    return 1.79284291400159 - 0.85373472095314 * r;
  }
  
  vec3 fade(vec3 t) {
    return t*t*t*(t*(t*6.0-15.0)+10.0);
  }

  float pnoise(vec3 P, vec3 rep)
  {
    vec3 Pi0 = mod(floor(P), rep);
    vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
    Pi0 = mod289(Pi0);
    Pi1 = mod289(Pi1);
    vec3 Pf0 = fract(P);
    vec3 Pf1 = Pf0 - vec3(1.0);
    vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
    vec4 iy = vec4(Pi0.yy, Pi1.yy);
    vec4 iz0 = Pi0.zzzz;
    vec4 iz1 = Pi1.zzzz;

    vec4 ixy = permute(permute(ix) + iy);
    vec4 ixy0 = permute(ixy + iz0);
    vec4 ixy1 = permute(ixy + iz1);

    vec4 gx0 = ixy0 * (1.0 / 7.0);
    vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
    gx0 = fract(gx0);
    vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
    vec4 sz0 = step(gz0, vec4(0.0));
    gx0 -= sz0 * (step(0.0, gx0) - 0.5);
    gy0 -= sz0 * (step(0.0, gy0) - 0.5);

    vec4 gx1 = ixy1 * (1.0 / 7.0);
    vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
    gx1 = fract(gx1);
    vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
    vec4 sz1 = step(gz1, vec4(0.0));
    gx1 -= sz1 * (step(0.0, gx1) - 0.5);
    gy1 -= sz1 * (step(0.0, gy1) - 0.5);

    vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
    vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
    vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
    vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
    vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
    vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
    vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
    vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

    vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
    g000 *= norm0.x;
    g010 *= norm0.y;
    g100 *= norm0.z;
    g110 *= norm0.w;
    vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
    g001 *= norm1.x;
    g011 *= norm1.y;
    g101 *= norm1.z;
    g111 *= norm1.w;

    float n000 = dot(g000, Pf0);
    float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
    float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
    float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
    float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
    float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
    float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
    float n111 = dot(g111, Pf1);

    vec3 fade_xyz = fade(Pf0);
    vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
    vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
    float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
    return 2.2 * n_xyz;
  }

  uniform float u_frequency;
  uniform float u_sensitivity;
  uniform float u_pointSize;

  void main() {
      float noise = 3.0 * pnoise(position + u_time, vec3(10.0));
      float displacement = (u_frequency * u_sensitivity / 100.) * (noise / 10.);
      vec3 newPosition = position + normal * displacement;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      gl_PointSize = u_pointSize;
  }
`;

const fragmentShaderSimple = `
  uniform float u_red;
  uniform float u_blue;
  uniform float u_green;
  void main() {
      gl_FragColor = vec4(vec3(u_red, u_green, u_blue), 1. );
  }
`;

const fragmentShaderPoints = `
  uniform float u_red;
  uniform float u_blue;
  uniform float u_green;
  void main() {
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;
      gl_FragColor = vec4(vec3(u_red, u_green, u_blue), 1. );
  }
`;

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	45,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);

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
	sensitivity: 3,
	smoothing: 0.5,
	noiseSpeed: 1.0
}

renderer.outputColorSpace = THREE.SRGBColorSpace;

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

camera.position.set(0, -2, 14);
camera.lookAt(0, 0, 0);

const uniforms = {
	u_time: {value: 0.0},
	u_frequency: {value: 0.0},
	u_sensitivity: {value: params.sensitivity},
	u_pointSize: {value: params.pointSize},
	u_red: {value: 1.0},
	u_green: {value: 1.0},
	u_blue: {value: 1.0}
}

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

const geo = new THREE.IcosahedronGeometry(4, params.detail);

const mesh = new THREE.Mesh(geo, meshMat);
mesh.material.wireframe = true;
scene.add(mesh);

const points = new THREE.Points(geo, pointsMat);
points.visible = false;
scene.add(points);

function rebuildGeometry(detail) {
	mesh.geometry.dispose();
	mesh.geometry = new THREE.IcosahedronGeometry(4, detail);
	points.geometry = mesh.geometry;
}

function setWireframe(enabled) {
	mesh.visible = enabled;
	points.visible = true;
}

function hexToRgb(hex) {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	return {r, g, b};
}

function rgbToHex(r, g, b) {
	return '#' + [r, g, b].map(function(v) {
		return Math.round(v * 255).toString(16).padStart(2, '0');
	}).join('');
}

function syncColorFromRgb() {
	params.color = rgbToHex(params.red, params.green, params.blue);
	uniforms.u_red.value = params.red;
	uniforms.u_green.value = params.green;
	uniforms.u_blue.value = params.blue;
	gui.updateDisplay();
}

const listener = new THREE.AudioListener();
camera.add(listener);

const sound = new THREE.Audio(listener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load('./assets/Beats.mp3', function(buffer) {
	sound.setBuffer(buffer);
	window.addEventListener('click', function() {
		sound.play();
	});
});

const analyser = new THREE.AudioAnalyser(sound, 32);

let smoothedFrequency = 0;
let elapsedTime = 0;
let lastTime = performance.now();

const gui = new GUI();

const geometryFolder = gui.addFolder('Geometry');
geometryFolder.add(params, 'detail', 1, 50, 1).name('细分级别').onChange(function(value) {
	rebuildGeometry(value);
});
geometryFolder.add(params, 'wireframe').name('线框显示').onChange(function(value) {
	setWireframe(value);
});
geometryFolder.add(params, 'pointSize', 1, 10, 0.5).name('点大小').onChange(function(value) {
	uniforms.u_pointSize.value = value;
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
	syncColorFromRgb();
});
colorsFolder.add(params, 'green', 0, 1, 0.01).name('G').onChange(function() {
	syncColorFromRgb();
});
colorsFolder.add(params, 'blue', 0, 1, 0.01).name('B').onChange(function() {
	syncColorFromRgb();
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

let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', function(e) {
	let windowHalfX = window.innerWidth / 2;
	let windowHalfY = window.innerHeight / 2;
	mouseX = (e.clientX - windowHalfX) / 100;
	mouseY = (e.clientY - windowHalfY) / 100;
});

function animate() {
	const now = performance.now();
	const delta = (now - lastTime) / 1000;
	lastTime = now;

	elapsedTime += delta * params.noiseSpeed;

	camera.position.x += (mouseX - camera.position.x) * .05;
	camera.position.y += (-mouseY - camera.position.y) * 0.5;
	camera.lookAt(scene.position);

	uniforms.u_time.value = elapsedTime;

	const rawFrequency = analyser.getAverageFrequency();
	smoothedFrequency += (rawFrequency - smoothedFrequency) * (1 - params.smoothing);
	uniforms.u_frequency.value = smoothedFrequency;

	bloomComposer.render();
	requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', function() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	bloomComposer.setSize(window.innerWidth, window.innerHeight);
});
