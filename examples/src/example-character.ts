// Character — a kinematic capsule mover driven by box3d's character-controller
// API (b3World_CollideMover → b3SolvePlanes → b3World_CastMover), a faithful port
// of box3d's CharacterMover. The obstacle course (floor, walls, stairs, ramps,
// pushable props, a spinning platform) is reproduced from crashcat's KCC example.
//
// Controls: WASD move (camera-relative) · Space jump · Shift sprint · drag to orbit.

import type { Box3DModule, b3Vec3 } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 8, 14], target: [0, 1, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld(worldDef);

// ---------------------------------------------------------------------------
// The course (reproduced from crashcat's KCC example, scaled to box3d's mover)
// ---------------------------------------------------------------------------

function staticBox(
	x: number,
	y: number,
	z: number,
	hx: number,
	hy: number,
	hz: number,
	rot?: b3Vec3 & { s?: number },
): void {
	const def = b3.b3DefaultBodyDef();
	def.position = { x, y, z };
	if (rot) def.rotation = rot as unknown as { v: b3Vec3; s: number };
	const body = b3.b3CreateBody(world, def);
	b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), hx, hy, hz);
}

// floor + surrounding walls
staticBox(0, -0.5, 0, 25, 0.5, 25);
staticBox(-25, 1.5, 0, 0.5, 2, 25);
staticBox(25, 1.5, 0, 0.5, 2, 25);
staticBox(0, 1.5, -25, 25, 2, 0.5);
staticBox(0, 1.5, 25, 25, 2, 0.5);

// a flight of low, climbable-by-sliding stairs
for (let i = 0; i < 10; i++) {
	const step = 0.18;
	staticBox(-14 + i * 0.9, i * step, -14, 0.45, step / 2 + (i * step) / 2, 3);
}

// ramps at a few climbable angles (25°, 20°, 15°)
for (let i = 0; i < 3; i++) {
	const angle = ((25 - i * 5) * Math.PI) / 180;
	const q = b3.b3MakeQuatFromAxisAngle({ x: 1, y: 0, z: 0 }, angle);
	staticBox(
		8 + i * 6,
		1.2,
		-12,
		2.5,
		0.3,
		5,
		q as unknown as b3Vec3 & { s?: number },
	);
}

// pushable props (dynamic; the mover slides around them)
function dynamic(
	kind: 'box' | 'sphere',
	x: number,
	y: number,
	z: number,
): void {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x, y, z };
	const body = b3.b3CreateBody(world, def);
	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.density = 20;
	if (kind === 'box') b3.b3CreateBoxShape(body, shapeDef, 0.6, 0.6, 0.6);
	else
		b3.b3CreateSphereShape(body, shapeDef, {
			center: { x: 0, y: 0, z: 0 },
			radius: 0.6,
		});
}
dynamic('box', -6, 3, 8);
dynamic('sphere', -4, 3, 8);

// a slowly spinning kinematic platform
const platDef = b3.b3DefaultBodyDef();
platDef.type = b3.b3BodyType.b3_kinematicBody;
platDef.position = { x: 6, y: 1, z: 8 };
const platform = b3.b3CreateBody(world, platDef);
b3.b3CreateBoxShape(platform, b3.b3DefaultShapeDef(), 3, 0.2, 3);
b3.b3Body_SetAngularVelocity(platform, { x: 0, y: 0.6, z: 0 });

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

// ---------------------------------------------------------------------------
// The mover — a faithful port of box3d's CharacterMover
// ---------------------------------------------------------------------------

const RADIUS = 0.3;
const CAP1 = { x: 0, y: -0.5, z: 0 };
const CAP2 = { x: 0, y: 0.5, z: 0 };
const capsule = { center1: CAP1, center2: CAP2, radius: RADIUS };

// tuning (box3d CharacterMover constants)
const JUMP_SPEED = 5;
const MAX_SPEED = 6;
const MIN_SPEED = 0.01;
const STOP_SPEED = 1;
const ACCELERATE = 30;
const FRICTION = 4;
const GRAVITY = 15;
const PUSH_LIMIT = 3.4e38; // FLT_MAX — rigid planes

let position = { x: 0, y: 2, z: 0 };
let velocity = { x: 0, y: 0, z: 0 };
let pogoVelocity = 0;
let onGround = false;

const filter = b3.b3DefaultQueryFilter();

// character mesh
const charMesh = new THREE.Mesh(
	new THREE.CapsuleGeometry(RADIUS, 1.0, 8, 16),
	new THREE.MeshStandardMaterial({ color: 0xff5555, roughness: 0.4 }),
);
charMesh.castShadow = true;
app.scene.add(charMesh);

