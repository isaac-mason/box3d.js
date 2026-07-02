// Gravity Factor — a row of boxes
// with per-body gravity scale 0.0 → 2.0; they fall at different rates (0 floats,
// 2 falls twice as fast). Press R to reset.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 8, 15], target: [0, 2, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

const floorDef = b3.b3DefaultBodyDef();
floorDef.position = { x: 0, y: -0.5, z: 0 };
const floor = b3.b3CreateBody( world, floorDef );
b3.b3CreateBoxShape( floor, b3.b3DefaultShapeDef(), 20, 0.5, 10 );

const numBoxes = 11;
const spacing = 2.0;
const startHeight = 8.0;
const startX = -( ( numBoxes - 1 ) / 2 ) * spacing;

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

const boxes: Array<{ body: b3BodyId; x: number }> = [];

for ( let i = 0; i < numBoxes; i++ )
{
	const gravityFactor = i * 0.2; // 0.0 .. 2.0
	const x = startX + spacing * i;
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x, y: startHeight, z: 0 };
	def.gravityScale = gravityFactor;
	const body = b3.b3CreateBody( world, def );
	b3.b3CreateBoxShape( body, b3.b3DefaultShapeDef(), 0.5, 0.5, 0.5 );
	makeLabel( `g×${gravityFactor.toFixed( 1 )}`, x, startHeight + 1.5, 0 );
	boxes.push( { body, x } );
}

function reset(): void
{
	for ( const { body, x } of boxes )
	{
		b3.b3Body_SetTransform( body, { x, y: startHeight, z: 0 }, { v: { x: 0, y: 0, z: 0 }, s: 1 } );
		b3.b3Body_SetLinearVelocity( body, { x: 0, y: 0, z: 0 } );
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
