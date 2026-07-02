// Add Impulse at Position — click a body to cast
// a ray from the camera and apply an impulse at the exact hit point (so off-centre
// hits impart spin). Impulse strength is adjustable.

import Box3D from 'box3d.js/inline';
import type { Box3DModule } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 10, 15], target: [0, 2, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

// ground
const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const ground = b3.b3CreateBody( world, groundDef );
b3.b3CreateBoxShape( ground, b3.b3DefaultShapeDef(), 30, 0.5, 30 );

// a box and a sphere to poke
const boxDef = b3.b3DefaultBodyDef();
boxDef.type = b3.b3BodyType.b3_dynamicBody;
boxDef.position = { x: -3, y: 2, z: 0 };
const boxBody = b3.b3CreateBody( world, boxDef );
b3.b3CreateBoxShape( boxBody, b3.b3DefaultShapeDef(), 1, 1, 1 );

const sphereDef = b3.b3DefaultBodyDef();
sphereDef.type = b3.b3BodyType.b3_dynamicBody;
sphereDef.position = { x: 3, y: 2, z: 0 };
const sphereBody = b3.b3CreateBody( world, sphereDef );
b3.b3CreateSphereShape( sphereBody, b3.b3DefaultShapeDef(), { center: { x: 0, y: 0, z: 0 }, radius: 1 } );

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

const settings = { impulseStrength: 10 };
const gui = app.gui;
gui.add( settings, 'impulseStrength', 1, 30, 1 ).name( 'kick speed (m/s)' );

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const MAX_DIST = 100;

app.renderer.domElement.addEventListener( 'pointerdown', ( e ) =>
{
	mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
	mouse.y = -( e.clientY / window.innerHeight ) * 2 + 1;
	raycaster.setFromCamera( mouse, app.camera );
	const o = raycaster.ray.origin;
	const d = raycaster.ray.direction;

	const result = b3.b3World_CastRayClosest(
		world,
		{ x: o.x, y: o.y, z: o.z },
		{ x: d.x * MAX_DIST, y: d.y * MAX_DIST, z: d.z * MAX_DIST },
		b3.b3DefaultQueryFilter(),
	);
	if ( !result.hit ) return;

	const body = b3.b3Shape_GetBody( result.shapeId );
	if ( b3.b3Body_GetType( body ).value !== b3.b3BodyType.b3_dynamicBody.value ) return;

	// box3d's default density is 1000 kg/m³, so bodies are heavy — scale the
	// impulse by mass so `impulseStrength` acts as a velocity kick (m/s),
	// giving a visible reaction regardless of object size.
	const s = settings.impulseStrength * b3.b3Body_GetMass( body );
	b3.b3Body_ApplyLinearImpulse( body, { x: d.x * s, y: d.y * s, z: d.z * s }, result.point, true );
} );

app.onFrame( () =>
{
	app.step( () => b3.b3World_Step( world, 1 / 60, 4 ) );
	renderer.update();
} );
app.start();
