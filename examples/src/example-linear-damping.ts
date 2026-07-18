// Linear Damping — a row of boxes
// launched at the same speed (+z) with linear damping 0.0 → 0.9; higher damping
// bleeds off velocity faster, so they travel shorter distances. Press R to reset.

import type { Box3DModule, b3BodyId } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 8, 25], target: [0, 2, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -10, 0];
const world = b3.b3CreateWorld(worldDef);

const floorDef = b3.b3DefaultBodyDef();
floorDef.position = [0, -0.5, 0];
const floor = b3.b3CreateBody(world, floorDef);
const floorShapeDef = b3.b3DefaultShapeDef();
floorShapeDef.baseMaterial.friction = 0;
b3.b3CreateBoxShape(floor, floorShapeDef, 30, 0.5, 60);

const numBoxes = 10;
const spacing = 2.0;
const startHeight = 0.5;
const startX = -((numBoxes - 1) / 2) * spacing;
const LAUNCH: [number, number, number] = [0, 0, 8];

function makeLabel(text: string, x: number, y: number, z: number): void {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	canvas.width = 128;
	canvas.height = 64;
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 28px monospace';
	ctx.textAlign = 'center';
	ctx.fillText(text, 64, 40);
	const sprite = new THREE.Sprite(
		new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }),
	);
	sprite.scale.set(2, 1, 1);
	sprite.position.set(x, y, z);
	app.scene.add(sprite);
}

const boxes: Array<{ body: b3BodyId; x: number }> = [];

for (let i = 0; i < numBoxes; i++) {
	const damping = i * 0.1; // 0.0 .. 0.9
	const x = startX + spacing * i;
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = [x, startHeight, -20];
	def.linearDamping = damping;
	def.linearVelocity = LAUNCH;
	const body = b3.b3CreateBody(world, def);
	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.baseMaterial.friction = 0;
	b3.b3CreateBoxShape(body, shapeDef, 0.5, 0.5, 0.5);
	makeLabel(`d=${damping.toFixed(1)}`, x, startHeight + 1.5, -20);
	boxes.push({ body, x });
}

function reset(): void {
	for (const { body, x } of boxes) {
		b3.b3Body_SetTransform(body, [x, startHeight, -20], [0, 0, 0, 1]);
		b3.b3Body_SetLinearVelocity(body, LAUNCH);
		b3.b3Body_SetAngularVelocity(body, [0, 0, 0]);
		b3.b3Body_SetAwake(body, true);
	}
}
window.addEventListener('keydown', (e) => {
	if (e.key === 'r' || e.key === 'R') reset();
});

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

app.onFrame(() => {
	app.step(() => b3.b3World_Step(world, 1 / 60, 4));
	renderer.update();
});
app.start();
