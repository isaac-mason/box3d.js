// Events — box3d reports collision events each step.
// Shapes rain onto a platform; on each hit event we spawn a world-space marker
// (dot + normal spike) at the impact point. Yellow = light tap, red = hard hit.
// Markers fade out over ~1 second. This mirrors the upstream box3d HitEvent sample.

import type { Box3DModule, b3BodyId } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 9, 20], target: [0, 2, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld(worldDef);

// platform
const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const ground = b3.b3CreateBody(world, groundDef);
b3.b3CreateBoxShape(ground, b3.b3DefaultShapeDef(), 12, 0.5, 12);

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

let bodies: b3BodyId[] = [];

function spawn(): void {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = {
		x: Math.sin(bodies.length * 12.9898) * 4,
		y: 8 + (bodies.length % 5),
		z: Math.cos(bodies.length * 4.1414) * 4,
	};
	const body = b3.b3CreateBody(world, def);

	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.enableHitEvents = true;
	shapeDef.baseMaterial.restitution = 0.4;

	const pick = bodies.length % 3;
	if (pick === 0) b3.b3CreateBoxShape(body, shapeDef, 0.5, 0.5, 0.5);
	else if (pick === 1)
		b3.b3CreateSphereShape(body, shapeDef, {
			center: { x: 0, y: 0, z: 0 },
			radius: 0.55,
		});
	else
		b3.b3CreateCapsuleShape(body, shapeDef, {
			center1: { x: 0, y: -0.35, z: 0 },
			center2: { x: 0, y: 0.35, z: 0 },
			radius: 0.4,
		});

	bodies.push(body);
}

function reset(): void {
	for (const b of bodies) b3.b3DestroyBody(b);
	bodies = [];
	clearMarkers();
	for (let i = 0; i < 24; i++) spawn();
}

const params = { spawn: () => spawn(), reset };
app.gui.add(params, 'spawn').name('drop one more');
app.gui.add(params, 'reset').name('reset (R)');
window.addEventListener('keydown', (e) => {
	if (e.key === 'r' || e.key === 'R') reset();
});

// ---------------------------------------------------------------------------
// Hit markers — dot + normal spike at the impact point, sized/coloured by speed
// ---------------------------------------------------------------------------

const dotGeo = new THREE.SphereGeometry(1, 8, 6);
const spikeGeo = new THREE.CylinderGeometry(0.015, 0.015, 1, 5);
const MAX_MARKERS = 128;

type Marker = {
	group: THREE.Group;
	mats: THREE.MeshBasicMaterial[];
	ttl: number;
};
const markers: Marker[] = [];

const _up = new THREE.Vector3(0, 1, 0);
const _n = new THREE.Vector3();

function spawnMarker(
	px: number,
	py: number,
	pz: number,
	nx: number,
	ny: number,
	nz: number,
	speed: number,
): void {
	if (markers.length >= MAX_MARKERS) return;

	const t = Math.min(1, speed / 8);
	const col = new THREE.Color(1, 1 - t, 0); // yellow -> orange-red

	const dotMat = new THREE.MeshBasicMaterial({
		color: col,
		transparent: true,
		opacity: 0.9,
	});
	const spikeMat = new THREE.MeshBasicMaterial({
		color: col,
		transparent: true,
		opacity: 0.9,
	});

	const dot = new THREE.Mesh(dotGeo, dotMat);
	dot.scale.setScalar(0.04 + t * 0.12);

	const spikeLen = 0.12 + t * 0.5;
	const spike = new THREE.Mesh(spikeGeo, spikeMat);
	spike.scale.set(1, spikeLen, 1);
	_n.set(nx, ny, nz);
	spike.quaternion.setFromUnitVectors(_up, _n);
	spike.position.copy(_n.multiplyScalar(spikeLen * 0.5));

	const group = new THREE.Group();
	group.add(dot, spike);
	group.position.set(px, py, pz);
	app.scene.add(group);
	markers.push({ group, mats: [dotMat, spikeMat], ttl: 1.0 });
}

function clearMarkers(): void {
	for (const m of markers) {
		app.scene.remove(m.group);
		for (const mat of m.mats) mat.dispose();
	}
	markers.length = 0;
}

// Reusable events buffer + hit-event scratch, allocated once (never per frame).
const eventsBuffer = b3.createEventsBuffer();
const hit = b3.createContactHitEvent();

app.onFrame((dt) => {
	app.step(() => b3.b3World_Step(world, 1 / 60, 4));
	renderer.update();

	// Read this step's contact hit events through the zero-alloc buffer.
	b3.getEvents(eventsBuffer, world);
	for (let i = 0, n = b3.getNumContactHitEvents(eventsBuffer); i < n; i++) {
		b3.getContactHitEventAt(hit, eventsBuffer, i);
		spawnMarker(
			hit.point.x,
			hit.point.y,
			hit.point.z,
			hit.normal.x,
			hit.normal.y,
			hit.normal.z,
			hit.approachSpeed,
		);
	}

	for (let i = markers.length - 1; i >= 0; i--) {
		const m = markers[i];
		m.ttl -= dt;
		if (m.ttl <= 0) {
			app.scene.remove(m.group);
			for (const mat of m.mats) mat.dispose();
			markers.splice(i, 1);
		} else {
			const opacity = m.ttl * 0.9;
			for (const mat of m.mats) mat.opacity = opacity;
		}
	}
});

reset(); // markers/clearMarkers are defined above by now
app.start();
