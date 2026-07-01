// Stacking — a pyramid of boxes to show stable stacking and the solver settling
// contacts. Rebuild with a different number of rows from the GUI.

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

const HALF = 0.5;
const GAP = 1.02;
let boxes: b3BodyId[] = [];

function build( rows: number ): void
{
	for ( const body of boxes ) b3.b3DestroyBody( body );
	boxes = [];
	for ( let row = 0; row < rows; row++ )
	{
		const count = rows - row;
		for ( let i = 0; i < count; i++ )
		{
			const def = b3.b3DefaultBodyDef();
			def.type = b3.b3BodyType.b3_dynamicBody;
			def.position = { x: ( i - ( count - 1 ) / 2 ) * GAP, y: HALF + row * ( HALF * 2 * GAP ), z: 0 };
			const body = b3.b3CreateBody( world, def );
			b3.b3CreateBoxShape( body, b3.b3DefaultShapeDef(), HALF, HALF, HALF );
			boxes.push( body );
		}
	}
}

const params = { rows: 6, rebuild: () => build( params.rows ) };
const gui = new GUI();
gui.add( params, 'rows', 2, 12, 1 );
gui.add( params, 'rebuild' );

build( params.rows );

app.onFrame( () =>
{
	b3.b3World_Step( world, 1 / 60, 4 );
	renderer.update();
} );
app.start();
