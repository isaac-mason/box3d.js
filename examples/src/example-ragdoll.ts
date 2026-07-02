// Ragdoll — box3d's shared human: a 14-bone humanoid built from capsules linked
// by spherical joints (cone + twist limits) at the spine/neck/shoulders/hips and
// revolute joints (hinge limits) at the elbows and knees. A few of them are
// dropped onto the ground with a random spin and tumble into a heap.

import type { Box3DModule } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';
import { createHuman, type Human } from './ragdoll-human';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 3, 9], target: [0, 1, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld(worldDef);

const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const ground = b3.b3CreateBody(world, groundDef);
b3.b3CreateBoxShape(ground, b3.b3DefaultShapeDef(), 20, 0.5, 20);

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

const params = { count: 5, jointFriction: 0.05, respawn: () => respawn() };
let humans: Human[] = [];
let group = 1;

// a tiny deterministic PRNG so spins vary per body without Math.random churn
let seed = 12345;
function rand(): number {
	seed = (seed * 1103515245 + 12345) & 0x7fffffff;
	return seed / 0x7fffffff;
}

function respawn(): void {
	for (const h of humans) {
		for (const j of h.joints) b3.b3DestroyJoint(j, false);
		for (const b of h.bodies) b3.b3DestroyBody(b);
	}
	humans = [];
	seed = 12345;
	for (let i = 0; i < params.count; i++) {
		const x = (i - (params.count - 1) / 2) * 1.6;
		const human = createHuman(
			b3,
			world,
			{ x, y: 2.2 + rand() * 1.5, z: 0 },
			group++,
			params.jointFriction,
		);
		// give the torso a random tumble
		const m = 8;
		b3.b3Body_ApplyAngularImpulse(
			human.bodies[1],
			{
				x: (rand() * 2 - 1) * m,
				y: (rand() * 2 - 1) * m,
				z: (rand() * 2 - 1) * m,
			},
			true,
		);
		humans.push(human);
	}
}
respawn();

app.gui
	.add(params, 'count', 1, 10, 1)
	.name('ragdolls')
	.onChange(() => respawn());
app.gui
	.add(params, 'jointFriction', 0, 0.3, 0.01)
	.name('joint friction')
	.onChange(() => respawn());
app.gui.add(params, 'respawn').name('respawn (R)');
window.addEventListener('keydown', (e) => {
	if (e.key === 'r' || e.key === 'R') respawn();
});

app.onFrame(() => {
	app.step(() => b3.b3World_Step(world, 1 / 60, 4));
	renderer.update();
});
app.start();
