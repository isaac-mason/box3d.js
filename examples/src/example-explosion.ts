// Explosion — click anywhere to set off a radial explosion (b3World_Explode) that
// blasts a pyramid of boxes apart. Blast radius and strength are adjustable, and
// the pyramid can be rebuilt. (box3d's default density is 1000 kg/m³, so the
// impulse-per-area is in the thousands to visibly move bodies.)

import type { Box3DModule, b3BodyId } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 8, 18], target: [0, 2, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld(worldDef);

const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const ground = b3.b3CreateBody(world, groundDef);
b3.b3CreateBoxShape(ground, b3.b3DefaultShapeDef(), 30, 0.5, 30);

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

const H = 0.4;
let blocks: b3BodyId[] = [];
function build(): void {
	for (const b of blocks) b3.b3DestroyBody(b);
	blocks = [];
	const rows = 8;
	for (let r = 0; r < rows; r++) {
		const count = rows - r;
		for (let i = 0; i < count; i++) {
			const def = b3.b3DefaultBodyDef();
			def.type = b3.b3BodyType.b3_dynamicBody;
			def.position = {
				x: (i - (count - 1) / 2) * (H * 2 + 0.02),
				y: H + r * (H * 2),
				z: 0,
			};
			const body = b3.b3CreateBody(world, def);
			b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), H, H, H);
			blocks.push(body);
		}
	}
}
build();

const settings = { radius: 6, strength: 12000, rebuild: () => build() };
app.gui.add(settings, 'radius', 1, 15, 0.5).name('blast radius');
app.gui.add(settings, 'strength', 1000, 40000, 1000).name('blast strength');
app.gui.add(settings, 'rebuild').name('rebuild pyramid');

// click to explode at the point under the cursor
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
app.renderer.domElement.addEventListener('pointerdown', (e) => {
	mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
	raycaster.setFromCamera(mouse, app.camera);
	const o = raycaster.ray.origin;
	const d = raycaster.ray.direction;
	const r = b3.b3World_CastRayClosest(
		world,
		{ x: o.x, y: o.y, z: o.z },
		{ x: d.x * 100, y: d.y * 100, z: d.z * 100 },
		b3.b3DefaultQueryFilter(),
	);
	if (!r.hit) return;
	const ex = b3.b3DefaultExplosionDef();
	ex.position = r.point;
	ex.radius = settings.radius;
	ex.falloff = 0.5;
	ex.impulsePerArea = settings.strength;
	b3.b3World_Explode(world, ex);
});

app.onFrame(() => {
	app.step(() => b3.b3World_Step(world, 1 / 60, 4));
	renderer.update();
});
app.start();
