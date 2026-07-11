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

export function createInnerSphere(params, uniforms, innerGlowVertexShader, innerGlowFragmentShader) {
	const geo = new THREE.SphereGeometry(params.innerGlowRadius, 32, 32);
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
	mesh.visible = params.innerGlowVisible;
	return {mesh, mat};
}

export function createOuterLayer(params, uniforms, outerVertexShader, outerWireframeFragmentShader, outerFragmentShader, rayVertexShader, rayFragmentShader) {
	const outerGeo = new THREE.IcosahedronGeometry(params.outerRadius, params.outerDetail);

	const outerUniforms = {
		u_time: uniforms.u_time,
		u_frequency: uniforms.u_frequency,
		u_sensitivity: uniforms.u_sensitivity,
		u_outerPointSize: uniforms.u_outerPointSize,
		u_outerRed: uniforms.u_outerRed,
		u_outerGreen: uniforms.u_outerGreen,
		u_outerBlue: uniforms.u_outerBlue
	};

	const outerMeshMat = new THREE.ShaderMaterial({
		uniforms: outerUniforms,
		vertexShader: outerVertexShader,
		fragmentShader: outerWireframeFragmentShader,
		wireframe: true
	});
	const outerMesh = new THREE.Mesh(outerGeo, outerMeshMat);
	outerMesh.visible = params.outerVisible && params.outerWireframe;

	const outerPointsMat = new THREE.ShaderMaterial({
		uniforms: outerUniforms,
		vertexShader: outerVertexShader,
		fragmentShader: outerFragmentShader
	});
	const outerPoints = new THREE.Points(outerGeo, outerPointsMat);
	outerPoints.visible = params.outerVisible;

	const {rayLines, rayCylinders} = buildRayGeometry(outerGeo, uniforms, rayVertexShader, rayFragmentShader, params);

	return {
		outerMesh, outerPoints, outerGeo,
		outerMeshMat, outerPointsMat,
		rayLines, rayCylinders
	};
}

function buildRayGeometry(geo, uniforms, rayVertexShader, rayFragmentShader, params) {
	const positions = geo.attributes.position.array;
	const normals = geo.attributes.normal.array;
	const vertexCount = positions.length / 3;

	const rayPositions = [];
	const rayNormals = [];
	const rayTips = [];
	const rayDirs = [];

	for (let i = 0; i < vertexCount; i++) {
		const px = positions[i * 3];
		const py = positions[i * 3 + 1];
		const pz = positions[i * 3 + 2];
		const nx = normals[i * 3];
		const ny = normals[i * 3 + 1];
		const nz = normals[i * 3 + 2];

		rayPositions.push(px, py, pz);
		rayNormals.push(nx, ny, nz);
		rayTips.push(0.0);
		rayDirs.push(nx, ny, nz);

		rayPositions.push(px, py, pz);
		rayNormals.push(nx, ny, nz);
		rayTips.push(1.0);
		rayDirs.push(nx, ny, nz);
	}

	const rayGeo = new THREE.BufferGeometry();
	rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(rayPositions, 3));
	rayGeo.setAttribute('normal', new THREE.Float32BufferAttribute(rayNormals, 3));
	rayGeo.setAttribute('a_isTip', new THREE.Float32BufferAttribute(rayTips, 1));
	rayGeo.setAttribute('a_rayDir', new THREE.Float32BufferAttribute(rayDirs, 3));

	const rayUniforms = {
		u_outerRed: uniforms.u_outerRed,
		u_outerGreen: uniforms.u_outerGreen,
		u_outerBlue: uniforms.u_outerBlue,
		u_time: uniforms.u_time,
		u_frequency: uniforms.u_frequency,
		u_sensitivity: uniforms.u_sensitivity,
		u_rayLength: uniforms.u_rayLength,
		u_rayThreshold: uniforms.u_rayThreshold
	};

	const rayMat = new THREE.ShaderMaterial({
		uniforms: rayUniforms,
		vertexShader: rayVertexShader,
		fragmentShader: rayFragmentShader,
		transparent: true
	});

	const rayLines = new THREE.LineSegments(rayGeo, rayMat);
	rayLines.visible = params.rayVisible && params.rayStyle === '细线';

	const rayCylinders = createThickRays(geo, uniforms, rayVertexShader, rayFragmentShader, params);
	rayCylinders.visible = params.rayVisible && params.rayStyle === '粗线';

	return {rayLines, rayCylinders};
}

