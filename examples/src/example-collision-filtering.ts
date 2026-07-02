// Collision Filtering — using
// box3d's b3Filter category/mask bits. Two platforms each accept only one group
// of cubes; group-A cubes fall through the upper platform onto the lower one, and
// group-B cubes do the reverse. Everything lands on the ground.

import type { Box3DModule } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [10, 5, 10], target: [0, 1, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -9.81, z: 0 };
const world = b3.b3CreateWorld(worldDef);

// category bits
const GROUND = 1n;
const PLAT_A = 2n;
const PLAT_B = 4n;
const CUBE_A = 8n;
const CUBE_B = 16n;

const filter = (categoryBits: bigint, maskBits: bigint) => ({
	categoryBits,
	maskBits,
	groupIndex: 0,
});

function staticBox(
	x: number,
	y: number,
	z: number,
	hx: number,
	hy: number,
	hz: number,
	category: bigint,
	mask: bigint,
): void {
	const def = b3.b3DefaultBodyDef();
	def.position = { x, y, z };
	const body = b3.b3CreateBody(world, def);
	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.filter = filter(category, mask);
	b3.b3CreateBoxShape(body, shapeDef, hx, hy, hz);
}

// ground collides with all cubes; platform A only with group A, platform B only with group B
staticBox(0, 0, 0, 5.0, 0.1, 5.0, GROUND, CUBE_A | CUBE_B);
staticBox(0, 1.0, 0, 1.0, 0.1, 1.0, PLAT_A, CUBE_A);
staticBox(0, 2.0, 0, 1.0, 0.1, 1.0, PLAT_B, CUBE_B);

// falling cubes, alternating group by z index
const num = 4;
const rad = 0.1;
const shift = rad * 2.0;
const centerx = shift * (num / 2);
const centery = 2.5;
const centerz = shift * (num / 2);

for (let j = 0; j < 4; j++) {
	for (let i = 0; i < num; i++) {
		for (let k = 0; k < num; k++) {
			const isGroupA = k % 2 === 0;
			const def = b3.b3DefaultBodyDef();
			def.type = b3.b3BodyType.b3_dynamicBody;
			def.position = {
				x: i * shift - centerx,
				y: j * shift + centery,
				z: k * shift - centerz,
			};
			const body = b3.b3CreateBody(world, def);
			const shapeDef = b3.b3DefaultShapeDef();
			shapeDef.baseMaterial.friction = 1;
			shapeDef.filter = isGroupA
				? filter(CUBE_A, GROUND | PLAT_A)
				: filter(CUBE_B, GROUND | PLAT_B);
			b3.b3CreateBoxShape(body, shapeDef, rad, rad, rad);
		}
	}
}

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

app.onFrame(() => {
	app.step(() => b3.b3World_Step(world, 1 / 60, 4));
	renderer.update();
});
app.start();
