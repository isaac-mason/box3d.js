// Cast Ray — a shell of
// raycasters slowly drifts around a central torus-knot mesh. Each caster is a
// rotating rootObject with an origin sphere at radius `pointDist`, a faint
// cylinder for the ray, and a hit sphere placed where the ray strikes.

import type { Box3DModule } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 3, 11], target: [0, 0, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, 0, 0];
const world = b3.b3CreateWorld(worldDef);

const pointDist = 5;

// central torus-knot target (triangle mesh), spins slowly
const knotGeom = new THREE.TorusKnotGeometry(1.2, 0.4, 160, 20).toNonIndexed();
const knotPos = knotGeom.getAttribute('position').array as Float32Array;
const knotIdx = new Uint32Array(knotPos.length / 3);
for (let i = 0; i < knotIdx.length; i++) knotIdx[i] = i;
const meshData = b3.b3CreateMesh(knotPos, knotIdx);
const targetBody = b3.b3CreateBody(world, b3.b3DefaultBodyDef());
b3.b3CreateMeshShape(targetBody, b3.b3DefaultShapeDef(), meshData, [1, 1, 1]);
knotGeom.computeVertexNormals();
const targetMesh = new THREE.Mesh(
	knotGeom,
	new THREE.MeshStandardMaterial({
		color: 0xe91e63,
		roughness: 0.4,
		metalness: 0.2,
	}),
);
app.scene.add(targetMesh);

// raycasters
const filter = b3.b3DefaultQueryFilter();
const sphereGeo = new THREE.SphereGeometry(0.25, 12, 12);
const cylGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 6);
const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
const faint = new THREE.MeshBasicMaterial({
	color: 0xffffff,
	transparent: true,
	opacity: 0.25,
});

type Caster = {
	root: THREE.Object3D;
	hitMesh: THREE.Mesh;
	cyl: THREE.Mesh;
	quat: THREE.Quaternion;
	spin: THREE.Vector3;
};
const casters: Caster[] = [];

function setCasterCount(n: number) {
	while (casters.length > n) {
		app.scene.remove(casters.pop()!.root);
	}
	while (casters.length < n) {
		const root = new THREE.Object3D();
		const originMesh = new THREE.Mesh(sphereGeo, white);
		originMesh.scale.setScalar(0.4);
		originMesh.position.set(pointDist, 0, 0);
		const hitMesh = new THREE.Mesh(sphereGeo, white);
		hitMesh.scale.setScalar(0.22);
		const cyl = new THREE.Mesh(cylGeo, faint);
		cyl.rotation.z = Math.PI / 2;
		root.add(cyl, originMesh, hitMesh);
		root.quaternion.setFromEuler(
			new THREE.Euler(
				Math.random() * 10,
				Math.random() * 10,
				Math.random() * 10,
			),
		);
		app.scene.add(root);
		casters.push({
			root,
			hitMesh,
			cyl,
			quat: root.quaternion.clone(),
			spin: new THREE.Vector3(
				(Math.random() - 0.5) * 0.6,
				(Math.random() - 0.5) * 0.6,
				(Math.random() - 0.5) * 0.6,
			),
		});
	}
}
setCasterCount(150);

const settings = { casts: 150 };
app.gui
	.add(settings, 'casts', 10, 500, 10)
	.name('casts (n)')
	.onChange(setCasterCount);

const _o = new THREE.Vector3();
const _dq = new THREE.Quaternion();
const _e = new THREE.Euler();
let targetAngle = 0;

app.onFrame((dt) => {
	targetAngle += dt * 0.3;
	const tq = new THREE.Quaternion().setFromAxisAngle(
		new THREE.Vector3(0.3, 1, 0.2).normalize(),
		targetAngle,
	);
	b3.b3Body_SetTransform(targetBody, [0, 0, 0], [tq.x, tq.y, tq.z, tq.w]);
	targetMesh.quaternion.copy(tq);

	// physics: step the world, then fire every ray — timed together for the
	// stats MS panel (the casts are the bulk of the per-frame physics work).
	const hitDists = new Array<number>(casters.length);
	const hits = new Array<boolean>(casters.length);
	app.step(() => {
		b3.b3World_Step(world, 1 / 60, 1);
		for (let i = 0; i < casters.length; i++) {
			const c = casters[i];
			_dq.setFromEuler(_e.set(c.spin.x * dt, c.spin.y * dt, c.spin.z * dt));
			c.quat.multiply(_dq);
			c.root.quaternion.copy(c.quat);
			c.root.updateMatrixWorld();

			// origin in world; ray fires toward the centre
			c.root.children[1].getWorldPosition(_o);
			const dir = _o.clone().multiplyScalar(-1).normalize();
			const res = b3.b3World_CastRayClosest(
				world,
				[_o.x, _o.y, _o.z],
				[dir.x * pointDist, dir.y * pointDist, dir.z * pointDist],
				filter,
			);
			hits[i] = res.hit;
			hitDists[i] = res.hit ? res.fraction * pointDist : pointDist;
		}
	});

	// place each hit sphere + ray cylinder in the caster's local frame (ray runs
	// from local +x=pointDist toward the origin) — positioning stays untimed
	for (let i = 0; i < casters.length; i++) {
		const c = casters[i];
		const hitDist = hitDists[i];
		c.hitMesh.position.set(pointDist - hitDist, 0, 0);
		c.hitMesh.visible = hits[i];
		c.cyl.position.set(pointDist - hitDist / 2, 0, 0);
		c.cyl.scale.set(1, hitDist, 1);
	}
});
app.start();
