// Character — a capsule character-controller driven by box3d's mover API
// (b3World_CollideMover → b3SolvePlanes → b3World_CastMover), a faithful port of
// box3d's CharacterMover. The obstacle course is reproduced from the JoltPhysics KCC
// example: floor + walls, stairs, angled ramps, pushable props, spinning /
// sliding / diagonal kinematic platforms, a triangle-mesh terrain, a bumpy
// sphere field, doubling stepping boxes, and a spring-suspended platform.
//
// Controls: WASD move (camera-relative) · Space jump · Shift sprint · drag to orbit.

import type { Box3DModule, b3BodyId, b3Vec3, b3Quat } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
// crashcat's KCC camera: eye (0,10,20) looking at the character's start (0,10,0)
const app = createHarness({ camera: [0, 10, 20], target: [0, 10, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -25, z: 0 };
const world = b3.b3CreateWorld(worldDef);

// ---------------------------------------------------------------------------
// Course builders
// ---------------------------------------------------------------------------

function staticBox(x: number, y: number, z: number, hx: number, hy: number, hz: number, q?: b3Quat): b3BodyId {
	const def = b3.b3DefaultBodyDef();
	def.position = { x, y, z };
	if (q) def.rotation = q;
	const body = b3.b3CreateBody(world, def);
	b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), hx, hy, hz);
	return body;
}

function staticSphere(x: number, y: number, z: number, r: number): void {
	const def = b3.b3DefaultBodyDef();
	def.position = { x, y, z };
	const body = b3.b3CreateBody(world, def);
	b3.b3CreateSphereShape(body, b3.b3DefaultShapeDef(), { center: { x: 0, y: 0, z: 0 }, radius: r });
}

function dynamic(kind: 'box' | 'sphere', x: number, y: number, z: number, r: number): void {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x, y, z };
	const body = b3.b3CreateBody(world, def);
	const sd = b3.b3DefaultShapeDef();
	sd.density = 40;
	if (kind === 'box') b3.b3CreateBoxShape(body, sd, r, r, r);
	else b3.b3CreateSphereShape(body, sd, { center: { x: 0, y: 0, z: 0 }, radius: r });
}

function kinematic(x: number, y: number, z: number, hx: number, hy: number, hz: number): b3BodyId {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_kinematicBody;
	def.position = { x, y, z };
	const body = b3.b3CreateBody(world, def);
	b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), hx, hy, hz);
	return body;
}

// floor + surrounding walls
staticBox(0, -0.5, 0, 50, 0.5, 50);
staticBox(-45, 1, 0, 0.5, 2, 45);
staticBox(45, 1, 0, 0.5, 2, 45);
staticBox(0, 1, -45, 45, 2, 0.5);
staticBox(0, 1, 45, 45, 2, 0.5);

// conveyor strip (visual; a flat platform)
staticBox(0, 0, -10, 10, 0.25, 2);

// stairs — 5 sets of increasing step height
for (let j = 0; j < 5; j++) {
	const stepHeight = 0.3 + 0.1 * j;
	for (let i = 1; i < 10; i++) {
		staticBox(15 + 5 * j, i * stepHeight - 0.5 + stepHeight / 2, -20 - i * 3, 2, stepHeight / 2, 2);
	}
}

// slopes — 10 angled boxes from 70° down to 25°
for (let i = 0; i < 10; i++) {
	const angle = ((70 - i * 5) * Math.PI) / 180;
	const q = b3.b3MakeQuatFromAxisAngle({ x: 1, y: 0, z: 0 }, angle);
	staticBox(-40 + 5 * i, 2, -25, 2.5, 0.6, 8, q);
}

// pushable props
dynamic('box', -10, 5, 10, 0.75);
dynamic('sphere', -8, 2, 10, 0.75);

// spinning kinematic platform
const spinning = kinematic(0, 2, 15, 4, 0.2, 4);
b3.b3Body_SetAngularVelocity(spinning, { x: 0, y: 0.6, z: 0 });

// sliding + diagonal kinematic platforms (animated in the loop)
const sliding = kinematic(20, 2, -5, 3, 0.2, 3);
const slidingCenter = { x: 20, y: 2, z: -5 };
const diagonal = kinematic(20, 3, 5, 3, 0.2, 3);
const diagonalCenter = { x: 20, y: 3, z: 5 };

