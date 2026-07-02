// Static Compound — one static shape built from many box-hull children (a bin:
// floor + four walls) that dynamic balls drop into. box3d compounds are static-
// only, which fits static level geometry exactly. The renderer can't introspect a
// compound shape, so this example draws the child boxes itself; the falling balls
// are drawn by the world renderer.

import Box3D from 'box3d.js/inline';
import type { Box3DModule } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 12, 16], target: [0, 2, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

const IDENTITY = { v: { x: 0, y: 0, z: 0 }, s: 1 };

// a reusable box hull (8 corners) at the given half extents
function boxHull( hx: number, hy: number, hz: number )
{
	return b3.b3CreateHull( [
		-hx, -hy, -hz, hx, -hy, -hz, hx, -hy, hz, -hx, -hy, hz,
		-hx, hy, -hz, hx, hy, -hz, hx, hy, hz, -hx, hy, hz,
	] );
}

type Child = { hx: number; hy: number; hz: number; pos: { x: number; y: number; z: number } };

// bin: floor + four walls
const children: Child[] = [
	{ hx: 5, hy: 0.3, hz: 5, pos: { x: 0, y: 0.3, z: 0 } },
	{ hx: 0.3, hy: 2, hz: 5, pos: { x: 5, y: 2, z: 0 } },
	{ hx: 0.3, hy: 2, hz: 5, pos: { x: -5, y: 2, z: 0 } },
	{ hx: 5, hy: 2, hz: 0.3, pos: { x: 0, y: 2, z: 5 } },
	{ hx: 5, hy: 2, hz: 0.3, pos: { x: 0, y: 2, z: -5 } },
];

const compound = b3.b3CreateCompound( {
	hulls: children.map( ( c ) => ( {
		hull: boxHull( c.hx, c.hy, c.hz ),
		transform: { p: c.pos, q: IDENTITY },
	} ) ),
} );

const binDef = b3.b3DefaultBodyDef();
binDef.position = { x: 0, y: 0, z: 0 };
const bin = b3.b3CreateBody( world, binDef );
b3.b3CreateCompoundShape( bin, b3.b3DefaultShapeDef(), compound );

// draw the compound's child boxes (the bin is static at the origin)
const binMaterial = new THREE.MeshStandardMaterial( { color: 0x3a3a44, roughness: 0.9 } );
for ( const c of children )
{
	const mesh = new THREE.Mesh( new THREE.BoxGeometry( c.hx * 2, c.hy * 2, c.hz * 2 ), binMaterial );
	mesh.position.set( c.pos.x, c.pos.y, c.pos.z );
	mesh.receiveShadow = true;
	app.scene.add( mesh );
}

// dynamic balls raining into the bin
const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

const rand = ( a: number, b: number ) => a + Math.random() * ( b - a );
for ( let i = 0; i < 40; i++ )
{
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x: rand( -4, 4 ), y: 6 + i * 0.4, z: rand( -4, 4 ) };
	const body = b3.b3CreateBody( world, def );
	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.baseMaterial.restitution = 0.4;
	b3.b3CreateSphereShape( body, shapeDef, { center: { x: 0, y: 0, z: 0 }, radius: rand( 0.4, 0.7 ) } );
}

app.onFrame( () =>
{
	app.step( () => b3.b3World_Step( world, 1 / 60, 4 ) );
	renderer.update();
} );
app.start();
