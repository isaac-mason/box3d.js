// Multithreading — a cube-heap stress test that runs box3d's solver across
// worker threads. box3d's internal scheduler spreads a world step over
// worldDef.workerCount threads (backed by the Emscripten pthread pool) when the
// multithreaded build is used. This needs cross-origin isolation for
// SharedArrayBuffer; coi-serviceworker (see the HTML) provides it on Pages, and
// the example falls back to a single-threaded build when isolation is absent.

import type { Box3DModule } from 'box3d.js';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const statusEl = document.getElementById('status')!;
const isolated = self.crossOriginIsolated === true;

// Pick the build: multithreaded when isolated, single-threaded otherwise.
const factory = isolated
	? (await import('box3d.js/mt-inline')).default
	: (await import('box3d.js/inline')).default;
const b3: Box3DModule = await factory();

const hardware = navigator.hardwareConcurrency ?? 4;
const maxWorkers = Math.min(hardware, 16);

const app = createHarness({ camera: [0, 14, 20], target: [0, 5, 0] });

/* physics world */

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -30, z: 0 };
worldDef.workerCount = isolated
	? Math.max(2, Math.min(maxWorkers, hardware - 1))
	: 1;
const world = b3.b3CreateWorld(worldDef);

// static ground
const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const ground = b3.b3CreateBody(world, groundDef);
b3.b3CreateBoxShape(ground, b3.b3DefaultShapeDef(), 12, 0.5, 12);

/* cube heap */

const cubes: ReturnType<typeof b3.b3CreateBody>[] = [];
const SPAWN_HEIGHT = 14;
const SPAWN_AREA = 5;
const randomInRange = (min: number, max: number): number =>
	Math.random() * (max - min) + min;

function spawnCube(): void {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = {
		x: randomInRange(-SPAWN_AREA, SPAWN_AREA),
		y: randomInRange(0, SPAWN_HEIGHT),
		z: randomInRange(-SPAWN_AREA, SPAWN_AREA),
	};
	const body = b3.b3CreateBody(world, def);
	b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), 0.25, 0.25, 0.25);
	cubes.push(body);
}

const settings = {
	numberOfCubes: isolated ? 800 : 300,
	workers: worldDef.workerCount,
};

function updateCubeCount(): void {
	while (cubes.length < settings.numberOfCubes) spawnCube();
	while (cubes.length > settings.numberOfCubes) {
		const cube = cubes.pop();
		if (cube) b3.b3DestroyBody(cube);
	}
}
updateCubeCount();

/* renderer + GUI */

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

const gui = app.gui;
gui
	.add(settings, 'numberOfCubes', 0, 2000, 1)
	.name('number of cubes')
	.onChange(updateCubeCount);
const workerCtrl = gui
	.add(settings, 'workers', 1, maxWorkers, 1)
	.name('worker threads')
	.onChange((n: number) => {
		b3.b3World_SetWorkerCount(world, n);
	});
if (!isolated) workerCtrl.disable();

/* status overlay + fps */

let frames = 0;
let fps = 0;
let lastFpsTime = performance.now();

function renderStatus(): void {
	if (isolated) {
		statusEl.innerHTML =
			`<b>Multithreading</b><br />` +
			`<b>${settings.workers}</b> worker threads (of ${hardware} cores)<br />` +
			`${cubes.length} cubes · <b>${fps}</b> fps`;
	} else {
		statusEl.innerHTML =
			`<b>Multithreading — single-threaded fallback</b><br />` +
			`not cross-origin isolated (no SharedArrayBuffer)<br />` +
			`${cubes.length} cubes · <b>${fps}</b> fps · ` +
			`<a href="${location.href}" target="_blank" style="pointer-events:auto;color:#7cc5ff">open in new tab</a> to enable threads`;
	}
}
renderStatus();

app.onFrame(() => {
	app.step(() => b3.b3World_Step(world, 1 / 60, 4));

	// keep the heap churning: fling a few cubes back up each frame
	for (let i = 0; i < 3 && cubes.length > 0; i++) {
		const cube = cubes[Math.floor(Math.random() * cubes.length)];
		b3.b3Body_SetTransform(
			cube,
			{ x: 0, y: randomInRange(4, SPAWN_HEIGHT), z: 0 },
			{ v: { x: 0, y: 0, z: 0 }, s: 1 },
		);
		b3.b3Body_SetLinearVelocity(cube, {
			x: randomInRange(-3, 3),
			y: 0,
			z: randomInRange(-3, 3),
		});
	}

	renderer.update();

	frames++;
	const now = performance.now();
	if (now - lastFpsTime >= 500) {
		fps = Math.round((frames * 1000) / (now - lastFpsTime));
		frames = 0;
		lastFpsTime = now;
		renderStatus();
	}
});
app.start();
