// Restitution — a row of spheres whose bounciness ramps from 0 to 1 across the
// row. Drop them together and watch the bounce heights fan out.

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

const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const ground = b3.b3CreateBody( world, groundDef );
b3.b3CreateBoxShape( ground, b3.b3DefaultShapeDef(), 20, 0.5, 20 );

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

const COUNT = 9;
let balls: b3BodyId[] = [];

function drop( height: number ): void
{
	for ( const body of balls ) b3.b3DestroyBody( body );
	balls = [];
	for ( let i = 0; i < COUNT; i++ )
	{
		const def = b3.b3DefaultBodyDef();
		def.type = b3.b3BodyType.b3_dynamicBody;
		def.position = { x: ( i - ( COUNT - 1 ) / 2 ) * 1.6, y: height, z: 0 };
		const body = b3.b3CreateBody( world, def );
		const shapeDef = b3.b3DefaultShapeDef();
		shapeDef.baseMaterial.restitution = i / ( COUNT - 1 ); // 0 .. 1
		b3.b3CreateSphereShape( body, shapeDef, { center: { x: 0, y: 0, z: 0 }, radius: 0.6 } );
		balls.push( body );
	}
}

const params = { height: 8, drop: () => drop( params.height ) };
const gui = new GUI();
gui.add( params, 'height', 3, 14, 0.5 );
gui.add( params, 'drop' );

drop( params.height );

app.onFrame( () =>
{
	b3.b3World_Step( world, 1 / 60, 4 );
	renderer.update();
} );
app.start();
