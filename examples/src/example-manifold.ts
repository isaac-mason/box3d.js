// Manifold — box3d's low-level contact generation (the b3Collide* functions).
// Two convex shapes are collided directly (no world, no bodies): shape B slowly
// orbits shape A, and every frame we recompute the contact manifold and draw its
// points (yellow dots) and normal (arrows). Pick the shape pair from the panel.
// Ported from box3d's sample_manifold.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3Transform, b3HullData } from 'box3d.js';
import * as THREE from 'three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 3, 8], target: [0, 0, 0] });

const IDENTITY: b3Transform = { p: { x: 0, y: 0, z: 0 }, q: { v: { x: 0, y: 0, z: 0 }, s: 1 } };

// box3d hull for a box of the given half-extents
function boxHull(hx: number, hy: number, hz: number): b3HullData {
	const v: number[] = [];
	for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) v.push(sx * hx, sy * hy, sz * hz);
	return b3.b3CreateHull(v)!;
}

const SPHERE = { center: { x: 0, y: 0, z: 0 }, radius: 1 };
const CAPSULE = { center1: { x: 0, y: -0.9, z: 0 }, center2: { x: 0, y: 0.9, z: 0 }, radius: 0.6 };
const HULL = boxHull(1, 1, 1);

// three.js geometry mirroring each collidable
function sphereGeom() { return new THREE.SphereGeometry(1, 24, 16); }
function capsuleGeom() { return new THREE.CapsuleGeometry(0.6, 1.8, 8, 16); }
function boxGeom() { return new THREE.BoxGeometry(2, 2, 2); }

type Kind = 'sphere' | 'capsule' | 'hull';
const geomFor: Record<Kind, () => THREE.BufferGeometry> = { sphere: sphereGeom, capsule: capsuleGeom, hull: boxGeom };

// dispatch b3Collide* for a shape pair (A, B) given B relative to A
function collide(a: Kind, b: Kind, xfBtoA: b3Transform): { normal: { x: number; y: number; z: number }; points: { point: { x: number; y: number; z: number }; separation: number }[] } {
	if (a === 'sphere' && b === 'sphere') return b3.b3CollideSpheres(SPHERE, SPHERE, xfBtoA);
	if (a === 'capsule' && b === 'sphere') return b3.b3CollideCapsuleAndSphere(CAPSULE, SPHERE, xfBtoA);
	if (a === 'capsule' && b === 'capsule') return b3.b3CollideCapsules(CAPSULE, CAPSULE, xfBtoA);
	if (a === 'hull' && b === 'sphere') return b3.b3CollideHullAndSphere(HULL, SPHERE, xfBtoA);
	if (a === 'hull' && b === 'capsule') return b3.b3CollideHullAndCapsule(HULL, CAPSULE, xfBtoA);
	return b3.b3CollideHulls(HULL, HULL, xfBtoA);
}

const pairs: Record<string, [Kind, Kind]> = {
	'Sphere vs Sphere': ['sphere', 'sphere'],
	'Capsule vs Sphere': ['capsule', 'sphere'],
	'Capsule vs Capsule': ['capsule', 'capsule'],
	'Hull vs Sphere': ['hull', 'sphere'],
	'Hull vs Capsule': ['hull', 'capsule'],
	'Hull vs Hull': ['hull', 'hull'],
};

const params = { pair: 'Hull vs Hull' };

const shapeMat = (c: number) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.5, roughness: 0.5 });
let meshA: THREE.Mesh = new THREE.Mesh(boxGeom(), shapeMat(0x4d96ff));
let meshB: THREE.Mesh = new THREE.Mesh(boxGeom(), shapeMat(0xff9f45));
app.scene.add(meshA, meshB);

function rebuildMeshes(): void {
	const [ka, kb] = pairs[params.pair];
	app.scene.remove(meshA, meshB);
	meshA = new THREE.Mesh(geomFor[ka](), shapeMat(0x4d96ff));
	meshB = new THREE.Mesh(geomFor[kb](), shapeMat(0xff9f45));
	app.scene.add(meshA, meshB);
}
app.gui.add(params, 'pair', Object.keys(pairs)).onChange(rebuildMeshes);
rebuildMeshes();

// contact-point markers (dots) + normal arrows, up to 4
const dotGeo = new THREE.SphereGeometry(0.06, 10, 8);
const dotMat = new THREE.MeshBasicMaterial({ color: 0xffe14d });
const dots: THREE.Mesh[] = [];
const arrows: THREE.ArrowHelper[] = [];
for (let i = 0; i < 4; i++) {
	const d = new THREE.Mesh(dotGeo, dotMat);
	d.visible = false;
	app.scene.add(d);
	dots.push(d);
	const arr = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.8, 0xff4020, 0.2, 0.12);
	arr.visible = false;
	app.scene.add(arr);
	arrows.push(arr);
}

let t = 0;
app.onFrame((dt: number) => {
	t += dt;

	// shape A fixed at the origin (identity); shape B orbits, dipping in and out
	const dist = 1.6 + 0.5 * Math.sin(t * 0.8);
	const xfB: b3Transform = {
		p: { x: Math.cos(t * 0.5) * dist, y: Math.sin(t * 0.9) * 0.6, z: Math.sin(t * 0.5) * dist },
		q: b3.b3MakeQuatFromAxisAngle({ x: 0.3, y: 1, z: 0.2 }, t * 0.7),
	};

	meshA.position.set(0, 0, 0);
	meshA.quaternion.set(0, 0, 0, 1);
	meshB.position.set(xfB.p.x, xfB.p.y, xfB.p.z);
	meshB.quaternion.set(xfB.q.v.x, xfB.q.v.y, xfB.q.v.z, xfB.q.s);

	// A is identity, so transformBtoA == xfB and manifold points are world-space
	const [ka, kb] = pairs[params.pair];
	const m = collide(ka, kb, b3.b3InvMulTransforms(IDENTITY, xfB));

	for (let i = 0; i < 4; i++) {
		const p = m.points[i];
		if (p) {
			dots[i].visible = true;
			dots[i].position.set(p.point.x, p.point.y, p.point.z);
			arrows[i].visible = true;
			arrows[i].position.set(p.point.x, p.point.y, p.point.z);
			arrows[i].setDirection(new THREE.Vector3(m.normal.x, m.normal.y, m.normal.z).normalize());
		} else {
			dots[i].visible = false;
			arrows[i].visible = false;
		}
	}
});
app.start();
