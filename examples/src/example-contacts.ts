// Contacts — the fast path for reading contacts every frame.
//
// Building a JS object per contact each frame allocates and churns the GC, which
// does not scale. To inspect *every current contact manifold* every frame, use a
// reusable, wasm-backed contacts buffer instead: its storage lives in the wasm
// heap and grows on its own, so refilling it copies nothing to JS and allocates
// no typed arrays. Here we poll all bodies each frame and draw a marker at every
// manifold point (cyan = just touching, red = penetrating), all through one
// buffer that we allocate once and free at the end.

import type { Box3DModule, b3BodyId, b3Vec3 } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 9, 20], target: [0, 2, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -10, 0];
const world = b3.b3CreateWorld(worldDef);

// platform
const groundDef = b3.b3DefaultBodyDef();
groundDef.position = [0, -0.5, 0];
const ground = b3.b3CreateBody(world, groundDef);
b3.b3CreateBoxShape(ground, b3.b3DefaultShapeDef(), 8, 0.5, 8);

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

let bodies: b3BodyId[] = [];

function spawn(): void {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = [
		Math.sin(bodies.length * 12.9898) * 3,
		6 + (bodies.length % 6),
		Math.cos(bodies.length * 4.1414) * 3,
	];
	const body = b3.b3CreateBody(world, def);
	const shapeDef = b3.b3DefaultShapeDef();
	if (bodies.length % 2 === 0)
		b3.b3CreateBoxShape(body, shapeDef, 0.5, 0.5, 0.5);
	else
		b3.b3CreateSphereShape(body, shapeDef, {
			center: [0, 0, 0],
			radius: 0.55,
		});
	bodies.push(body);
}

function reset(): void {
	for (const b of bodies) b3.b3DestroyBody(b);
	bodies = [];
	for (let i = 0; i < 40; i++) spawn();
}
reset();

// ---------------------------------------------------------------------------
// Contact-point markers — one InstancedMesh, matrices rewritten in place each
// frame (no per-point allocation, mirroring the zero-alloc buffer read).
// ---------------------------------------------------------------------------

const MAX_POINTS = 1024;
const pointGeo = new THREE.SphereGeometry(0.08, 8, 6);
// depthTest off + high renderOrder draws contact points on top of the bodies so
// they're visible where shapes touch instead of being hidden inside them.
const pointMat = new THREE.MeshBasicMaterial({ depthTest: false });
const markers = new THREE.InstancedMesh(pointGeo, pointMat, MAX_POINTS);
markers.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
markers.count = 0;
// per-instance matrices place the markers; skip frustum culling so the mesh (whose
// auto-computed bounds are empty at creation) isn't wrongly culled.
markers.frustumCulled = false;
markers.renderOrder = 999;
app.scene.add(markers);

const TOUCHING = new THREE.Color(0x33ddff);
const PENETRATING = new THREE.Color(0xff3333);

// ---------------------------------------------------------------------------
// Reusable, wasm-backed contacts buffer + reader scratch objects — ALL allocated
// exactly once here, never inside the frame loop.
// ---------------------------------------------------------------------------

const cb = b3.createContactsBuffer();
const contact = b3.createContact();
const manifold = b3.createManifold();
const seen = new Set<number>(); // dedupe contacts shared by two polled bodies

// scratch three.js objects reused every frame
const _dummy = new THREE.Object3D();
const _com = new THREE.Vector3();
const _comArr: b3Vec3 = [0, 0, 0]; // scratch for b3Body_GetWorldCenterOfMass

const hud = { contacts: 0, points: 0 };
app.gui.add(hud, 'contacts').listen().disable();
app.gui.add(hud, 'points').listen().disable();
app.gui.add({ reset }, 'reset').name('reset (R)');
window.addEventListener('keydown', (e) => {
	if (e.key === 'r' || e.key === 'R') reset();
});

app.onFrame(() => {
	app.step(() => b3.b3World_Step(world, 1 / 60, 4));
	renderer.update();

	let points = 0;
	let contacts = 0;
	seen.clear();

	// One buffer, refilled for every body — zero JS allocation across all fills.
	for (const body of bodies) {
		b3.getBodyContactData(cb, body);
		for (let i = 0, n = b3.getNumContacts(cb); i < n; i++) {
			b3.getContactAt(contact, cb, i);
			if (seen.has(contact.contactId.index1)) continue; // already drawn from the other body
			seen.add(contact.contactId.index1);
			contacts++;

			// anchorA is a world-space offset from body A's centre of mass.
			const bodyA = b3.b3Shape_GetBody(contact.shapeIdA);
			b3.b3Body_GetWorldCenterOfMass(_comArr, bodyA);
			_com.set(_comArr[0], _comArr[1], _comArr[2]);

			for (let m = 0; m < contact.manifoldCount; m++) {
				b3.getManifoldAt(manifold, contact, m);
				for (let p = 0; p < manifold.pointCount; p++) {
					if (points >= MAX_POINTS) break;
					const pt = manifold.points[p];
					_dummy.position.set(
						_com.x + pt.anchorA[0],
						_com.y + pt.anchorA[1],
						_com.z + pt.anchorA[2],
					);
					_dummy.scale.setScalar(pt.separation < 0 ? 1.4 : 1);
					_dummy.updateMatrix();
					markers.setMatrixAt(points, _dummy.matrix);
					markers.setColorAt(
						points,
						pt.separation < 0 ? PENETRATING : TOUCHING,
					);
					points++;
				}
			}
		}
	}

	markers.count = points;
	markers.instanceMatrix.needsUpdate = true;
	if (markers.instanceColor) markers.instanceColor.needsUpdate = true;
	hud.contacts = contacts;
	hud.points = points;
});

app.start();
