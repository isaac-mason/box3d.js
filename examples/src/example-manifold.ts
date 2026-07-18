// Manifold — box3d's low-level contact generation (the b3Collide* functions).
// Two convex shapes are collided directly (no world, no bodies): shape B slowly
// orbits shape A, and every frame we recompute the contact manifold and draw its
// points (yellow dots) and normal (arrows). Pick the shape pair from the panel.
// Ported from box3d's sample_manifold.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3Transform, b3HullData, b3Vec3 } from 'box3d.js';
import * as THREE from 'three';
import { createHarness } from './harness';
import { quatFromAxisAngle } from './math';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 3, 8], target: [0, 0, 0] });

// box3d hull for a box of the given half-extents
function boxHull(hx: number, hy: number, hz: number): b3HullData {
	const v: number[] = [];
	for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) v.push(sx * hx, sy * hy, sz * hz);
	return b3.b3CreateHull(v)!;
}

const SPHERE = { center: [0, 0, 0] as b3Vec3, radius: 1 };
const CAPSULE = { center1: [0, -0.9, 0] as b3Vec3, center2: [0, 0.9, 0] as b3Vec3, radius: 0.6 };
const HULL = boxHull(1, 1, 1);

// three.js geometry mirroring each collidable
function sphereGeom() { return new THREE.SphereGeometry(1, 24, 16); }
function capsuleGeom() { return new THREE.CapsuleGeometry(0.6, 1.8, 8, 16); }
function boxGeom() { return new THREE.BoxGeometry(2, 2, 2); }

type Kind = 'sphere' | 'capsule' | 'hull';
const geomFor: Record<Kind, () => THREE.BufferGeometry> = { sphere: sphereGeom, capsule: capsuleGeom, hull: boxGeom };

// dispatch b3Collide* for a shape pair (A, B) given B relative to A
function collide(a: Kind, b: Kind, xfBtoA: b3Transform): { normal: b3Vec3; points: { point: b3Vec3; separation: number }[] } {
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
		position: [Math.cos(t * 0.5) * dist, Math.sin(t * 0.9) * 0.6, Math.sin(t * 0.5) * dist],
		quaternion: quatFromAxisAngle([0.3, 1, 0.2], t * 0.7),
	};

	meshA.position.set(0, 0, 0);
	meshA.quaternion.set(0, 0, 0, 1);
	meshB.position.set(xfB.position[0], xfB.position[1], xfB.position[2]);
	meshB.quaternion.set(xfB.quaternion[0], xfB.quaternion[1], xfB.quaternion[2], xfB.quaternion[3]);

	// A is identity, so transformBtoA == xfB and manifold points are world-space
	const [ka, kb] = pairs[params.pair];
	const m = collide(ka, kb, xfB); // shape A is at identity, so B-relative-to-A == xfB

	for (let i = 0; i < 4; i++) {
		const p = m.points[i];
		if (p) {
			dots[i].visible = true;
			dots[i].position.set(p.point[0], p.point[1], p.point[2]);
			arrows[i].visible = true;
			arrows[i].position.set(p.point[0], p.point[1], p.point[2]);
			arrows[i].setDirection(new THREE.Vector3(m.normal[0], m.normal[1], m.normal[2]).normalize());
		} else {
			dots[i].visible = false;
			arrows[i].visible = false;
		}
	}
});
app.start();