// input
const keys = new Set<string>();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const len = (v: b3Vec3) => Math.hypot(v.x, v.y, v.z);
const dot = (a: b3Vec3, b: b3Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

function solveMove(
	dt: number,
	forward: b3Vec3,
	right: b3Vec3,
	tx: number,
	ty: number,
): void {
	// friction
	const speed = len(velocity);
	if (speed < MIN_SPEED) {
		velocity.x = 0;
		velocity.z = 0;
	} else {
		const control = speed < STOP_SPEED ? STOP_SPEED : speed;
		const drop = control * FRICTION * dt;
		const newSpeed = Math.max(0, speed - drop) / speed;
		velocity.x *= newSpeed;
		velocity.y *= newSpeed;
		velocity.z *= newSpeed;
	}

	const sprint = onGround && keys.has('shift');
	const maxSpeed = sprint ? 1.5 * MAX_SPEED : MAX_SPEED;

	const desired = {
		x: maxSpeed * tx * forward.x + maxSpeed * ty * right.x,
		y: 0,
		z: maxSpeed * tx * forward.z + maxSpeed * ty * right.z,
	};
	let desiredSpeed = len(desired);
	const desiredDir =
		desiredSpeed > 1e-6
			? { x: desired.x / desiredSpeed, y: 0, z: desired.z / desiredSpeed }
			: { x: 0, y: 0, z: 0 };
	if (desiredSpeed > maxSpeed) desiredSpeed = maxSpeed;

	if (onGround) velocity.y = 0;

	// accelerate
	const currentSpeed = dot(velocity, desiredDir);
	const addSpeed = desiredSpeed - currentSpeed;
	if (addSpeed > 0) {
		let accel = ACCELERATE * maxSpeed * dt;
		if (accel > addSpeed) accel = addSpeed;
		velocity.x += accel * desiredDir.x;
		velocity.z += accel * desiredDir.z;
	}

	velocity.y -= GRAVITY * dt;

	// pogo ray for ground stick
	const pogoRest = 3 * RADIUS;
	const rayLength = pogoRest + RADIUS;
	const rayOrigin = {
		x: position.x + CAP1.x,
		y: position.y + CAP1.y,
		z: position.z + CAP1.z,
	};
	const rayTranslation = { x: 0, y: -rayLength, z: 0 };
	const ray = b3.b3World_CastRayClosest(
		world,
		rayOrigin,
		rayTranslation,
		filter,
	);
	if (!ray.hit) {
		onGround = false;
		pogoVelocity = 0;
	} else {
		onGround = true;
		const currentLength = ray.fraction * rayLength;
		const zeta = 0.7,
			hertz = 4;
		const omega = 2 * Math.PI * hertz;
		const omegaH = omega * dt;
		pogoVelocity =
			(pogoVelocity - omega * omegaH * (currentLength - pogoRest)) /
			(1 + 2 * zeta * omegaH + omegaH * omegaH);
	}

	const target = {
		x: position.x + dt * velocity.x,
		y: position.y + dt * velocity.y + dt * pogoVelocity,
		z: position.z + dt * velocity.z,
	};

	// collide-and-slide
	const tol = 0.01;
	let planes: unknown[] = [];
	for (let iter = 0; iter < 5; iter++) {
		planes = [];
		b3.b3World_CollideMover(
			world,
			position,
			capsule,
			filter,
			(
				_shapeId: unknown,
				arr: { plane: { normal: b3Vec3; offset: number }; point: b3Vec3 }[],
			) => {
				for (const r of arr)
					planes.push({
						plane: r.plane,
						pushLimit: PUSH_LIMIT,
						push: 0,
						clipVelocity: true,
					});
				return true;
			},
		);

		const targetDelta = {
			x: target.x - position.x,
			y: target.y - position.y,
			z: target.z - position.z,
		};
		const solved = b3.b3SolvePlanes(targetDelta, planes);
		let delta = solved.delta;

		const fraction = b3.b3World_CastMover(
			world,
			position,
			capsule,
			delta,
			filter,
			() => true,
		);
		delta = {
			x: delta.x * fraction,
			y: delta.y * fraction,
			z: delta.z * fraction,
		};
		position = {
			x: position.x + delta.x,
			y: position.y + delta.y,
			z: position.z + delta.z,
		};

		if (delta.x * delta.x + delta.y * delta.y + delta.z * delta.z < tol * tol)
			break;
	}

	// clip velocity against the planes so depenetration doesn't add speed
	velocity = b3.b3ClipVector(velocity, planes);
}

app.onFrame((dt: number) => {
	// camera-relative movement basis (flattened to the ground plane)
	const camDir = new THREE.Vector3();
	app.camera.getWorldDirection(camDir);
	camDir.y = 0;
	camDir.normalize();
	const forward = { x: camDir.x, y: 0, z: camDir.z };
	const right = { x: -camDir.z, y: 0, z: camDir.x };

	let tx = 0,
		ty = 0;
	if (keys.has('w')) tx += 1;
	if (keys.has('s')) tx -= 1;
	if (keys.has('d')) ty += 1;
	if (keys.has('a')) ty -= 1;
	if (keys.has(' ') && onGround) {
		velocity.y = JUMP_SPEED;
		onGround = false;
	}

	app.step(() => {
		b3.b3World_Step(world, 1 / 60, 4);
		solveMove(Math.min(dt, 1 / 30), forward, right, tx, ty);
	});

	renderer.update();
	charMesh.position.set(position.x, position.y, position.z);

	// third-person follow: keep the orbit target on the character
	app.controls.target.lerp(
		new THREE.Vector3(position.x, position.y + 0.5, position.z),
		0.15,
	);
});
app.start();
