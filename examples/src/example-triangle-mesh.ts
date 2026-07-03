// Triangle Mesh — a static triangle-mesh terrain (generated procedurally so no
// asset is needed) that dynamic balls roll across. Showcases box3d mesh shapes:
// the same vertex/index buffers feed both b3CreateMesh and a THREE.BufferGeometry.

import type { Box3DModule } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 22, 32], target: [0, 0, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -10, 0];
const world = b3.b3CreateWorld(worldDef);

// --- procedural wavy terrain grid ---
const N = 48; // cells per side
const SIZE = 44;
const height = (x: number, z: number) =>
	Math.sin(x * 0.3) * 1.6 +
	Math.cos(z * 0.35) * 1.6 +
	Math.sin((x + z) * 0.15) * 1.2;

const positions = new Float32Array((N + 1) * (N + 1) * 3);
for (let z = 0; z <= N; z++) {
	for (let x = 0; x <= N; x++) {
		const px = (x / N - 0.5) * SIZE;
		const pz = (z / N - 0.5) * SIZE;
		const i = (z * (N + 1) + x) * 3;
		positions[i] = px;
		positions[i + 1] = height(px, pz);
		positions[i + 2] = pz;
	}
}

const indices = new Uint32Array(N * N * 6);
let t = 0;
for (let z = 0; z < N; z++) {
	for (let x = 0; x < N; x++) {
		const a = z * (N + 1) + x;
		const b = a + 1;
		const c = a + (N + 1);
		const d = c + 1;
		// CCW winding so triangle normals face up
		indices[t++] = a;
		indices[t++] = c;
		indices[t++] = b;
		indices[t++] = b;
		indices[t++] = c;
		indices[t++] = d;
	}
}

const meshData = b3.b3CreateMesh(positions, indices);
const terrainBody = b3.b3CreateBody(world, b3.b3DefaultBodyDef()); // static
b3.b3CreateMeshShape(terrainBody, b3.b3DefaultShapeDef(), meshData, [1, 1, 1]);

// draw the terrain (renderer can't introspect a mesh shape, so draw it here)
const terrainGeom = new THREE.BufferGeometry();
terrainGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
terrainGeom.setIndex(new THREE.BufferAttribute(indices, 1));
terrainGeom.computeVertexNormals();
const terrainMesh = new THREE.Mesh(
	terrainGeom,
	new THREE.MeshStandardMaterial({
		color: 0x3d6b4f,
		roughness: 0.95,
		flatShading: false,
	}),
);
terrainMesh.receiveShadow = true;
app.scene.add(terrainMesh);

// dynamic balls rolling on the terrain
const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

const rand = (a: number, b: number) => a + Math.random() * (b - a);
for (let i = 0; i < 50; i++) {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = [rand(-18, 18), 14 + i * 0.3, rand(-18, 18)];
	const body = b3.b3CreateBody(world, def);
	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.baseMaterial.restitution = 0.3;
	b3.b3CreateSphereShape(body, shapeDef, {
		center: [0, 0, 0],
		radius: rand(0.5, 0.9),
	});
}

app.onFrame(() => {
	app.step(() => b3.b3World_Step(world, 1 / 60, 4));
	renderer.update();
});
app.start();
