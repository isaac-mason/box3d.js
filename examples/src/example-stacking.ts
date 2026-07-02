// Stacking — a classic solver-stability test: a tall box pyramid plus a slender
// tower, which should settle and stay standing. Adjust the pyramid size and
// rebuild.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId } from 'box3d.js';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 10, 22], target: [0, 4, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const groundBody = b3.b3CreateBody( world, groundDef );
b3.b3CreateBoxShape( groundBody, b3.b3DefaultShapeDef(), 30, 0.5, 30 );

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

const HALF = 0.5;
const GAP = 1.005; // slight gap so boxes start just touching
let boxes: b3BodyId[] = [];

function box( x: number, y: number, z: number ): void
{
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x, y, z };
	const body = b3.b3CreateBody( world, def );
	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.baseMaterial.friction = 0.6;
	b3.b3CreateBoxShape( body, shapeDef, HALF, HALF, HALF );
	boxes.push( body );
}

function build( rows: number ): void
{
	for ( const b of boxes ) b3.b3DestroyBody( b );
	boxes = [];
	const step = HALF * 2 * GAP;
	// centred pyramid
	for ( let r = 0; r < rows; r++ )
	{
		const count = rows - r;
		for ( let i = 0; i < count; i++ )
		{
			box( ( i - ( count - 1 ) / 2 ) * step - 5, HALF + r * step, 0 );
		}
	}
	// slender tower
	for ( let r = 0; r < rows + 4; r++ )
	{
		box( 6, HALF + r * step, 0 );
	}
}

const params = { rows: 10, rebuild: () => build( params.rows ) };
app.gui.add( params, 'rows', 3, 16, 1 ).name( 'pyramid rows' ).onChange( () => build( params.rows ) );
app.gui.add( params, 'rebuild' );
build( params.rows );

app.onFrame( () =>
{
	app.step( () => b3.b3World_Step( world, 1 / 60, 4 ) );
	renderer.update();
} );
app.start();
