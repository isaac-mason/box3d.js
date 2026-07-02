// Hinge Motor — a motorized revolute joint. A turntable is hinged to a fixed hub
// about the vertical (world Y) axis and driven by the joint motor; boxes resting
// on it are carried around by friction. Adjust the motor speed live.
//
// box3d revolute joints rotate about the joint frame's local z-axis, so the frame
// is rotated +90° about X to make the hinge axis point up (+Y).

import Box3D from 'box3d.js/inline';
import type { Box3DModule } from 'box3d.js';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 10, 12], target: [0, 1, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

// vertical hinge axis: frame local z -> world +Y (+90° about X)
const HINGE_Q = { v: { x: Math.SQRT1_2, y: 0, z: 0 }, s: Math.SQRT1_2 };
const HUB_Y = 1;

// fixed hub
const hubDef = b3.b3DefaultBodyDef();
hubDef.position = { x: 0, y: HUB_Y, z: 0 };
const hub = b3.b3CreateBody( world, hubDef );

// turntable (dynamic, wide flat box) pinned at its centre
const tableDef = b3.b3DefaultBodyDef();
tableDef.type = b3.b3BodyType.b3_dynamicBody;
tableDef.position = { x: 0, y: HUB_Y, z: 0 };
const table = b3.b3CreateBody( world, tableDef );
const tableShapeDef = b3.b3DefaultShapeDef();
tableShapeDef.baseMaterial.friction = 1.0;
b3.b3CreateBoxShape( table, tableShapeDef, 5, 0.3, 5 );

const jd = b3.b3DefaultRevoluteJointDef();
jd.base.bodyIdA = hub;
jd.base.bodyIdB = table;
jd.base.localFrameA = { p: { x: 0, y: 0, z: 0 }, q: HINGE_Q };
jd.base.localFrameB = { p: { x: 0, y: 0, z: 0 }, q: HINGE_Q };
jd.enableMotor = true;
jd.motorSpeed = 1.5;
jd.maxMotorTorque = 1_000_000;
const joint = b3.b3CreateRevoluteJoint( world, jd );

// cargo riding on the turntable
const rand = ( a: number, b: number ) => a + Math.random() * ( b - a );
for ( let i = 0; i < 8; i++ )
{
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x: rand( -3.5, 3.5 ), y: 2.5, z: rand( -3.5, 3.5 ) };
	const body = b3.b3CreateBody( world, def );
	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.baseMaterial.friction = 1.0;
	if ( i % 2 === 0 ) b3.b3CreateBoxShape( body, shapeDef, 0.5, 0.5, 0.5 );
	else b3.b3CreateSphereShape( body, shapeDef, { center: { x: 0, y: 0, z: 0 }, radius: 0.5 } );
}

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

const settings = { motorSpeed: 1.5 };
const gui = app.gui;
gui.add( settings, 'motorSpeed', -4, 4, 0.1 ).name( 'motor speed (rad/s)' ).onChange( ( v: number ) => b3.b3RevoluteJoint_SetMotorSpeed( joint, v ) );

app.onFrame( () =>
{
	app.step( () => b3.b3World_Step( world, 1 / 60, 4 ) );
	renderer.update();
} );
app.start();
