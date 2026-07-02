// Shapes — a rain of assorted convex shapes:
// a shapeConfigs table, a Number-of-Bodies slider, and continuous round-robin
// respawning. Convex hulls are computed once and instanced into many bodies.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3BodyId, b3ShapeDef } from 'box3d.js';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness();

/* physics world */

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld( worldDef );

const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: -0.5, z: 0 };
const ground = b3.b3CreateBody( world, groundDef );
b3.b3CreateBoxShape( ground, b3.b3DefaultShapeDef(), 20, 0.5, 20 );

/* shape spawning system — hulls are computed once and shared across bodies */

const pyramidHull = b3.b3CreateHull( [-0.5, 0, -0.5, 0.5, 0, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0, 1, 0] );
const tetraHull = b3.b3CreateHull( [0, 0.7, 0, -0.6, -0.4, -0.35, 0.6, -0.4, -0.35, 0, -0.4, 0.7] );
const cylinderHull = b3.b3CreateCylinder( 0.7, 0.5, 0.0, 18 );
const coneHull = b3.b3CreateCone( 1.2, 0.6, 0.0, 18 );

type ShapeConfig = { name: string; attach: ( body: b3BodyId, shapeDef: b3ShapeDef ) => void };

const shapeConfigs: ShapeConfig[] = [
	{ name: 'sphere', attach: ( b, sd ) => b3.b3CreateSphereShape( b, sd, { center: { x: 0, y: 0, z: 0 }, radius: 0.5 } ) },
	{ name: 'box', attach: ( b, sd ) => b3.b3CreateBoxShape( b, sd, 0.5, 0.5, 0.5 ) },
	{ name: 'capsule', attach: ( b, sd ) => b3.b3CreateCapsuleShape( b, sd, { center1: { x: 0, y: -0.4, z: 0 }, center2: { x: 0, y: 0.4, z: 0 }, radius: 0.4 } ) },
	{ name: 'pyramid', attach: ( b, sd ) => b3.b3CreateHullShape( b, sd, pyramidHull ) },
	{ name: 'tetra', attach: ( b, sd ) => b3.b3CreateHullShape( b, sd, tetraHull ) },
	{ name: 'cylinder', attach: ( b, sd ) => b3.b3CreateHullShape( b, sd, cylinderHull ) },
	{ name: 'cone', attach: ( b, sd ) => b3.b3CreateHullShape( b, sd, coneHull ) },
];

type DynamicShape = { body: b3BodyId; config: ShapeConfig };
const dynamicShapes: DynamicShape[] = [];

const settings = { numberOfBodies: 200, respawnIntervalMs: 10 };
const SPAWN_HEIGHT = 15;
const SPAWN_AREA = 8;

const randomInRange = ( min: number, max: number ): number => Math.random() * ( max - min ) + min;

function randomRotation(): { v: { x: number; y: number; z: number }; s: number }
{
	const axis = new THREE.Vector3( Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 ).normalize();
	const q = new THREE.Quaternion().setFromAxisAngle( axis, Math.random() * Math.PI * 2 );
	return { v: { x: q.x, y: q.y, z: q.z }, s: q.w };
}

function spawnShape( config: ShapeConfig ): DynamicShape
{
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = { x: randomInRange( -SPAWN_AREA, SPAWN_AREA ), y: SPAWN_HEIGHT, z: randomInRange( -SPAWN_AREA, SPAWN_AREA ) };
	def.rotation = randomRotation();
	const body = b3.b3CreateBody( world, def );
	config.attach( body, b3.b3DefaultShapeDef() );
	const entry = { body, config };
	dynamicShapes.push( entry );
	return entry;
}

function updateBodyCount(): void
{
	while ( dynamicShapes.length < settings.numberOfBodies )
	{
		spawnShape( shapeConfigs[Math.floor( Math.random() * shapeConfigs.length )] );
	}
	while ( dynamicShapes.length > settings.numberOfBodies )
	{
		const removed = dynamicShapes.pop();
		if ( removed ) b3.b3DestroyBody( removed.body );
	}
}

updateBodyCount();

/* simulation loop */

const renderer = createWorldRenderer( b3, world );
app.scene.add( renderer.object3d );

const gui = app.gui;
gui.add( settings, 'numberOfBodies', 0, 300, 1 ).name( 'number of bodies' ).onChange( updateBodyCount );
gui.add( settings, 'respawnIntervalMs', 100, 1000, 10 ).name( 'respawn interval (ms)' );

let lastRespawn = performance.now();
let respawnIndex = 0;

app.onFrame( () =>
{
	app.step( () => b3.b3World_Step( world, 1 / 60, 4 ) );

	// round-robin respawn: recycle one body up top on the interval
	const now = performance.now();
	if ( dynamicShapes.length > 0 && now - lastRespawn >= settings.respawnIntervalMs )
	{
		lastRespawn = now;
		const entry = dynamicShapes[respawnIndex % dynamicShapes.length];
		b3.b3DestroyBody( entry.body );
		entry.config = shapeConfigs[Math.floor( Math.random() * shapeConfigs.length )];
		const def = b3.b3DefaultBodyDef();
		def.type = b3.b3BodyType.b3_dynamicBody;
		def.position = { x: randomInRange( -SPAWN_AREA, SPAWN_AREA ), y: SPAWN_HEIGHT, z: randomInRange( -SPAWN_AREA, SPAWN_AREA ) };
		def.rotation = randomRotation();
		entry.body = b3.b3CreateBody( world, def );
		entry.config.attach( entry.body, b3.b3DefaultShapeDef() );
		respawnIndex++;
	}

	updateBodyCount();
	renderer.update();
} );
app.start();
