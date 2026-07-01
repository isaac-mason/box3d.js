// Friction — ported from the crashcat friction demo. A flat high-friction floor
// with three rows (spheres, rotation-locked boxes, side-lying capsules); each row
// is a friction gradient 0→1. Everything is launched forward (+z) with the same
// velocity, so friction alone decides how far each slides. Press R to reset.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 8, 25], target: [0, 2, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

// static floor with high friction
const floorDef = b3.b3DefaultBodyDef();
floorDef.position = { x: 0, y: -0.5, z: 0 };
const floor = b3.b3CreateBody( world, floorDef );
const floorShapeDef = b3.b3DefaultShapeDef();
floorShapeDef.baseMaterial.friction = 1.0;
b3.b3CreateBoxShape( floor, floorShapeDef, 50, 0.5, 300 );

const numShapes = 10;
const frictionValues = Array.from( { length: numShapes }, ( _, i ) => i / ( numShapes - 1 ) );
const spacing = 2.0;
const rowWidth = ( numShapes - 1 ) * spacing;
const startHeight = 0.5;

const LAUNCH = { x: 0, y: 0, z: 10 };
const IDENTITY = { v: { x: 0, y: 0, z: 0 }, s: 1 };
// lie the capsule on its side (90° about Z) so it can roll
const CAPSULE_ROT = { v: { x: 0, y: 0, z: Math.SQRT1_2 }, s: Math.SQRT1_2 };

type BodyData = { body: b3BodyId; position: { x: number; y: number; z: number }; rotation: typeof IDENTITY };
const bodies: BodyData[] = [];

function makeLabel( text: string, x: number, y: number, z: number ): void
{
	const canvas = document.createElement( 'canvas' );
	const ctx = canvas.getContext( '2d' )!;
	canvas.width = 128;
	canvas.height = 64;
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 28px monospace';
	ctx.textAlign = 'center';
	ctx.fillText( text, 64, 40 );
	const sprite = new THREE.Sprite( new THREE.SpriteMaterial( { map: new THREE.CanvasTexture( canvas ) } ) );
	sprite.scale.set( 2, 1, 1 );
	sprite.position.set( x, y, z );
	app.scene.add( sprite );
}

function make( xPos: number, friction: number, rotation: typeof IDENTITY, attach: ( body: b3BodyId, sd: ReturnType<typeof b3.b3DefaultShapeDef> ) => void ): void
{
	const position = { x: xPos, y: startHeight, z: 0 };
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = position;
	def.rotation = rotation;
	def.linearVelocity = LAUNCH;
	const body = b3.b3CreateBody( world, def );
	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.baseMaterial.friction = friction;
	attach( body, shapeDef );
	makeLabel( `μ=${friction.toFixed( 1 )}`, xPos, startHeight + 1.5, 0 );
	bodies.push( { body, position, rotation } );
}

for ( let i = 0; i < numShapes; i++ )
{
	const friction = frictionValues[i];

	// row 1: spheres (left)
	make( -rowWidth / 2 - spacing - rowWidth + spacing * i, friction, IDENTITY, ( body, sd ) =>
		b3.b3CreateSphereShape( body, sd, { center: { x: 0, y: 0, z: 0 }, radius: 0.5 } ) );

	// row 2: boxes with rotation locked (center)
	make( -rowWidth / 2 + spacing * i, friction, IDENTITY, ( body, sd ) =>
	{
		b3.b3Body_SetMotionLocks( body, { linearX: false, linearY: false, linearZ: false, angularX: true, angularY: true, angularZ: true } );
		b3.b3CreateBoxShape( body, sd, 0.5, 0.5, 0.5 );
	} );

	// row 3: capsules on their side (right)
	make( rowWidth / 2 + spacing + spacing * i, friction, CAPSULE_ROT, ( body, sd ) =>
		b3.b3CreateCapsuleShape( body, sd, { center1: { x: 0, y: -0.3, z: 0 }, center2: { x: 0, y: 0.3, z: 0 }, radius: 0.5 } ) );
}

function reset(): void
{
	for ( const { body, position, rotation } of bodies )
	{
		b3.b3Body_SetTransform( body, position, rotation );
		b3.b3Body_SetLinearVelocity( body, LAUNCH );
		b3.b3Body_SetAngularVelocity( body, { x: 0, y: 0, z: 0 } );
		b3.b3Body_SetAwake( body, true );
	}
}

window.addEventListener( 'keydown', ( e ) => { if ( e.key === 'r' || e.key === 'R' ) reset(); } );

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

app.onFrame( () =>
{
	b3.b3World_Step( world, 1 / 60, 4 );
	renderer.update();
} );
app.start();