// triangle-mesh terrain (16×16 heightfield), drawn by us since the renderer
// can't introspect a mesh shape
{
	const grid = 16, cell = 2, hScale = 2;
	const meshPos = { x: -30, y: 2, z: 30 };
	const heightAt = (x: number, z: number) =>
		Math.sin(x * 0.3) * Math.cos(z * 0.3) * hScale * 0.5 +
		Math.sin(x * 0.7 + 1) * Math.sin(z * 0.7) * hScale * 0.3 +
		Math.cos((x + z) * 0.15) * hScale * 0.2;
	const positions = new Float32Array((grid + 1) * (grid + 1) * 3);
	let p = 0;
	for (let iz = 0; iz <= grid; iz++) {
		for (let ix = 0; ix <= grid; ix++) {
			const x = (ix - grid / 2) * cell;
			const z = (iz - grid / 2) * cell;
			positions[p++] = x;
			positions[p++] = heightAt(x, z);
			positions[p++] = z;
		}
	}
	const indices = new Uint32Array(grid * grid * 6);
	let t = 0;
	for (let iz = 0; iz < grid; iz++) {
		for (let ix = 0; ix < grid; ix++) {
			const row = grid + 1;
			const bl = iz * row + ix, br = bl + 1, tl = bl + row, tr = tl + 1;
			indices[t++] = bl; indices[t++] = tl; indices[t++] = br;
			indices[t++] = br; indices[t++] = tl; indices[t++] = tr;
		}
	}
	const meshData = b3.b3CreateMesh(positions, indices);
	const body = b3.b3CreateBody(world, (() => { const d = b3.b3DefaultBodyDef(); d.position = meshPos; return d; })());
	b3.b3CreateMeshShape(body, b3.b3DefaultShapeDef(), meshData, { x: 1, y: 1, z: 1 });

	const geom = new THREE.BufferGeometry();
	geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geom.setIndex(new THREE.BufferAttribute(indices, 1));
	geom.computeVertexNormals();
	const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0x3d6b4f, roughness: 0.95 }));
	mesh.position.set(meshPos.x, meshPos.y, meshPos.z);
	mesh.receiveShadow = true;
	app.scene.add(mesh);
}

// bumpy floor — a field of half-buried spheres
const bumps = [
	[25, 28, 0.8], [29, 32, 0.9], [23, 34, 0.7], [31, 28, 0.85], [27, 30, 1.0],
	[22, 30, 0.5], [32, 30, 0.55], [25, 26, 0.45], [29, 34, 0.6], [21, 32, 0.5],
	[33, 32, 0.48], [27, 35, 0.52], [27, 25, 0.55], [24, 31, 0.35], [30, 29, 0.3],
	[26, 33, 0.38], [28, 27, 0.32], [22, 28, 0.28], [32, 34, 0.34], [20, 30, 0.4],
	[34, 30, 0.36], [23, 36, 0.33], [31, 26, 0.31],
];
for (const [x, z, r] of bumps) staticSphere(x, r * -0.5, z, r);

// stepping boxes — doubling sizes to test step-ups
{
	let x = 5;
	for (let i = 0; i < 5; i++) {
		const h = 0.25 * 2 ** i;
		staticBox(x, h, 30, h, h, h);
		x += h * 3;
	}
}

// spring-suspended platform — a dynamic slab hung from 4 spring distance joints
{
	const center = { x: -10, y: 5, z: 35 };
	const half = { x: 3, y: 0.3, z: 3 };
	const anchorHeight = 12;
	const platDef = b3.b3DefaultBodyDef();
	platDef.type = b3.b3BodyType.b3_dynamicBody;
	platDef.position = center;
	platDef.linearDamping = 0.5;
	platDef.angularDamping = 0.5;
	const plat = b3.b3CreateBody(world, platDef);
	b3.b3CreateBoxShape(plat, b3.b3DefaultShapeDef(), half.x, half.y, half.z);

	for (const [sx, sz] of [[-half.x, -half.z], [half.x, -half.z], [-half.x, half.z], [half.x, half.z]]) {
		const anchorDef = b3.b3DefaultBodyDef();
		anchorDef.position = { x: center.x + sx, y: anchorHeight, z: center.z + sz };
		const anchor = b3.b3CreateBody(world, anchorDef);
		const jd = b3.b3DefaultDistanceJointDef();
		jd.base.bodyIdA = anchor;
		jd.base.bodyIdB = plat;
		jd.base.localFrameA = { p: { x: 0, y: 0, z: 0 }, q: { v: { x: 0, y: 0, z: 0 }, s: 1 } };
		jd.base.localFrameB = { p: { x: sx, y: half.y, z: sz }, q: { v: { x: 0, y: 0, z: 0 }, s: 1 } };
		jd.length = anchorHeight - center.y;
		jd.enableSpring = true;
		jd.hertz = 1.5;
		jd.dampingRatio = 0.3;
		b3.b3CreateDistanceJoint(world, jd);
	}
}

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

