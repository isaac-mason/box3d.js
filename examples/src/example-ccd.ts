// Continuous Collision Detection — ported from the crashcat ccd demo. A heavy,
// fast "bullet" sphere is fired through triangular stacks of boxes; without CCD
// it would tunnel straight through. box3d's bullet flag enables continuous
// collision. (box3d clamps linear speed via maximumLinearSpeed, which crashcat
// does not, so we raise that cap rather than use crashcat's extreme impulse.)

import Box3D from 'box3d.js/inline';
import type { Box3DModule } from 'box3d.js';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [-32, 20, -28], target: [0, 1, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
worldDef.maximumLinearSpeed = 150; // allow the bullet to move fast
const world = b3.b3CreateWorld( worldDef );

// ground
const groundHeight = 0.1;
const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: 0, z: 0 };
const ground = b3.b3CreateBody( world, groundDef );
b3.b3CreateBoxShape( ground, b3.b3DefaultShapeDef(), 30, groundHeight, 30 );

// triangular stack of dynamic boxes
function createWall( ox: number, oy: number, oz: number, stackHeight: number ): void
{
	const shiftY = 1.0;
	const shiftZ = 2.0;
	for ( let i = 0; i < stackHeight; i++ )
	{
		for ( let j = i; j < stackHeight; j++ )
		{
			const x = ox;
			const y = i * shiftY + oy;
			const z = ( i * shiftZ ) / 2.0 + ( j - i ) * shiftZ + oz - stackHeight;
			const def = b3.b3DefaultBodyDef();
			def.type = b3.b3BodyType.b3_dynamicBody;
			def.position = { x, y, z };
			const body = b3.b3CreateBody( world, def );
			b3.b3CreateBoxShape( body, b3.b3DefaultShapeDef(), 0.5, 0.5, 1.0 );
		}
	}
}

const numX = 5;
const numZ = 8;
const shiftY = groundHeight + 0.5;
for ( let i = 0; i < numX; i++ ) createWall( i * 6.0, shiftY, 0.0, numZ );

// fast heavy bullet sphere
const ballDef = b3.b3DefaultBodyDef();
ballDef.type = b3.b3BodyType.b3_dynamicBody;
ballDef.position = { x: -20.0, y: shiftY + 2.0, z: 0.0 };
ballDef.isBullet = true; // continuous collision
const fastBall = b3.b3CreateBody( world, ballDef );
const ballShapeDef = b3.b3DefaultShapeDef();
ballShapeDef.density = 10000.0;
b3.b3CreateSphereShape( fastBall, ballShapeDef, { center: { x: 0, y: 0, z: 0 }, radius: 1.0 } );
b3.b3Body_ApplyLinearImpulseToCenter( fastBall, { x: 150_000_000, y: 0, z: 0 }, true );

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

app.onFrame( () =>
{
	b3.b3World_Step( world, 1 / 60, 4 );
	renderer.update();
} );
app.start();
