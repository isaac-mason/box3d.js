// Geometry — a showcase of box3d's convex-hull generators: a box, a cylinder, a
// cone, a random "rock", and hulls built from arbitrary point sets (tetrahedron,
// pyramid, icosahedron). Each is dropped onto the ground and drawn by reading its
// hull vertices back out of box3d. Press R to drop again.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId, b3HullData } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 6, 18], target: [0, 1, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const groundBody = b3.b3CreateBody( world, groundDef );
b3.b3CreateBoxShape( groundBody, b3.b3DefaultShapeDef(), 20, 0.5, 20 );

// icosahedron points, for a rounded custom hull
const t = ( 1 + Math.sqrt( 5 ) ) / 2;
const icosa = [
	-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0,
	0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t,
	t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1,
].map( ( v ) => v * 0.55 );

// each entry: label + how to attach the shape to a body
type Kind = { name: string; attach: ( body: b3BodyId ) => void };
const kinds: Kind[] = [
	{ name: 'box', attach: ( b ) => b3.b3CreateBoxShape( b, b3.b3DefaultShapeDef(), 0.7, 0.7, 0.7 ) },
	{ name: 'cylinder', attach: ( b ) => hullShape( b, b3.b3CreateCylinder( 1.4, 0.7, 0, 20 )! ) },
	{ name: 'cone', attach: ( b ) => hullShape( b, b3.b3CreateCone( 1.6, 0.8, 0.0, 20 )! ) },
	{ name: 'rock', attach: ( b ) => hullShape( b, b3.b3CreateRock( 0.9 )! ) },
	{ name: 'tetra', attach: ( b ) => b3.b3CreateHullShape( b, b3.b3DefaultShapeDef(), b3.b3CreateHull( [0, 0.9, 0, -0.8, -0.5, -0.45, 0.8, -0.5, -0.45, 0, -0.5, 0.9] )! ) },
	{ name: 'pyramid', attach: ( b ) => b3.b3CreateHullShape( b, b3.b3DefaultShapeDef(), b3.b3CreateHull( [-0.7, 0, -0.7, 0.7, 0, -0.7, 0.7, 0, 0.7, -0.7, 0, 0.7, 0, 1.1, 0] )! ) },
	{ name: 'icosa', attach: ( b ) => b3.b3CreateHullShape( b, b3.b3DefaultShapeDef(), b3.b3CreateHull( icosa )! ) },
];

function hullShape( body: b3BodyId, hull: b3HullData ): void
{
	b3.b3CreateHullShape( body, b3.b3DefaultShapeDef(), hull );
}

function makeLabel( text: string, x: number, y: number, z: number ): void
{
	const canvas = document.createElement( 'canvas' );
	const ctx = canvas.getContext( '2d' )!;
	canvas.width = 128;
	canvas.height = 64;
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 30px sans-serif';
	ctx.textAlign = 'center';
	ctx.fillText( text, 64, 42 );
	const sprite = new THREE.Sprite( new THREE.SpriteMaterial( { map: new THREE.CanvasTexture( canvas ) } ) );
	sprite.scale.set( 2.5, 1.25, 1 );
	sprite.position.set( x, y, z );
	app.scene.add( sprite );
}

const spacing = 2.6;
const startX = -( ( kinds.length - 1 ) / 2 ) * spacing;
let shapes: b3BodyId[] = [];

function drop(): void
{
	for ( const b of shapes ) b3.b3DestroyBody( b );
	shapes = [];
	kinds.forEach( ( kind, i ) =>
	{
		const x = startX + i * spacing;
		const def = b3.b3DefaultBodyDef();
		def.type = b3.b3BodyType.b3_dynamicBody;
		def.position = { x, y: 5, z: 0 };
		const body = b3.b3CreateBody( world, def );
		kind.attach( body );
		shapes.push( body );
	} );
}

kinds.forEach( ( kind, i ) => makeLabel( kind.name, startX + i * spacing, 3.2, 0 ) );
drop();

app.gui.add( { drop }, 'drop' ).name( 'drop again' );
window.addEventListener( 'keydown', ( e ) => { if ( e.key === 'r' || e.key === 'R' ) drop(); } );

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

app.onFrame( () =>
{
	app.step( () => b3.b3World_Step( world, 1 / 60, 4 ) );
	renderer.update();
} );
app.start();