// ---------------------------------------------------------------------------
// The mover — a faithful port of box3d's CharacterMover
// ---------------------------------------------------------------------------

const RADIUS = 0.5;
const CAP1 = { x: 0, y: -1, z: 0 };
const CAP2 = { x: 0, y: 1, z: 0 };
const capsule = { center1: CAP1, center2: CAP2, radius: RADIUS };

const MIN_SPEED = 0.01;
const STOP_SPEED = 1;
const ACCELERATE = 30;
const FRICTION = 4;
const PUSH_LIMIT = 3.4e38; // FLT_MAX — rigid planes

// live-tunable feel (drag the sliders in the panel)
const move = { gravity: 40, jumpSpeed: 16, maxSpeed: 10 };
app.gui.add(move, 'gravity', 5, 90, 1);
app.gui.add(move, 'jumpSpeed', 5, 30, 1).name('jump speed');
app.gui.add(move, 'maxSpeed', 2, 20, 1).name('move speed');
// pogo rest length (spring ride height): box3d uses 3·radius, but we sit the
// capsule near the ground so it reads as walking rather than hovering.
const POGO_REST = RADIUS;

let position = { x: 0, y: 8, z: 0 };
let velocity = { x: 0, y: 0, z: 0 };
let pogoVelocity = 0;
let onGround = false;

const filter = b3.b3DefaultQueryFilter();

const charMesh = new THREE.Mesh(
	new THREE.CapsuleGeometry(RADIUS, 2.0, 8, 16),
	new THREE.MeshStandardMaterial({ color: 0xff5555, roughness: 0.4 }),
);
charMesh.castShadow = true;
app.scene.add(charMesh);

