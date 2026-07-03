// GJK — the closest-points distance query between two convex shapes
// (b3ShapeDistance). No simulation: shape A is fixed, shape B orbits and spins,
// and every frame GJK reports the closest points, drawn as a line that turns from
// green (far apart) to red (touching).

import type { Box3DModule } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 7, 12], target: [0, 0, 0] });

// convex point clouds (box corners)
const boxPoints = (hx: number, hy: number, hz: number): number[] => [
	-hx,
	-hy,
	-hz,
	hx,
	-hy,
	-hz,
	hx,
	-hy,
	hz,
	-hx,
	-hy,
	hz,
	-hx,
	hy,
	-hz,
	hx,
	hy,
	-hz,
	hx,
	hy,
	hz,
	-hx,
	hy,
	hz,
];

const A = boxPoints(1.5, 1.5, 1.5);
const B = boxPoints(0.9, 0.9, 0.9);

// meshes
const matA = new THREE.MeshStandardMaterial({
	color: 0x4d96ff,
	roughness: 0.5,
	transparent: true,
	opacity: 0.85,
});
const meshA = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), matA);
app.scene.add(meshA);
const matB = new THREE.MeshStandardMaterial({
	color: 0xffd93d,
	roughness: 0.5,
	transparent: true,
	opacity: 0.85,
});
const meshB = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), matB);
app.scene.add(meshB);

// closest-points line + endpoint markers
const linePos = new Float32Array(6);
const lineGeom = new THREE.BufferGeometry();
lineGeom.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
const lineMat = new THREE.LineBasicMaterial({ color: 0x6bcb77 });
const line = new THREE.Line(lineGeom, lineMat);
app.scene.add(line);
const markerA = new THREE.Mesh(
	new THREE.SphereGeometry(0.12),
	new THREE.MeshBasicMaterial({ color: 0xffffff }),
);
const markerB = new THREE.Mesh(
	new THREE.SphereGeometry(0.12),
	new THREE.MeshBasicMaterial({ color: 0xffffff }),
);
app.scene.add(markerA, markerB);

let time = 0;

app.onFrame((dt) => {
	time += dt;
	// shape B orbits shape A and tumbles
	const bx = Math.cos(time * 0.7) * (3.2 + Math.sin(time * 0.9) * 1.6);
	const bz = Math.sin(time * 0.7) * (3.2 + Math.sin(time * 0.9) * 1.6);
	const q = new THREE.Quaternion().setFromEuler(
		new THREE.Euler(time * 0.8, time * 1.1, time * 0.5),
	);
	meshB.position.set(bx, 0, bz);
	meshB.quaternion.copy(q);

	// GJK: transformB is B's pose in A's frame (A sits at the origin, identity)
	const out = b3.b3ShapeDistance(
		A,
		0,
		B,
		0,
		{ position: [bx, 0, bz], quaternion: [q.x, q.y, q.z, q.w] },
		false,
	);

	linePos[0] = out.pointA[0];
	linePos[1] = out.pointA[1];
	linePos[2] = out.pointA[2];
	linePos[3] = out.pointB[0];
	linePos[4] = out.pointB[1];
	linePos[5] = out.pointB[2];
	lineGeom.getAttribute('position').needsUpdate = true;
	markerA.position.set(out.pointA[0], out.pointA[1], out.pointA[2]);
	markerB.position.set(out.pointB[0], out.pointB[1], out.pointB[2]);

	// green when far, red when touching
	const t = Math.min(out.distance / 3, 1);
	lineMat.color.setRGB(1 - t, t, t * 0.4);
});
app.start();
