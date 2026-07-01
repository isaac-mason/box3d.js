// Friction — a row of boxes whose friction ramps from 0 to 1, placed on an
// inclined plane. Low-friction boxes slide off; high-friction boxes stick.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId } from 'box3d.js';
import GUI from 'lil-gui';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness();

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

// catch tray at the bottom
const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const ground = b3.b3CreateBody( world, groundDef );
b3.b3CreateBoxShape( ground, b3.b3DefaultShapeDef(), 20, 0.5, 20 );

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

const LANES = 7;
const RAMP_POS = new THREE.Vector3( 0, 3, 0 );
let ramp: b3BodyId | null = null;
let boxes: b3BodyId[] = [];

function quat( q: THREE.Quaternion ): { v: { x: number; y: number; z: number }; s: number }
{
	return { v: { x: q.x, y: q.y, z: q.z }, s: q.w };
}

function build( angleDeg: number ): void
{
	if ( ramp ) b3.b3DestroyBody( ramp );
	for ( const b of boxes ) b3.b3DestroyBody( b );
	boxes = [];

	const rampQ = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), THREE.MathUtils.degToRad( angleDeg ) );

	const rampDef = b3.b3DefaultBodyDef();
	rampDef.position = RAMP_POS;
	rampDef.rotation = quat( rampQ );
	ramp = b3.b3CreateBody( world, rampDef );
	b3.b3CreateBoxShape( ramp, b3.b3DefaultShapeDef(), 6, 0.25, 6 );

	for ( let i = 0; i < LANES; i++ )
	{
		const friction = i / ( LANES - 1 ); // 0 .. 1
		// place near the top of the slope, one lane per z
		const local = new THREE.Vector3( -4.5, 0.85, ( i - ( LANES - 1 ) / 2 ) * 1.4 );
		const pos = local.applyQuaternion( rampQ ).add( RAMP_POS );

		const def = b3.b3DefaultBodyDef();
		def.type = b3.b3BodyType.b3_dynamicBody;
		def.position = { x: pos.x, y: pos.y, z: pos.z };
		def.rotation = quat( rampQ );
		const body = b3.b3CreateBody( world, def );

		const shapeDef = b3.b3DefaultShapeDef();
		shapeDef.baseMaterial.friction = friction;
		b3.b3CreateBoxShape( body, shapeDef, 0.5, 0.5, 0.5 );
		boxes.push( body );
	}
}

const params = { angle: 22, rebuild: () => build( params.angle ) };
const gui = new GUI();
gui.add( params, 'angle', 5, 40, 1 ).name( 'ramp angle (°)' ).onChange( () => build( params.angle ) );
gui.add( params, 'rebuild' ).name( 'reset' );

build( params.angle );

app.onFrame( () =>
{
	b3.b3World_Step( world, 1 / 60, 4 );
	renderer.update();
} );
app.start();