const keys = new Set<string>();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const len = (v: b3Vec3) => Math.hypot(v.x, v.y, v.z);
const dot = (a: b3Vec3, b: b3Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

function solveMove(dt: number, forward: b3Vec3, right: b3Vec3, tx: number, ty: number): void {
	const speed = len(velocity);
	if (speed < MIN_SPEED) { velocity.x = 0; velocity.z = 0; }
	else {
		const control = speed < STOP_SPEED ? STOP_SPEED : speed;
		const drop = control * FRICTION * dt;
		const scale = Math.max(0, speed - drop) / speed;
		velocity.x *= scale; velocity.y *= scale; velocity.z *= scale;
	}

	const sprint = onGround && keys.has('shift');
	const maxSpeed = sprint ? 1.5 * move.maxSpeed : move.maxSpeed;

	const desired = {
		x: maxSpeed * tx * forward.x + maxSpeed * ty * right.x,
		y: 0,
		z: maxSpeed * tx * forward.z + maxSpeed * ty * right.z,
	};
	let desiredSpeed = len(desired);
	const dir = desiredSpeed > 1e-6 ? { x: desired.x / desiredSpeed, y: 0, z: desired.z / desiredSpeed } : { x: 0, y: 0, z: 0 };
	if (desiredSpeed > maxSpeed) desiredSpeed = maxSpeed;

	if (onGround) velocity.y = 0;

	const currentSpeed = dot(velocity, dir);
	const addSpeed = desiredSpeed - currentSpeed;
	if (addSpeed > 0) {
		let accel = ACCELERATE * maxSpeed * dt;
		if (accel > addSpeed) accel = addSpeed;
		velocity.x += accel * dir.x;
		velocity.z += accel * dir.z;
	}

	velocity.y -= move.gravity * dt;

	// pogo ray for ground stick. Only engage when settled or descending — while
	// rising from a jump we stay "airborne" so the suspension spring doesn't yank
	// the character straight back down.
	const rayLength = POGO_REST + RADIUS;
	const rayOrigin = { x: position.x + CAP1.x, y: position.y + CAP1.y, z: position.z + CAP1.z };
	const ray = b3.b3World_CastRayClosest(world, rayOrigin, { x: 0, y: -rayLength, z: 0 }, filter);
	if (ray.hit && velocity.y <= 0.1) {
		onGround = true;
		const currentLength = ray.fraction * rayLength;
		const zeta = 0.7, hertz = 8;
		const omega = 2 * Math.PI * hertz;
		const omegaH = omega * dt;
		pogoVelocity = (pogoVelocity - omega * omegaH * (currentLength - POGO_REST)) / (1 + 2 * zeta * omegaH + omegaH * omegaH);
	} else {
		onGround = false;
		pogoVelocity = 0;
	}

	const target = {
		x: position.x + dt * velocity.x,
		y: position.y + dt * velocity.y + dt * pogoVelocity,
		z: position.z + dt * velocity.z,
	};

	const tol = 0.01;
	let planes: unknown[] = [];
	for (let iter = 0; iter < 5; iter++) {
		planes = [];
		b3.b3World_CollideMover(world, position, capsule, filter, (_s: unknown, arr: { plane: { normal: b3Vec3; offset: number }; point: b3Vec3 }[]) => {
			for (const r of arr) planes.push({ plane: r.plane, pushLimit: PUSH_LIMIT, push: 0, clipVelocity: true });
			return true;
		});
		const targetDelta = { x: target.x - position.x, y: target.y - position.y, z: target.z - position.z };
		const solved = b3.b3SolvePlanes(targetDelta, planes);
		let delta = solved.delta;
		const fraction = b3.b3World_CastMover(world, position, capsule, delta, filter, () => true);
		delta = { x: delta.x * fraction, y: delta.y * fraction, z: delta.z * fraction };
		position = { x: position.x + delta.x, y: position.y + delta.y, z: position.z + delta.z };
		if (delta.x * delta.x + delta.y * delta.y + delta.z * delta.z < tol * tol) break;
	}

	velocity = b3.b3ClipVector(velocity, planes);
}

// drive a kinematic body toward a target position via velocity (so contacts work)
function moveKinematic(body: b3BodyId, tx: number, ty: number, tz: number, dt: number): void {
	const p = b3.b3Body_GetPosition(body);
	b3.b3Body_SetLinearVelocity(body, { x: (tx - p.x) / dt, y: (ty - p.y) / dt, z: (tz - p.z) / dt });
}

let elapsed = 0;

app.onFrame((dt: number) => {
	const h = Math.min(dt, 1 / 30);
	elapsed += h;

	// camera-relative movement basis (flattened to the ground)
	const camDir = new THREE.Vector3();
	app.camera.getWorldDirection(camDir);
	camDir.y = 0; camDir.normalize();
	const forward = { x: camDir.x, y: 0, z: camDir.z };
	const right = { x: -camDir.z, y: 0, z: camDir.x };

	let tx = 0, ty = 0;
	if (keys.has('w')) tx += 1;
	if (keys.has('s')) tx -= 1;
	if (keys.has('d')) ty += 1;
	if (keys.has('a')) ty -= 1;
	if (keys.has(' ') && onGround) { velocity.y = move.jumpSpeed; onGround = false; }

	const oldPos = { ...position };

	app.step(() => {
		// animate the moving platforms
		moveKinematic(sliding, slidingCenter.x + 8 * Math.sin(2 * Math.PI * 0.15 * elapsed), slidingCenter.y, slidingCenter.z, h);
		moveKinematic(
			diagonal,
			diagonalCenter.x + 6 * Math.sin(2 * Math.PI * 0.12 * elapsed),
			diagonalCenter.y + 2 * Math.sin(2 * Math.PI * 0.12 * elapsed),
			diagonalCenter.z,
			h,
		);
		b3.b3World_Step(world, 1 / 60, 4);
		solveMove(h, forward, right, tx, ty);
	});

	renderer.update();
	charMesh.position.set(position.x, position.y, position.z);

	// rigid follow: translate camera + orbit target by the character's delta,
	// preserving the user's orbit offset (crashcat KCC camera behaviour)
	const d = new THREE.Vector3(position.x - oldPos.x, position.y - oldPos.y, position.z - oldPos.z);
	app.camera.position.add(d);
	app.controls.target.set(position.x, position.y, position.z);
});
app.start();
