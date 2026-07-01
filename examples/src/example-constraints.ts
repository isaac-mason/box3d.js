// Constraints — ported from the crashcat constraints demo. Chains of boxes hang
// from a static anchor, linked by joints, and get an impulse on the last link so
// the chains swing. This ports the three chains whose joint frames are
// orientation-independent — Fixed (weld), Point (spherical/ball), and Distance —
// which map exactly. crashcat's Hinge/Slider/Cone chains need box3d's axis-frame
// convention and are a follow-up.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 16, 30], target: [-10, 15, 5] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

const CHAIN_LENGTH = 10;
const IDENTITY = { v: { x: 0, y: 0, z: 0 }, s: 1 };
// each joint sits on the touching faces of consecutive 1-unit boxes (centres 1 apart)
const FRAME_A = { p: { x: 0, y: 0, z: 0.5 }, q: IDENTITY };
const FRAME_B = { p: { x: 0, y: 0, z: -0.5 }, q: IDENTITY };

function makeLabel( text: string, x: number, y: number, z: number ): void
{
	const canvas = document.createElement( 'canvas' );
	const ctx = canvas.getContext( '2d' )!;
	canvas.width = 256;
	canvas.height = 64;
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 32px monospace';
	ctx.textAlign = 'center';
	ctx.fillText( text, 128, 42 );
	const sprite = new THREE.Sprite( new THREE.SpriteMaterial( { map: new THREE.CanvasTexture( canvas ) } ) );
	sprite.scale.set( 4, 1, 1 );
	sprite.position.set( x, y, z );
	app.scene.add( sprite );
}

// build a chain of boxes at startX; `link(prev, body)` creates the joint
function buildChain( startX: number, label: string, link: ( a: b3BodyId, b: b3BodyId ) => void ): void
{
	const startY = 20;
	makeLabel( label, startX, startY + 2, CHAIN_LENGTH / 2 );
	let prev: b3BodyId | null = null;
	for ( let z = 0; z < CHAIN_LENGTH; z++ )
	{
		const def = b3.b3DefaultBodyDef();
		def.type = z === 0 ? b3.b3BodyType.b3_staticBody : b3.b3BodyType.b3_dynamicBody;
		def.position = { x: startX, y: startY, z };
		const body = b3.b3CreateBody( world, def );
		b3.b3CreateBoxShape( body, b3.b3DefaultShapeDef(), 0.5, 0.5, 0.5 );
		if ( prev !== null ) link( prev, body );
		if ( z === CHAIN_LENGTH - 1 ) b3.b3Body_ApplyLinearImpulseToCenter( body, { x: 1000, y: 0, z: 0 }, true );
		prev = body;
	}
}

// Fixed = weld joint
buildChain( -15, 'Fixed', ( a, b ) =>
{
	const jd = b3.b3DefaultWeldJointDef();
	jd.base.bodyIdA = a;
	jd.base.bodyIdB = b;
	jd.base.localFrameA = FRAME_A;
	jd.base.localFrameB = FRAME_B;
	b3.b3CreateWeldJoint( world, jd );
} );

// Point = spherical (ball) joint
buildChain( -10, 'Point', ( a, b ) =>
{
	const jd = b3.b3DefaultSphericalJointDef();
	jd.base.bodyIdA = a;
	jd.base.bodyIdB = b;
	jd.base.localFrameA = FRAME_A;
	jd.base.localFrameB = FRAME_B;
	b3.b3CreateSphericalJoint( world, jd );
} );

// Distance joint (anchors free to separate 0..1)
buildChain( -5, 'Distance', ( a, b ) =>
{
	const jd = b3.b3DefaultDistanceJointDef();
	jd.base.bodyIdA = a;
	jd.base.bodyIdB = b;
	jd.base.localFrameA = FRAME_A;
	jd.base.localFrameB = FRAME_B;
	jd.enableLimit = true;
	jd.minLength = 0;
	jd.maxLength = 1;
	b3.b3CreateDistanceJoint( world, jd );
} );

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

app.onFrame( () =>
{
	b3.b3World_Step( world, 1 / 60, 4 );
	renderer.update();
} );
app.start();
