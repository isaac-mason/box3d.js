// Character — a capsule character-controller driven by box3d's mover API
// (b3World_CollideMover → b3SolvePlanes → b3World_CastMover), a faithful port of
// box3d's CharacterMover. The obstacle course is reproduced from the JoltPhysics KCC
// example: floor + walls, stairs, angled ramps, pushable props, spinning /
// sliding / diagonal kinematic platforms, a triangle-mesh terrain, a bumpy
// sphere field, doubling stepping boxes, and a spring-suspended platform.
//
// The collision planes CollideMover reports for the mover each frame are read
// from the packed plane buffer (getPlaneResultAt) and drawn as yellow points
// with outward normal spikes, so you can see what the controller is sliding on.
//
// Controls: WASD move (camera-relative) · Space jump · Shift sprint · drag to orbit.

import type {
	Box3DModule,
	b3BodyId,
	b3Quat,
	b3Vec3,
	PlaneResultBuffer,
} from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
// crashcat's KCC camera: eye (0,10,20) looking at the character's start (0,10,0)
const app = createHarness({ camera: [0, 10, 20], target: [0, 10, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -25, 0];
const world = b3.b3CreateWorld(worldDef);

// ---------------------------------------------------------------------------
// Course builders
// ---------------------------------------------------------------------------

function staticBox(
	x: number,
	y: number,
	z: number,
	hx: number,
	hy: number,
	hz: number,
	q?: b3Quat,
): b3BodyId {
	const def = b3.b3DefaultBodyDef();
	def.position = [x, y, z];
	if (q) def.rotation = q;
	const body = b3.b3CreateBody(world, def);
	b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), hx, hy, hz);
	return body;
}

function staticSphere(x: number, y: number, z: number, r: number): void {
	const def = b3.b3DefaultBodyDef();
	def.position = [x, y, z];
	const body = b3.b3CreateBody(world, def);
	b3.b3CreateSphereShape(body, b3.b3DefaultShapeDef(), {
		center: [0, 0, 0],
		radius: r,
	});
}

function dynamic(
	kind: 'box' | 'sphere',
	x: number,
	y: number,
	z: number,
	r: number,
): void {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = [x, y, z];
	const body = b3.b3CreateBody(world, def);
	const sd = b3.b3DefaultShapeDef();
	sd.density = 40;
	if (kind === 'box') b3.b3CreateBoxShape(body, sd, r, r, r);
	else b3.b3CreateSphereShape(body, sd, { center: [0, 0, 0], radius: r });
}

function kinematic(
	x: number,
	y: number,
	z: number,
	hx: number,
	hy: number,
	hz: number,
): b3BodyId {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_kinematicBody;
	def.position = [x, y, z];
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
		staticBox(
			15 + 5 * j,
			i * stepHeight - 0.5 + stepHeight / 2,
			-20 - i * 3,
			2,
			stepHeight / 2,
			2,
		);
	}
}

// slopes — 10 angled boxes from 70° down to 25°
for (let i = 0; i < 10; i++) {
	const angle = ((70 - i * 5) * Math.PI) / 180;
	const q = b3.b3MakeQuatFromAxisAngle([1, 0, 0], angle);
	staticBox(-40 + 5 * i, 2, -25, 2.5, 0.6, 8, q);
}

// pushable props
dynamic('box', -10, 5, 10, 0.75);
dynamic('sphere', -8, 2, 10, 0.75);

// spinning kinematic platform
const spinning = kinematic(0, 2, 15, 4, 0.2, 4);
b3.b3Body_SetAngularVelocity(spinning, [0, 0.6, 0]);

// sliding + diagonal kinematic platforms (animated in the loop)
const sliding = kinematic(20, 2, -5, 3, 0.2, 3);
const slidingCenter = { x: 20, y: 2, z: -5 };
const diagonal = kinematic(20, 3, 5, 3, 0.2, 3);
const diagonalCenter = { x: 20, y: 3, z: 5 };

