// Joints — every box3d joint type laid out side by side, labelled. Conventions:
// revolute hinges about the joint frame's local z-axis, prismatic slides along
// local x, spherical cone is about frame z. Each demo is built at a grid cell
// origin; the joint frame offsets are identical to the single-cell case.

import type { Box3DModule, b3Quat } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 20, 30], target: [0, 2, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -10, 0];
const world = b3.b3CreateWorld(worldDef);

const ID: b3Quat = [0, 0, 0, 1];
const Z_TO_Y: b3Quat = [Math.SQRT1_2, 0, 0, Math.SQRT1_2]; // frame z -> +Y

// body helpers that place at a grid-cell origin (ox, oz); joint frame offsets stay the same
function ground(ox: number, oz: number) {
	const d = b3.b3DefaultBodyDef();
	d.position = [ox, 0, oz];
	return b3.b3CreateBody(world, d);
}
function dyn(ox: number, oz: number, x: number, y: number, z: number) {
	const d = b3.b3DefaultBodyDef();
	d.type = b3.b3BodyType.b3_dynamicBody;
	d.position = [ox + x, y, oz + z];
	return b3.b3CreateBody(world, d);
}

type Scene = (ox: number, oz: number) => ((dt: number) => void) | void;

const scenes: Array<[string, Scene]> = [
	[
		'Revolute',
		(ox, oz) => {
			const hub = ground(ox, oz);
			const arm = dyn(ox, oz, 2, 5, 0);
			b3.b3CreateBoxShape(arm, b3.b3DefaultShapeDef(), 1.5, 0.25, 0.25);
			const jd = b3.b3DefaultRevoluteJointDef();
			jd.base.bodyIdA = hub;
			jd.base.bodyIdB = arm;
			jd.base.localFrameA = { position: [0, 5, 0], quaternion: Z_TO_Y };
			jd.base.localFrameB = { position: [-2, 0, 0], quaternion: Z_TO_Y };
			jd.enableMotor = true;
			jd.motorSpeed = 2;
			jd.maxMotorTorque = 20000;
			b3.b3CreateRevoluteJoint(world, jd);
		},
	],
	[
		'Prismatic',
		(ox, oz) => {
			const g = ground(ox, oz);
			const slider = dyn(ox, oz, 0, 5, 0);
			b3.b3CreateBoxShape(slider, b3.b3DefaultShapeDef(), 0.5, 0.5, 0.5);
			const jd = b3.b3DefaultPrismaticJointDef();
			jd.base.bodyIdA = g;
			jd.base.bodyIdB = slider;
			jd.base.localFrameA = { position: [0, 5, 0], quaternion: ID };
			jd.base.localFrameB = { position: [0, 0, 0], quaternion: ID };
			jd.enableLimit = true;
			jd.lowerTranslation = -2.5;
			jd.upperTranslation = 2.5;
			jd.enableMotor = true;
			jd.maxMotorForce = 50000;
			const joint = b3.b3CreatePrismaticJoint(world, jd);
			let t = 0;
			return (dt) => {
				t += dt;
				b3.b3PrismaticJoint_SetMotorSpeed(joint, Math.sin(t) * 4);
			};
		},
	],
	[
		'Spherical',
		(ox, oz) => {
			const hub = ground(ox, oz);
			const bob = dyn(ox, oz, 0, 3, 0);
			b3.b3CreateSphereShape(bob, b3.b3DefaultShapeDef(), {
				center: [0, 0, 0],
				radius: 0.5,
			});
			const jd = b3.b3DefaultSphericalJointDef();
			jd.base.bodyIdA = hub;
			jd.base.bodyIdB = bob;
			jd.base.localFrameA = { position: [0, 5, 0], quaternion: Z_TO_Y };
			jd.base.localFrameB = { position: [0, 2, 0], quaternion: Z_TO_Y };
			jd.enableConeLimit = true;
			jd.coneAngle = 0.6;
			b3.b3CreateSphericalJoint(world, jd);
			b3.b3Body_SetLinearVelocity(bob, [4, 0, 2]);
		},
	],
	[
		'Weld',
		(ox, oz) => {
			const hub = ground(ox, oz);
			const a = dyn(ox, oz, 0, 5, 0);
			b3.b3CreateBoxShape(a, b3.b3DefaultShapeDef(), 1.5, 0.25, 0.25);
			const b = dyn(ox, oz, 1.5, 4, 0);
			b3.b3CreateBoxShape(b, b3.b3DefaultShapeDef(), 0.25, 1, 0.25);
			const rj = b3.b3DefaultRevoluteJointDef();
			rj.base.bodyIdA = hub;
			rj.base.bodyIdB = a;
			rj.base.localFrameA = { position: [-1.5, 5, 0], quaternion: Z_TO_Y };
			rj.base.localFrameB = { position: [-1.5, 0, 0], quaternion: Z_TO_Y };
			b3.b3CreateRevoluteJoint(world, rj);
			const wj = b3.b3DefaultWeldJointDef();
			wj.base.bodyIdA = a;
			wj.base.bodyIdB = b;
			wj.base.localFrameA = { position: [1.5, 0, 0], quaternion: ID };
			wj.base.localFrameB = { position: [0, 1, 0], quaternion: ID };
			b3.b3CreateWeldJoint(world, wj);
		},
	],
	[
		'Distance',
		(ox, oz) => {
			const hub = ground(ox, oz);
			const bob = dyn(ox, oz, 0, 3, 0);
			b3.b3CreateSphereShape(bob, b3.b3DefaultShapeDef(), {
				center: [0, 0, 0],
				radius: 0.5,
			});
			const jd = b3.b3DefaultDistanceJointDef();
			jd.base.bodyIdA = hub;
			jd.base.bodyIdB = bob;
			jd.base.localFrameA = { position: [0, 6, 0], quaternion: ID };
			jd.base.localFrameB = { position: [0, 0, 0], quaternion: ID };
			jd.length = 3;
			jd.enableSpring = true;
			jd.hertz = 1.5;
			jd.dampingRatio = 0.2;
			b3.b3CreateDistanceJoint(world, jd);
		},
	],
	[
		'Wheel',
		(ox, oz) => {
			const hub = ground(ox, oz);
			const wheel = dyn(ox, oz, 0, 3, 0);
			b3.b3CreateCapsuleShape(wheel, b3.b3DefaultShapeDef(), {
				center1: [-0.15, 0, 0],
				center2: [0.15, 0, 0],
				radius: 1,
			});
			const jd = b3.b3DefaultWheelJointDef();
			jd.base.bodyIdA = hub;
			jd.base.bodyIdB = wheel;
			jd.base.localFrameA = { position: [0, 5, 0], quaternion: Z_TO_Y };
			jd.base.localFrameB = { position: [0, 0, 0], quaternion: Z_TO_Y };
			jd.enableSuspensionSpring = true;
			jd.suspensionHertz = 2;
			jd.suspensionDampingRatio = 0.3;
			jd.enableSpinMotor = true;
			jd.spinSpeed = 6;
			jd.maxSpinTorque = 50000;
			b3.b3CreateWheelJoint(world, jd);
		},
	],
	[
		'Motor',
		(ox, oz) => {
			const target = b3.b3CreateBody(
				world,
				Object.assign(b3.b3DefaultBodyDef(), {
					type: b3.b3BodyType.b3_kinematicBody,
					position: [ox, 4, oz],
				}),
			);
			const box = dyn(ox, oz, 3, 4, 0);
			b3.b3CreateBoxShape(box, b3.b3DefaultShapeDef(), 0.5, 0.5, 0.5);
			const jd = b3.b3DefaultMotorJointDef();
			jd.base.bodyIdA = target;
			jd.base.bodyIdB = box;
			jd.linearHertz = 4;
			jd.linearDampingRatio = 0.7;
			jd.maxSpringForce = 1e6;
			jd.angularHertz = 4;
			jd.angularDampingRatio = 0.7;
			jd.maxSpringTorque = 1e6;
			b3.b3CreateMotorJoint(world, jd);
			let t = 0;
			return (dt) => {
				t += dt;
				b3.b3Body_SetTransform(
					target,
					[ox + Math.cos(t) * 2.5, 4 + Math.sin(t * 1.3) * 1.5, oz],
					ID,
				);
			};
		},
	],
	[
		'Parallel',
		(ox, oz) => {
			const g = ground(ox, oz);
			const plate = dyn(ox, oz, 0, 4, 0);
			b3.b3CreateBoxShape(plate, b3.b3DefaultShapeDef(), 1.3, 0.15, 1.3);
			const pin = b3.b3DefaultSphericalJointDef();
			pin.base.bodyIdA = g;
			pin.base.bodyIdB = plate;
			pin.base.localFrameA = { position: [0, 4, 0], quaternion: ID };
			pin.base.localFrameB = { position: [0, 0, 0], quaternion: ID };
			b3.b3CreateSphericalJoint(world, pin);
			const jd = b3.b3DefaultParallelJointDef();
			jd.base.bodyIdA = g;
			jd.base.bodyIdB = plate;
			jd.base.localFrameA = { position: [0, 4, 0], quaternion: Z_TO_Y };
			jd.base.localFrameB = { position: [0, 0, 0], quaternion: Z_TO_Y };
			jd.hertz = 2;
			jd.dampingRatio = 0.5;
			jd.maxTorque = 1e6;
			b3.b3CreateParallelJoint(world, jd);
			b3.b3Body_SetAngularVelocity(plate, [3, 0, 2]);
		},
	],
	[
		'Filter',
		(ox, oz) => {
			const floor = ground(ox, oz);
			const fd = b3.b3DefaultShapeDef();
			b3.b3CreateBoxShape(floor, fd, 2, 0.5, 2);
			const a = dyn(ox, oz, 0, 1.4, 0);
			b3.b3CreateBoxShape(a, b3.b3DefaultShapeDef(), 0.6, 0.6, 0.6);
			const b = dyn(ox, oz, 0.4, 2, 0.3); // overlaps a, but the filter joint stops them colliding
			b3.b3CreateBoxShape(b, b3.b3DefaultShapeDef(), 0.6, 0.6, 0.6);
			const jd = b3.b3DefaultFilterJointDef();
			jd.base.bodyIdA = a;
			jd.base.bodyIdB = b;
			b3.b3CreateFilterJoint(world, jd);
		},
	],
];

// labels
function makeLabel(text: string, x: number, y: number, z: number): void {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	canvas.width = 256;
	canvas.height = 64;
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 34px sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText(text, 128, 44);
	const sprite = new THREE.Sprite(
		new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }),
	);
	sprite.scale.set(4, 1, 1);
	sprite.position.set(x, y, z);
	app.scene.add(sprite);
}

// lay out in a 3×3 grid
const SPACING = 9;
const updates: Array<(dt: number) => void> = [];
scenes.forEach(([name, build], i) => {
	const ox = ((i % 3) - 1) * SPACING;
	const oz = (Math.floor(i / 3) - 1) * SPACING;
	const u = build(ox, oz);
	if (u) updates.push(u);
	makeLabel(name, ox, 7.5, oz);
});

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

app.onFrame((dt) => {
	for (const u of updates) u(dt);
	app.step(() => b3.b3World_Step(world, 1 / 60, 4));
	renderer.update();
});
app.start();
