// Robustness — a few of box3d's solver stress tests, ported from sample_robustness.
//   • High Mass Ratio — pyramids whose capstone is 100–300× denser than the rest;
//     a naive solver squashes these, box3d holds them up.
//   • Overlap Recovery — a triangular pile spawned deeply interpenetrating; the
//     solver pushes everything apart smoothly instead of exploding.
//   • Tiny Pyramid — a 30-row pyramid of 5 cm boxes, testing small-scale stacking.

import Box3D from 'box3d.js/inline';
import type { Box3DModule } from 'box3d.js';
import { createWorldRenderer, type WorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 12, 34], target: [0, 6, 0] } );

let world = b3.b3CreateWorld( ( () => { const d = b3.b3DefaultWorldDef(); d.gravity = { x: 0, y: -10, z: 0 }; return d; } )() );
let renderer: WorldRenderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

function newWorld( ground: ( w: ReturnType<typeof b3.b3CreateWorld> ) => void ): void
{
	app.scene.remove( renderer.object3d );
	b3.b3DestroyWorld( world );
	const wd = b3.b3DefaultWorldDef();
	wd.gravity = { x: 0, y: -10, z: 0 };
	world = b3.b3CreateWorld( wd );
	ground( world );
	renderer = createWorldRenderer( b3, world );
	app.scene.add( renderer.object3d );
}

function makeGround( half: number ): ( w: typeof world ) => void
{
	return ( w ) =>
	{
		const gd = b3.b3DefaultBodyDef();
		gd.position = { x: 0, y: -0.5, z: 0 };
		const g = b3.b3CreateBody( w, gd );
		b3.b3CreateBoxShape( g, b3.b3DefaultShapeDef(), half, 0.5, half );
	};
}

function box( x: number, y: number, half: number, density: number ): void
{
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x, y, z: 0 };
	const body = b3.b3CreateBody( world, def );
	const shapeDef = b3.b3DefaultShapeDef();
	shapeDef.density = density;
	b3.b3CreateBoxShape( body, shapeDef, half, half, half );
}

// pyramids with an ultra-dense capstone (b3d sample "HighMassRatio1")
function highMassRatio(): void
{
	newWorld( makeGround( 30 ) );
	const extent = 1.0;
	for ( let j = 0; j < 3; j++ )
	{
		const offset = -20 * extent + 2 * ( 10 + 1 ) * extent * j;
		let count = 10;
		let y = extent;
		while ( count > 0 )
		{
			for ( let i = 0; i < count; i++ )
			{
				const coeff = i - 0.5 * count;
				const yy = count === 1 ? y + 2 : y;
				const density = count === 1 ? ( j + 1 ) * 100 : 1;
				box( 2 * coeff * extent + offset, yy, extent, density );
			}
			count--;
			y += 2 * extent;
		}
	}
}

// a pile spawned deeply overlapping that the solver must push apart (b3d "Overlap Recovery")
function overlapRecovery(): void
{
	newWorld( makeGround( 12 ) );
	const baseCount = 6;
	const extent = 0.5;
	const overlap = 0.25;
	const fraction = 1 - overlap;
	let y = extent;
	for ( let i = 0; i < baseCount; i++ )
	{
		let x = fraction * extent * ( i - baseCount );
		for ( let j = i; j < baseCount; j++ )
		{
			box( x, y, extent, 1 );
			x += 2 * fraction * extent;
		}
		y += 2 * fraction * extent;
	}
}

// a 30-row pyramid of 5 cm boxes (b3d "Tiny Pyramid")
function tinyPyramid(): void
{
	newWorld( makeGround( 4 ) );
	const extent = 0.025;
	const baseCount = 30;
	for ( let i = 0; i < baseCount; i++ )
	{
		const y = ( 2 * i + 1 ) * extent;
		for ( let j = i; j < baseCount; j++ )
		{
			const x = ( i + 1 ) * extent + 2 * ( j - i ) * extent - baseCount * extent;
			box( x, y, extent, 1 );
		}
	}
}

const scenes: Record<string, () => void> = {
	'High Mass Ratio': highMassRatio,
	'Overlap Recovery': overlapRecovery,
	'Tiny Pyramid': tinyPyramid,
};
const cameras: Record<string, { camera: [number, number, number]; target: [number, number, number] }> = {
	'High Mass Ratio': { camera: [0, 14, 40], target: [0, 8, 0] },
	'Overlap Recovery': { camera: [0, 5, 14], target: [0, 2, 0] },
	'Tiny Pyramid': { camera: [0, 1, 3], target: [0, 0.6, 0] },
};

const params = { scene: 'High Mass Ratio' };
function load(): void
{
	scenes[params.scene]();
	const c = cameras[params.scene];
	app.camera.position.set( ...c.camera );
	app.controls.target.set( ...c.target );
	app.controls.update();
}
app.gui.add( params, 'scene', Object.keys( scenes ) ).onChange( () => load() );
load();

app.onFrame( () =>
{
	app.step( () => b3.b3World_Step( world, 1 / 60, 4 ) );
	renderer.update();
} );
app.start();