// triangle-mesh terrain (16×16 heightfield), drawn by us since the renderer
// can't introspect a mesh shape
{
	const grid = 16,
		cell = 2,
		hScale = 2;
	const meshPos: b3Vec3 = [-30, 2, 30];
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
			const bl = iz * row + ix,
				br = bl + 1,
				tl = bl + row,
				tr = tl + 1;
			indices[t++] = bl;
			indices[t++] = tl;
			indices[t++] = br;
			indices[t++] = br;
			indices[t++] = tl;
			indices[t++] = tr;
		}
	}
	const meshData = b3.b3CreateMesh(positions, indices);
	const body = b3.b3CreateBody(
		world,
		(() => {
			const d = b3.b3DefaultBodyDef();
			d.position = meshPos;
			return d;
		})(),
	);
	b3.b3CreateMeshShape(body, b3.b3DefaultShapeDef(), meshData, [1, 1, 1]);

	const geom = new THREE.BufferGeometry();
	geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geom.setIndex(new THREE.BufferAttribute(indices, 1));
	geom.computeVertexNormals();
	const mesh = new THREE.Mesh(
		geom,
		new THREE.MeshStandardMaterial({ color: 0x3d6b4f, roughness: 0.95 }),
	);
	mesh.position.set(meshPos[0], meshPos[1], meshPos[2]);
	mesh.receiveShadow = true;
	app.scene.add(mesh);
}

