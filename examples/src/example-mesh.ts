// Mesh — box3d's procedural triangle-mesh generators (b3CreateWaveMesh,
// b3CreateTorusMesh, b3CreateBoxMesh, b3CreateGridMesh). Each is created as a
// static mesh shape and drawn by reading its geometry back out of box3d
// (b3GetMeshVertices / b3GetMeshIndices). Dynamic props rain down and settle on
// the generated terrain. Ported from box3d's sample_mesh.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId, b3MeshData, b3Vec3 } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 18, 30], target: [0, 0, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -10, 0];
const world = b3.b3CreateWorld(worldDef);

// Create a static mesh body from generated mesh data, and a matching THREE mesh
// (the generic renderer can't introspect mesh shapes, so we draw it here).
function addMesh(mesh: b3MeshData, pos: b3Vec3, color: number): void {
	const def = b3.b3DefaultBodyDef();
	def.position = pos;
	const body = b3.b3CreateBody(world, def);
	b3.b3CreateMeshShape(body, b3.b3DefaultShapeDef(), mesh, [1, 1, 1]);

	const positions = b3.b3GetMeshVertices(mesh); // Float32Array
	const indices = b3.b3GetMeshIndices(mesh); // Uint32Array
	const geom = new THREE.BufferGeometry();
	geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geom.setIndex(new THREE.BufferAttribute(indices, 1));
	geom.computeVertexNormals();
	const m = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: false, side: THREE.DoubleSide }));
	m.position.set(pos[0], pos[1], pos[2]);
	m.receiveShadow = true;
	app.scene.add(m);
}

// wave-mesh terrain floor
addMesh(b3.b3CreateWaveMesh(24, 24, 1.2, 1.2, 0.35, 0.35)!, [-14.4, 0, -14.4], 0x3d6b4f);
// a torus and a box-mesh obstacle resting on it
addMesh(b3.b3CreateTorusMesh(16, 12, 3, 1.0)!, [-7, 4, 6], 0xc78bff);
addMesh(b3.b3CreateBoxMesh([0, 0, 0], [3, 1.5, 3], true)!, [8, 1.5, -6], 0x4d96ff);

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

// dynamic props raining onto the generated meshes
let props: b3BodyId[] = [];
let seed = 99;
const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

function drop(count: number): void {
	for (let i = 0; i < count; i++) {
		const def = b3.b3DefaultBodyDef();
		def.type = b3.b3BodyType.b3_dynamicBody;
		def.position = [(rand() * 2 - 1) * 12, 12 + rand() * 6, (rand() * 2 - 1) * 12];
		const body = b3.b3CreateBody(world, def);
		const sd = b3.b3DefaultShapeDef();
		sd.baseMaterial.restitution = 0.2;
		if (rand() < 0.5) b3.b3CreateSphereShape(body, sd, { center: [0, 0, 0], radius: 0.4 + rand() * 0.3 });
		else b3.b3CreateBoxShape(body, sd, 0.4, 0.4, 0.4);
		props.push(body);
	}
}

function reset(): void {
	for (const b of props) b3.b3DestroyBody(b);
	props = [];
	seed = 99;
	drop(40);
}
reset();

app.gui.add({ drop: () => drop(20) }, 'drop').name('drop 20 more');
app.gui.add({ reset }, 'reset').name('reset (R)');
window.addEventListener('keydown', (e) => { if (e.key === 'r' || e.key === 'R') reset(); });

app.onFrame(() => {
	app.step(() => b3.b3World_Step(world, 1 / 60, 4));
	renderer.update();
});
app.start();
