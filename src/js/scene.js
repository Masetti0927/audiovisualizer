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

export function createOuterLayer(params, uniforms, rayVertexShader, rayFragmentShader) {
	const outerGeo = new THREE.IcosahedronGeometry(params.outerRadius, params.outerDetail);

	const outerMeshMat = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: rayVertexShader,
		fragmentShader: rayFragmentShader,
		wireframe: true
	});
	const outerMesh = new THREE.Mesh(outerGeo, outerMeshMat);
	outerMesh.visible = params.outerVisible && params.outerWireframe;

	const outerPointsMat = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: rayVertexShader,
		fragmentShader: rayFragmentShader
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
		u_red: uniforms.u_red,
		u_green: uniforms.u_green,
		u_blue: uniforms.u_blue,
		u_frequency: uniforms.u_frequency,
		u_sensitivity: uniforms.u_sensitivity,
		u_rayLength: uniforms.u_rayLength
	};

	const rayMat = new THREE.ShaderMaterial({
		uniforms: rayUniforms,
		vertexShader: rayVertexShader,
		fragmentShader: rayFragmentShader,
		transparent: true
	});

	const rayLines = new THREE.LineSegments(rayGeo, rayMat);
	rayLines.visible = params.rayVisible && params.rayStyle === 'thin';

	const rayCylinders = createThickRays(geo, uniforms, rayVertexShader, rayFragmentShader, params);
	rayCylinders.visible = params.rayVisible && params.rayStyle === 'thick';

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
		uniform float u_frequency;
		uniform float u_sensitivity;
		uniform float u_rayLength;
		varying vec3 vNormal;
		void main() {
			float len = u_frequency * u_sensitivity * u_rayLength / 100.0;
			len = max(len, 0.01);
			vec3 dir = normalize(a_direction);
			vec3 up = vec3(0.0, 0.0, 1.0);
			vec3 axis = normalize(cross(up, dir));
			float angle = acos(clamp(dot(up, dir), -1.0, 1.0));
			mat3 rot = mat3(
				cos(angle) + axis.x*axis.x*(1.0-cos(angle)),
				axis.x*axis.y*(1.0-cos(angle)) - axis.z*sin(angle),
				axis.x*axis.z*(1.0-cos(angle)) + axis.y*sin(angle),
				axis.y*axis.x*(1.0-cos(angle)) + axis.z*sin(angle),
				cos(angle) + axis.y*axis.y*(1.0-cos(angle)),
				axis.y*axis.z*(1.0-cos(angle)) - axis.x*sin(angle),
				axis.z*axis.x*(1.0-cos(angle)) - axis.y*sin(angle),
				axis.z*axis.y*(1.0-cos(angle)) + axis.x*sin(angle),
				cos(angle) + axis.z*axis.z*(1.0-cos(angle))
			);
			vec3 scaledPos = position * vec3(1.0, 1.0, len);
			vec3 worldPos = rot * scaledPos + a_offset;
			vNormal = normalize(normalMatrix * normal);
			gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
		}
	`;

	const thickRayUniforms = {
		u_red: uniforms.u_red,
		u_green: uniforms.u_green,
		u_blue: uniforms.u_blue,
		u_frequency: uniforms.u_frequency,
		u_sensitivity: uniforms.u_sensitivity,
		u_rayLength: uniforms.u_rayLength
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
