// Conveyor Belt — ported from the crashcat conveyor demo. Where Jolt needs a
// contact listener to set a per-contact surface velocity, box3d has it natively:
// b3SurfaceMaterial.tangentVelocity (local to the shape, projected onto the
// contact). Four tilted belts in a cross circulate cargo; boxes have a friction
// gradient so grip varies. (box3d's tangentVelocity is linear-only, so crashcat's
// angular "lazy susan" belt is omitted.)

import Box3D from 'box3d.js/inline';
import type { Box3DModule } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [60, 40, 60], target: [0, 0, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

// floor
const floorDef = b3.b3DefaultBodyDef();
floorDef.position = { x: 0, y: -0.5, z: 0 };
const floor = b3.b3CreateBody( world, floorDef );
const floorShapeDef = b3.b3DefaultShapeDef();
floorShapeDef.baseMaterial.friction = 1.0;
b3.b3CreateBoxShape( floor, floorShapeDef, 100, 0.5, 100 );

const quat = ( q: THREE.Quaternion ) => ( { v: { x: q.x, y: q.y, z: q.z }, s: q.w } );

// four linear belts in a cross, each rotated 90° about Y and tilted 1°
const beltWidth = 10.0;
const beltLength = 50.0;

for ( let i = 0; i < 4; i++ )
{
	const friction = 0.25 * ( i + 1 );
	const rotation = new THREE.Quaternion()
		.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), 0.5 * Math.PI * i )
		.multiply( new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), Math.PI / 180 ) );
	const position = new THREE.Vector3( beltLength, 6.0, beltWidth ).applyQuaternion( rotation );

	const def = b3.b3DefaultBodyDef();
	def.position = { x: position.x, y: position.y, z: position.z };
	def.rotation = quat( rotation );
	const belt = b3.b3CreateBody( world, def );

	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.baseMaterial.friction = friction;
	shapeDef.baseMaterial.tangentVelocity = { x: 0, y: 0, z: -10.0 }; // belt surface moves along local -Z
	b3.b3CreateBoxShape( belt, shapeDef, beltWidth, 0.1, beltLength );
}

// cargo boxes with a decreasing friction gradient (label each with its μ)
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
	sprite.scale.set( 3, 1.5, 1 );
	sprite.position.set( x, y, z );
	app.scene.add( sprite );
}

for ( let i = 0; i <= 10; i++ )
{
	const friction = 1.0 - 0.1 * i;
	const x = -beltLength + i * 10.0;
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x, y: 10.0, z: -beltLength };
	const body = b3.b3CreateBody( world, def );
	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.baseMaterial.friction = friction;
	b3.b3CreateBoxShape( body, shapeDef, 2, 2, 2 );
	makeLabel( `μ=${friction.toFixed( 1 )}`, x, 14, -beltLength );
}

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

app.onFrame( () =>
{
	b3.b3World_Step( world, 1 / 60, 4 );
	renderer.update();
} );
app.start();