function createThickRays(geo, uniforms, rayVertexShader, rayFragmentShader, params) {
	const positions = geo.attributes.position.array;
	const normals = geo.attributes.normal.array;
	const vertexCount = positions.length / 3;

	const cylinderGeo = new THREE.CylinderGeometry(params.rayThickness, params.rayThickness, 1, 6);
	cylinderGeo.translate(0, 0.5, 0);
	cylinderGeo.rotateX(Math.PI / 2);

	const instancedGeo = new THREE.InstancedBufferGeometry();
	instancedGeo.index = cylinderGeo.index;
	instancedGeo.attributes.position = cylinderGeo.attributes.position;
	instancedGeo.attributes.normal = cylinderGeo.attributes.normal;

	const offsets = new Float32Array(vertexCount * 3);
	const directions = new Float32Array(vertexCount * 3);

	for (let i = 0; i < vertexCount; i++) {
		offsets[i * 3] = positions[i * 3];
		offsets[i * 3 + 1] = positions[i * 3 + 1];
		offsets[i * 3 + 2] = positions[i * 3 + 2];
		directions[i * 3] = normals[i * 3];
		directions[i * 3 + 1] = normals[i * 3 + 1];
		directions[i * 3 + 2] = normals[i * 3 + 2];
	}

	instancedGeo.setAttribute('a_offset', new THREE.InstancedBufferAttribute(offsets, 3));
	instancedGeo.setAttribute('a_direction', new THREE.InstancedBufferAttribute(directions, 3));

	const thickRayVertexShader = `
		attribute vec3 a_offset;
		attribute vec3 a_direction;
		uniform float u_time;
		uniform float u_frequency;
		uniform float u_sensitivity;
		uniform float u_rayLength;
		uniform float u_rayThreshold;
		varying vec3 vNormal;

		vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
		vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
		vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
		vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
		vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

		float pnoise(vec3 P, vec3 rep) {
			vec3 Pi0 = mod(floor(P), rep);
			vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
			Pi0 = mod289(Pi0); Pi1 = mod289(Pi1);
			vec3 Pf0 = fract(P); vec3 Pf1 = Pf0 - vec3(1.0);
			vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
			vec4 iy = vec4(Pi0.yy, Pi1.yy);
			vec4 iz0 = Pi0.zzzz; vec4 iz1 = Pi1.zzzz;
			vec4 ixy = permute(permute(ix) + iy);
			vec4 ixy0 = permute(ixy + iz0); vec4 ixy1 = permute(ixy + iz1);
			vec4 gx0 = ixy0 * (1.0 / 7.0);
			vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
			gx0 = fract(gx0);
			vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
			vec4 sz0 = step(gz0, vec4(0.0));
			gx0 -= sz0 * (step(0.0, gx0) - 0.5); gy0 -= sz0 * (step(0.0, gy0) - 0.5);
			vec4 gx1 = ixy1 * (1.0 / 7.0);
			vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
			gx1 = fract(gx1);
			vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
			vec4 sz1 = step(gz1, vec4(0.0));
			gx1 -= sz1 * (step(0.0, gx1) - 0.5); gy1 -= sz1 * (step(0.0, gy1) - 0.5);
			vec3 g000 = vec3(gx0.x,gy0.x,gz0.x); vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
			vec3 g010 = vec3(gx0.z,gy0.z,gz0.z); vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
			vec3 g001 = vec3(gx1.x,gy1.x,gz1.x); vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
			vec3 g011 = vec3(gx1.z,gy1.z,gz1.z); vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
			vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
			g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
			vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
			g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
			float n000 = dot(g000, Pf0); float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
			float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z)); float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
			float n001 = dot(g001, vec3(Pf0.xy, Pf1.z)); float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
			float n011 = dot(g011, vec3(Pf0.x, Pf1.yz)); float n111 = dot(g111, Pf1);
			vec3 fade_xyz = fade(Pf0);
			vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
			vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
			return 2.2 * mix(n_yz.x, n_yz.y, fade_xyz.x);
		}

		void main() {
			float noise = 3.0 * pnoise(a_offset + u_time, vec3(10.0));
			float displacement = (u_frequency * u_sensitivity / 100.) * (noise / 10.);
			float activated = step(u_rayThreshold, abs(displacement));
			float len = displacement * u_rayLength * 10.0 * activated;
			len = max(len, 0.001);
			vec3 dir = normalize(a_direction);
			vec3 up = vec3(0.0, 1.0, 0.0);
			if (abs(dot(dir, up)) > 0.99) up = vec3(1.0, 0.0, 0.0);
			vec3 right = normalize(cross(up, dir));
			up = cross(dir, right);
			mat3 rot = mat3(right, dir, up);
			vec3 scaledPos = position * vec3(1.0, len, 1.0);
			vec3 worldPos = rot * scaledPos + a_offset;
			vNormal = normalize(normalMatrix * normal);
			gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
		}
	`;

	const thickRayUniforms = {
		u_outerRed: uniforms.u_outerRed,
		u_outerGreen: uniforms.u_outerGreen,
		u_outerBlue: uniforms.u_outerBlue,
		u_time: uniforms.u_time,
		u_frequency: uniforms.u_frequency,
		u_sensitivity: uniforms.u_sensitivity,
		u_rayLength: uniforms.u_rayLength,
		u_rayThreshold: uniforms.u_rayThreshold
	};

	const thickRayMat = new THREE.ShaderMaterial({
		uniforms: thickRayUniforms,
		vertexShader: thickRayVertexShader,
		fragmentShader: rayFragmentShader,
		transparent: true
	});

	return new THREE.Mesh(instancedGeo, thickRayMat);
}

export function rebuildOuterLayer(outerLayer, params, uniforms, rayVertexShader, rayFragmentShader) {
	outerLayer.outerMesh.geometry.dispose();
	outerLayer.outerMesh.geometry = new THREE.IcosahedronGeometry(params.outerRadius, params.outerDetail);
	outerLayer.outerPoints.geometry = outerLayer.outerMesh.geometry;
	outerLayer.outerGeo = outerLayer.outerMesh.geometry;

	outerLayer.rayLines.geometry.dispose();
	outerLayer.rayCylinders.geometry.dispose();

	const {rayLines, rayCylinders} = buildRayGeometry(outerLayer.outerGeo, uniforms, rayVertexShader, rayFragmentShader, params);
	outerLayer.rayLines = rayLines;
	outerLayer.rayCylinders = rayCylinders;
}
