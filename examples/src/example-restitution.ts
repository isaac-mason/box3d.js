// Restitution — six spheres dropped
// from the same height with restitution 0.0 → 1.0; the bounce heights fan out.
// Press R to reset.

import type { Box3DModule, b3BodyId } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 8, 20], target: [0, 3, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -10, 0];
const world = b3.b3CreateWorld(worldDef);

// static floor (top surface at y = 1)
const floorDef = b3.b3DefaultBodyDef();
floorDef.position = [0, 0, 0];
const floor = b3.b3CreateBody(world, floorDef);
const floorShapeDef = b3.b3DefaultShapeDef();
floorShapeDef.baseMaterial.friction = 0.5;
b3.b3CreateBoxShape(floor, floorShapeDef, 15, 1, 10);

const restitutionValues = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
const spacing = 3;
const dropHeight = 5.0;

function makeLabel(text: string, x: number, y: number, z: number): void {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	canvas.width = 128;
	canvas.height = 64;
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 32px monospace';
	ctx.textAlign = 'center';
	ctx.fillText(text, 64, 40);
	const sprite = new THREE.Sprite(
		new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }),
	);
	sprite.scale.set(2, 1, 1);
	sprite.position.set(x, y, z);
	app.scene.add(sprite);
}

const balls: Array<{ body: b3BodyId; x: number }> = [];

for (let i = 0; i < restitutionValues.length; i++) {
	const restitution = restitutionValues[i];
	const x = (i - (restitutionValues.length - 1) / 2) * spacing;

	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = [x, dropHeight, 0];
	const body = b3.b3CreateBody(world, def);

	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.baseMaterial.friction = 0.5;
	shapeDef.baseMaterial.restitution = restitution;
	b3.b3CreateSphereShape(body, shapeDef, {
		center: [0, 0, 0],
		radius: 0.5,
	});

	makeLabel(`e=${restitution.toFixed(1)}`, x, dropHeight + 1.5, 0);
	balls.push({ body, x });
}

function reset(): void {
	for (const { body, x } of balls) {
		b3.b3Body_SetTransform(body, [x, dropHeight, 0], [0, 0, 0, 1]);
		b3.b3Body_SetLinearVelocity(body, [0, 0, 0]);
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