// bumpy floor — a field of half-buried spheres
const bumps = [
	[25, 28, 0.8],
	[29, 32, 0.9],
	[23, 34, 0.7],
	[31, 28, 0.85],
	[27, 30, 1.0],
	[22, 30, 0.5],
	[32, 30, 0.55],
	[25, 26, 0.45],
	[29, 34, 0.6],
	[21, 32, 0.5],
	[33, 32, 0.48],
	[27, 35, 0.52],
	[27, 25, 0.55],
	[24, 31, 0.35],
	[30, 29, 0.3],
	[26, 33, 0.38],
	[28, 27, 0.32],
	[22, 28, 0.28],
	[32, 34, 0.34],
	[20, 30, 0.4],
	[34, 30, 0.36],
	[23, 36, 0.33],
	[31, 26, 0.31],
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
	const center: b3Vec3 = [-10, 5, 35];
	const half: b3Vec3 = [3, 0.3, 3];
	const anchorHeight = 12;
	const platDef = b3.b3DefaultBodyDef();
	platDef.type = b3.b3BodyType.b3_dynamicBody;
	platDef.position = center;
	platDef.linearDamping = 0.5;
	platDef.angularDamping = 0.5;
	const plat = b3.b3CreateBody(world, platDef);
	b3.b3CreateBoxShape(plat, b3.b3DefaultShapeDef(), half[0], half[1], half[2]);

	for (const [sx, sz] of [
		[-half[0], -half[2]],
		[half[0], -half[2]],
		[-half[0], half[2]],
		[half[0], half[2]],
	]) {
		const anchorDef = b3.b3DefaultBodyDef();
		anchorDef.position = [center[0] + sx, anchorHeight, center[2] + sz];
		const anchor = b3.b3CreateBody(world, anchorDef);
		const jd = b3.b3DefaultDistanceJointDef();
		jd.base.bodyIdA = anchor;
		jd.base.bodyIdB = plat;
		jd.base.localFrameA = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };
		jd.base.localFrameB = { position: [sx, half[1], sz], quaternion: [0, 0, 0, 1] };
		jd.length = anchorHeight - center[1];
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
const CAP1: b3Vec3 = [0, -1, 0];
const CAP2: b3Vec3 = [0, 1, 0];
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

let position: b3Vec3 = [0, 8, 0];
let velocity: b3Vec3 = [0, 0, 0];
let pogoVelocity = 0;
let onGround = false;

const filter = b3.b3DefaultQueryFilter();

const charMesh = new THREE.Mesh(
	new THREE.CapsuleGeometry(RADIUS, 2.0, 8, 16),
	new THREE.MeshStandardMaterial({ color: 0xff5555, roughness: 0.4 }),
);
charMesh.castShadow = true;
app.scene.add(charMesh);

// ---------------------------------------------------------------------------
// Collision-plane visualization — the planes b3World_CollideMover reports for
// the mover each frame, drawn as a point (yellow sphere) + outward normal spike.
// These are read from the packed plane buffer via getPlaneResultAt (see solveMove).
// ---------------------------------------------------------------------------
const MAX_PLANES = 64;
const planeMat = new THREE.MeshBasicMaterial({ color: 0xffcc33, depthTest: false });
const planePointsMesh = new THREE.InstancedMesh(
	new THREE.SphereGeometry(0.07, 8, 6),
	planeMat,
	MAX_PLANES,
);
const planeNormalsMesh = new THREE.InstancedMesh(
	new THREE.CylinderGeometry(0.02, 0.02, 1, 6),
	planeMat,
	MAX_PLANES,
);
planePointsMesh.count = 0;
planeNormalsMesh.count = 0;
planePointsMesh.frustumCulled = false;
planeNormalsMesh.frustumCulled = false;
planePointsMesh.renderOrder = 999;
planeNormalsMesh.renderOrder = 999;
app.scene.add(planePointsMesh, planeNormalsMesh);

// captured each frame (reused, zero-alloc) from the CollideMover callback
const planeViz = Array.from({ length: MAX_PLANES }, () => ({
	px: 0,
	py: 0,
	pz: 0,
	nx: 0,
	ny: 0,
	nz: 0,
}));
let planeVizCount = 0;
const _planeDummy = new THREE.Object3D();
const _planeUp = new THREE.Vector3(0, 1, 0);
const _planeN = new THREE.Vector3();

function updatePlaneViz(): void {
	const SPIKE = 0.6;
	for (let i = 0; i < planeVizCount; i++) {
		const v = planeViz[i];
		_planeDummy.quaternion.identity();
		_planeDummy.scale.setScalar(1);
		_planeDummy.position.set(v.px, v.py, v.pz);
		_planeDummy.updateMatrix();
		planePointsMesh.setMatrixAt(i, _planeDummy.matrix);

		_planeN.set(v.nx, v.ny, v.nz);
		_planeDummy.quaternion.setFromUnitVectors(_planeUp, _planeN);
		_planeDummy.scale.set(1, SPIKE, 1);
		_planeDummy.position.set(
			v.px + v.nx * SPIKE * 0.5,
			v.py + v.ny * SPIKE * 0.5,
			v.pz + v.nz * SPIKE * 0.5,
		);
		_planeDummy.updateMatrix();
		planeNormalsMesh.setMatrixAt(i, _planeDummy.matrix);
	}
	planePointsMesh.count = planeVizCount;
	planeNormalsMesh.count = planeVizCount;
	planePointsMesh.instanceMatrix.needsUpdate = true;
	planeNormalsMesh.instanceMatrix.needsUpdate = true;
}

const keys = new Set<string>();
window.addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

const len = (v: b3Vec3) => Math.hypot(v[0], v[1], v[2]);
const dot = (a: b3Vec3, b: b3Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function solveMove(
	dt: number,
	forward: b3Vec3,
	right: b3Vec3,
	tx: number,
	ty: number,
): void {
	const speed = len(velocity);
	if (speed < MIN_SPEED) {
		velocity[0] = 0;
		velocity[2] = 0;
	} else {
		const control = speed < STOP_SPEED ? STOP_SPEED : speed;
		const drop = control * FRICTION * dt;
		const scale = Math.max(0, speed - drop) / speed;
		velocity[0] *= scale;
		velocity[1] *= scale;
		velocity[2] *= scale;
	}

	const sprint = onGround && keys.has('shift');
	const maxSpeed = sprint ? 1.5 * move.maxSpeed : move.maxSpeed;

	const desired: b3Vec3 = [
		maxSpeed * tx * forward[0] + maxSpeed * ty * right[0],
		0,
		maxSpeed * tx * forward[2] + maxSpeed * ty * right[2],
	];
	let desiredSpeed = len(desired);
	const dir: b3Vec3 =
		desiredSpeed > 1e-6
			? [desired[0] / desiredSpeed, 0, desired[2] / desiredSpeed]
			: [0, 0, 0];
	if (desiredSpeed > maxSpeed) desiredSpeed = maxSpeed;

	if (onGround) velocity[1] = 0;

	const currentSpeed = dot(velocity, dir);
	const addSpeed = desiredSpeed - currentSpeed;
	if (addSpeed > 0) {
		let accel = ACCELERATE * maxSpeed * dt;
		if (accel > addSpeed) accel = addSpeed;
		velocity[0] += accel * dir[0];
		velocity[2] += accel * dir[2];
	}

	velocity[1] -= move.gravity * dt;

	// pogo ray for ground stick. Only engage when settled or descending — while
	// rising from a jump we stay "airborne" so the suspension spring doesn't yank
	// the character straight back down.
	const rayLength = POGO_REST + RADIUS;
	const rayOrigin: b3Vec3 = [
		position[0] + CAP1[0],
		position[1] + CAP1[1],
		position[2] + CAP1[2],
	];
	const ray = b3.b3World_CastRayClosest(world, rayOrigin, [0, -rayLength, 0], filter);
	if (ray.hit && velocity[1] <= 0.1) {
		onGround = true;
		const currentLength = ray.fraction * rayLength;
		const zeta = 0.7,
			hertz = 8;
		const omega = 2 * Math.PI * hertz;
		const omegaH = omega * dt;
		pogoVelocity =
			(pogoVelocity - omega * omegaH * (currentLength - POGO_REST)) /
			(1 + 2 * zeta * omegaH + omegaH * omegaH);
	} else {
		onGround = false;
		pogoVelocity = 0;
	}

	const target: b3Vec3 = [
		position[0] + dt * velocity[0],
		position[1] + dt * velocity[1] + dt * pogoVelocity,
		position[2] + dt * velocity[2],
	];

	const tol = 0.01;
	let planes: unknown[] = [];
	// Reusable scratch for reading the packed plane buffer the callback receives.
	const planeResult = b3.createPlaneResult();
	planeVizCount = 0; // capture the first iteration's planes for visualization
	for (let iter = 0; iter < 5; iter++) {
		planes = [];
		b3.b3World_CollideMover(
			world,
			position,
			capsule,
			filter,
			(_s: unknown, buf: PlaneResultBuffer) => {
				for (let i = 0, n = b3.getNumPlaneResults(buf); i < n; i++) {
					b3.getPlaneResultAt(planeResult, buf, i);
					// planeResult.plane.normal / .point are facade {x,y,z} objects
					const nrm = planeResult.plane.normal;
					planes.push({
						plane: { normal: [nrm.x, nrm.y, nrm.z], offset: planeResult.plane.offset },
						pushLimit: PUSH_LIMIT,
						push: 0,
						clipVelocity: true,
					});
					if (iter === 0 && planeVizCount < MAX_PLANES) {
						const v = planeViz[planeVizCount++];
						// point is relative to the mover origin — offset into world space.
						v.px = position[0] + planeResult.point.x;
						v.py = position[1] + planeResult.point.y;
						v.pz = position[2] + planeResult.point.z;
						v.nx = nrm.x;
						v.ny = nrm.y;
						v.nz = nrm.z;
					}
				}
				return true;
			},
		);
		const targetDelta: b3Vec3 = [
			target[0] - position[0],
			target[1] - position[1],
			target[2] - position[2],
		];
		const solved = b3.b3SolvePlanes(targetDelta, planes);
		let delta = solved.delta;
		const fraction = b3.b3World_CastMover(world, position, capsule, delta, filter, () => true);
		delta = [delta[0] * fraction, delta[1] * fraction, delta[2] * fraction];
		position = [position[0] + delta[0], position[1] + delta[1], position[2] + delta[2]];
		if (delta[0] * delta[0] + delta[1] * delta[1] + delta[2] * delta[2] < tol * tol)
			break;
	}

	velocity = b3.b3ClipVector(velocity, planes);
}

// drive a kinematic body toward a target position via velocity (so contacts work)
const _kpos: b3Vec3 = [0, 0, 0];
function moveKinematic(
	body: b3BodyId,
	tx: number,
	ty: number,
	tz: number,
	dt: number,
): void {
	b3.b3Body_GetPosition(_kpos, body);
	b3.b3Body_SetLinearVelocity(body, [
		(tx - _kpos[0]) / dt,
		(ty - _kpos[1]) / dt,
		(tz - _kpos[2]) / dt,
	]);
}

let elapsed = 0;

app.onFrame((dt: number) => {
	const h = Math.min(dt, 1 / 30);
	elapsed += h;

	// camera-relative movement basis (flattened to the ground)
	const camDir = new THREE.Vector3();
	app.camera.getWorldDirection(camDir);
	camDir.y = 0;
	camDir.normalize();
	const forward: b3Vec3 = [camDir.x, 0, camDir.z];
	const right: b3Vec3 = [-camDir.z, 0, camDir.x];

	let tx = 0,
		ty = 0;
	if (keys.has('w')) tx += 1;
	if (keys.has('s')) tx -= 1;
	if (keys.has('d')) ty += 1;
	if (keys.has('a')) ty -= 1;
	if (keys.has(' ') && onGround) {
		velocity[1] = move.jumpSpeed;
		onGround = false;
	}

	const oldPos: b3Vec3 = [position[0], position[1], position[2]];

	app.step(() => {
		// animate the moving platforms
		moveKinematic(
			sliding,
			slidingCenter.x + 8 * Math.sin(2 * Math.PI * 0.15 * elapsed),
			slidingCenter.y,
			slidingCenter.z,
			h,
		);
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
	updatePlaneViz();
	charMesh.position.set(position[0], position[1], position[2]);

	// rigid follow: translate camera + orbit target by the character's delta,
	// preserving the user's orbit offset (crashcat KCC camera behaviour)
	const d = new THREE.Vector3(
		position[0] - oldPos[0],
		position[1] - oldPos[1],
		position[2] - oldPos[2],
	);
	app.camera.position.add(d);
	app.controls.target.set(position[0], position[1], position[2]);
});
app.start();
