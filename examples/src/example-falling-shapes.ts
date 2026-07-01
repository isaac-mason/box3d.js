// Falling Shapes — a heap of spheres, boxes and capsules dropped onto a static
// floor. Demonstrates world/body/shape creation, stepping, and reading body
// transforms back into three.js meshes each frame.

import Box3D from 'box3d/inline';
import type { MainModule, b3BodyId, b3ShapeDef } from 'box3d';
import * as THREE from 'three';
import { BodyMeshMap } from './box3d-three';
import { createHarness } from './harness';

const b3: MainModule = await Box3D();
const app = createHarness();
const bodies = new BodyMeshMap( b3 );

// ---- world ----
const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

// ---- static floor ----
const FLOOR_HX = 20;
const FLOOR_HY = 0.5;
const FLOOR_HZ = 20;
const floorDef = b3.b3DefaultBodyDef();
floorDef.type = b3.b3BodyType.b3_staticBody;
const floor = b3.b3CreateBody( world, floorDef );
b3.b3CreateBoxShape( floor, b3.b3DefaultShapeDef(), FLOOR_HX, FLOOR_HY, FLOOR_HZ );

const floorMesh = new THREE.Mesh(
	new THREE.BoxGeometry( FLOOR_HX * 2, FLOOR_HY * 2, FLOOR_HZ * 2 ),
	new THREE.MeshStandardMaterial( { color: 0x2b2b33, roughness: 0.95 } ),
);
floorMesh.receiveShadow = true;
app.scene.add( floorMesh );

// ---- dynamic shape spawners ----
const PALETTE = [0xff6b6b, 0xffd93d, 0x6bcB77, 0x4d96ff, 0xc78bff, 0xff9f45];
let colorIndex = 0;
const nextColor = (): number => PALETTE[colorIndex++ % PALETTE.length];

function material(): THREE.MeshStandardMaterial
{
	return new THREE.MeshStandardMaterial( { color: nextColor(), roughness: 0.4, metalness: 0.1 } );
}

function makeDynamicBody( x: number, y: number, z: number ): b3BodyId
{
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x, y, z };
	return b3.b3CreateBody( world, def );
}

function track( body: b3BodyId, mesh: THREE.Mesh ): void
{
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	app.scene.add( mesh );
	bodies.add( body, mesh );
}

function spawnSphere( x: number, y: number, z: number, r: number ): void
{
	const body = makeDynamicBody( x, y, z );
	const shapeDef: b3ShapeDef = b3.b3DefaultShapeDef();
	b3.b3CreateSphereShape( body, shapeDef, { center: { x: 0, y: 0, z: 0 }, radius: r } );
	track( body, new THREE.Mesh( new THREE.SphereGeometry( r, 24, 16 ), material() ) );
}

function spawnBox( x: number, y: number, z: number, hx: number, hy: number, hz: number ): void
{
	const body = makeDynamicBody( x, y, z );
	b3.b3CreateBoxShape( body, b3.b3DefaultShapeDef(), hx, hy, hz );
	track( body, new THREE.Mesh( new THREE.BoxGeometry( hx * 2, hy * 2, hz * 2 ), material() ) );
}

function spawnCapsule( x: number, y: number, z: number, r: number, halfHeight: number ): void
{
	const body = makeDynamicBody( x, y, z );
	b3.b3CreateCapsuleShape( body, b3.b3DefaultShapeDef(), {
		center1: { x: 0, y: -halfHeight, z: 0 },
		center2: { x: 0, y: halfHeight, z: 0 },
		radius: r,
	} );
	track( body, new THREE.Mesh( new THREE.CapsuleGeometry( r, halfHeight * 2, 8, 16 ), material() ) );
}

// ---- spawn a mixed heap ----
const rand = ( a: number, b: number ): number => a + Math.random() * ( b - a );
for ( let i = 0; i < 60; i++ )
{
	const x = rand( -6, 6 );
	const z = rand( -6, 6 );
	const y = 4 + i * 0.6;
	const kind = i % 3;
	if ( kind === 0 ) spawnSphere( x, y, z, rand( 0.4, 0.8 ) );
	else if ( kind === 1 ) spawnBox( x, y, z, rand( 0.4, 0.7 ), rand( 0.4, 0.7 ), rand( 0.4, 0.7 ) );
	else spawnCapsule( x, y, z, rand( 0.3, 0.5 ), rand( 0.3, 0.6 ) );
}

// ---- simulate ----
app.onFrame( () =>
{
	b3.b3World_Step( world, 1 / 60, 4 );
	bodies.sync();
} );
app.start();
