// Cube Heap — a pile of small cubes
// under strong gravity; one random cube is teleported back to the top each frame
// to keep the heap churning. Number-of-Cubes slider drives the count.

import type { Box3DModule, b3BodyId } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 10, 10], target: [0, 5, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -50, 0]; // strong gravity for lively motion
const world = b3.b3CreateWorld(worldDef);

// static ground
const groundDef = b3.b3DefaultBodyDef();
groundDef.position = [0, -0.5, 0];
const ground = b3.b3CreateBody(world, groundDef);
b3.b3CreateBoxShape(ground, b3.b3DefaultShapeDef(), 50, 0.5, 50);

const cubes: b3BodyId[] = [];
const settings = { numberOfCubes: 200 };
const SPAWN_HEIGHT = 10;
const SPAWN_AREA = 2.5;

const randomInRange = (min: number, max: number): number =>
	Math.random() * (max - min) + min;

function spawnCube(): void {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = [
		randomInRange(-SPAWN_AREA, SPAWN_AREA),
		randomInRange(0, SPAWN_HEIGHT),
		randomInRange(-SPAWN_AREA, SPAWN_AREA),
	];
	const body = b3.b3CreateBody(world, def);
	b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), 0.25, 0.25, 0.25);
	cubes.push(body);
}

function updateCubeCount(): void {
	while (cubes.length < settings.numberOfCubes) spawnCube();
	while (cubes.length > settings.numberOfCubes) {
		const cube = cubes.pop();
		if (cube) b3.b3DestroyBody(cube);
	}
}

updateCubeCount();

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

const gui = app.gui;
gui
	.add(settings, 'numberOfCubes', 0, 1000, 1)
	.name('Number of Cubes')
	.onChange(updateCubeCount);

app.onFrame(() => {
	// teleport one random cube back to the top each frame to keep it churning
	if (cubes.length > 0) {
		const cube = cubes[Math.floor(Math.random() * cubes.length)];
		b3.b3Body_SetTransform(
			cube,
			[0, randomInRange(0, SPAWN_HEIGHT), 0],
			[0, 0, 0, 1],
		);
		b3.b3Body_SetLinearVelocity(cube, [0, 0, 0]);
		b3.b3Body_SetAngularVelocity(cube, [0, 0, 0]);
		b3.b3Body_SetAwake(cube, true);
	}

	app.step(() => b3.b3World_Step(world, 1 / 60, 4));
	renderer.update();
});
app.start();
