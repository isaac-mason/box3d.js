// Shapes — spawn each primitive shape and watch box3d simulate them. Uses the
// box3d + three APIs directly; the world renderer introspects each shape.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId } from 'box3d.js';
import GUI from 'lil-gui';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness();

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

// static ground, top surface at y = 0
const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const ground = b3.b3CreateBody( world, groundDef );
b3.b3CreateBoxShape( ground, b3.b3DefaultShapeDef(), 20, 0.5, 20 );

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

const spawned: b3BodyId[] = [];

function spawn( kind: 'sphere' | 'box' | 'capsule' ): void
{
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x: ( Math.random() - 0.5 ) * 6, y: 9, z: ( Math.random() - 0.5 ) * 6 };
	const body = b3.b3CreateBody( world, def );
	const shapeDef = b3.b3DefaultShapeDef();
	if ( kind === 'sphere' ) b3.b3CreateSphereShape( body, shapeDef, { center: { x: 0, y: 0, z: 0 }, radius: 0.6 } );
	else if ( kind === 'box' ) b3.b3CreateBoxShape( body, shapeDef, 0.5, 0.5, 0.5 );
	else b3.b3CreateCapsuleShape( body, shapeDef, { center1: { x: 0, y: -0.4, z: 0 }, center2: { x: 0, y: 0.4, z: 0 }, radius: 0.4 } );
	spawned.push( body );
}

const params = {
	shape: 'sphere' as 'sphere' | 'box' | 'capsule',
	spawn: () => spawn( params.shape ),
	reset: () =>
	{
		for ( const body of spawned ) b3.b3DestroyBody( body );
		spawned.length = 0;
	},
};

const gui = new GUI();
gui.add( params, 'shape', ['sphere', 'box', 'capsule'] );
gui.add( params, 'spawn' ).name( 'spawn one' );
gui.add( params, 'reset' ).name( 'clear' );

for ( const kind of ['sphere', 'box', 'capsule'] as const ) spawn( kind );

app.onFrame( () =>
{
	b3.b3World_Step( world, 1 / 60, 4 );
	renderer.update();
} );
app.start();
