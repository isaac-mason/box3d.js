// Events — box3d reports collision events each step. Shapes rain onto a platform;
// we read b3World_GetContactEvents every frame and light shapes up: a soft flash
// on begin-touch, and a hot flash on *hit* events (a hard impact above the
// per-shape hitEventThreshold), scaled by the approach speed. The glow fades out.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId, b3ShapeId } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 9, 20], target: [0, 2, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

// a slightly dished platform (a wide box) that also reports events
const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const ground = b3.b3CreateBody( world, groundDef );
const groundShapeDef = b3.b3DefaultShapeDef();
groundShapeDef.enableContactEvents = true;
b3.b3CreateBoxShape( ground, groundShapeDef, 12, 0.5, 12 );

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

const FLASH = new THREE.Color( 0x66ccff ); // soft, begin-touch
const HIT = new THREE.Color( 0xff4020 ); // hot, hard impact

let bodies: b3BodyId[] = [];

function spawn(): void
{
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x: ( Math.sin( bodies.length * 12.9898 ) ) * 4, y: 8 + ( bodies.length % 5 ), z: ( Math.cos( bodies.length * 4.1414 ) ) * 4 };
	const body = b3.b3CreateBody( world, def );

	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.enableContactEvents = true; // begin/end touch
	shapeDef.enableHitEvents = true; // hard-impact hit events
	shapeDef.baseMaterial.restitution = 0.4;

	const pick = bodies.length % 3;
	if ( pick === 0 ) b3.b3CreateBoxShape( body, shapeDef, 0.5, 0.5, 0.5 );
	else if ( pick === 1 ) b3.b3CreateSphereShape( body, shapeDef, { center: { x: 0, y: 0, z: 0 }, radius: 0.55 } );
	else b3.b3CreateCapsuleShape( body, shapeDef, { center1: { x: 0, y: -0.35, z: 0 }, center2: { x: 0, y: 0.35, z: 0 }, radius: 0.4 } );

	bodies.push( body );
}

function reset(): void
{
	for ( const b of bodies ) b3.b3DestroyBody( b );
	bodies = [];
	for ( let i = 0; i < 24; i++ ) spawn();
}
reset();

const params = { spawn: () => spawn(), reset };
app.gui.add( params, 'spawn' ).name( 'drop one more' );
app.gui.add( params, 'reset' ).name( 'reset (R)' );
window.addEventListener( 'keydown', ( e ) => { if ( e.key === 'r' || e.key === 'R' ) reset(); } );

// push a shape's mesh emissive toward a color (keeps the strongest this frame)
function glow( shapeId: b3ShapeId, color: THREE.Color, strength: number ): void
{
	const mesh = renderer.getMesh( shapeId );
	if ( !mesh ) return;
	const mat = mesh.material as THREE.MeshStandardMaterial;
	const s = Math.min( 1, strength );
	if ( color.r * s + color.g * s + color.b * s > mat.emissive.r + mat.emissive.g + mat.emissive.b )
	{
		mat.emissive.copy( color ).multiplyScalar( s );
	}
}

app.onFrame( () =>
{
	app.step( () => b3.b3World_Step( world, 1 / 60, 4 ) );
	renderer.update();

	// fade every glow toward black
	renderer.object3d.traverse( ( o ) =>
	{
		const m = ( o as THREE.Mesh ).material as THREE.MeshStandardMaterial | undefined;
		if ( m && m.emissive ) m.emissive.multiplyScalar( 0.88 );
	} );

	const events = b3.b3World_GetContactEvents( world );
	for ( const e of events.beginEvents )
	{
		glow( e.shapeIdA, FLASH, 0.6 );
		glow( e.shapeIdB, FLASH, 0.6 );
	}
	for ( const e of events.hitEvents )
	{
		const strength = Math.min( 1, e.approachSpeed / 8 );
		glow( e.shapeIdA, HIT, 0.5 + strength );
		glow( e.shapeIdB, HIT, 0.5 + strength );
	}
} );
app.start();
