// Angular Damping — zero gravity;
// a row of boxes all spun at the same rate with angular damping 0.0 → 0.9. Higher
// damping stops the spin sooner. Press R to reset.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 0, 25], target: [0, 0, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: 0, z: 0 }; // zero gravity: isolate rotation
const world = b3.b3CreateWorld( worldDef );

const numBoxes = 10;
const spacing = 3.0;
const startX = -( ( numBoxes - 1 ) / 2 ) * spacing;
const SPIN = { x: 3, y: 5, z: 2 };

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
	const damping = i * 0.1; // 0.0 .. 0.9
	const x = startX + spacing * i;
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x, y: 0, z: 0 };
	def.angularDamping = damping;
	def.angularVelocity = SPIN;
	const body = b3.b3CreateBody( world, def );
	b3.b3CreateBoxShape( body, b3.b3DefaultShapeDef(), 0.75, 0.75, 0.75 );
	makeLabel( `d=${damping.toFixed( 1 )}`, x, 1.8, 0 );
	boxes.push( { body, x } );
}

function reset(): void
{
	for ( const { body, x } of boxes )
	{
		b3.b3Body_SetTransform( body, { x, y: 0, z: 0 }, { v: { x: 0, y: 0, z: 0 }, s: 1 } );
		b3.b3Body_SetLinearVelocity( body, { x: 0, y: 0, z: 0 } );
		b3.b3Body_SetAngularVelocity( body, SPIN );
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
