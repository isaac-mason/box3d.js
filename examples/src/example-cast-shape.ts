// Cast Shape — the shapecast companion to cast-ray. Instead of infinitely thin
// rays, a small sphere is swept inward at the spinning torus-knot mesh
// (b3World_CastShape). Each sweep keeps its closest hit; hits light up green.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3ShapeId, b3Vec3 } from 'box3d.js';
import * as THREE from 'three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 4, 16], target: [0, 0, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: 0, z: 0 };
const world = b3.b3CreateWorld( worldDef );

// torus-knot target as a triangle mesh
const knotGeom = new THREE.TorusKnotGeometry( 3, 1, 120, 20 ).toNonIndexed();
const knotPos = knotGeom.getAttribute( 'position' ).array as Float32Array;
const knotIdx = new Uint32Array( knotPos.length / 3 );
for ( let i = 0; i < knotIdx.length; i++ ) knotIdx[i] = i;
const meshData = b3.b3CreateMesh( knotPos, knotIdx );
const targetBody = b3.b3CreateBody( world, b3.b3DefaultBodyDef() );
b3.b3CreateMeshShape( targetBody, b3.b3DefaultShapeDef(), meshData, { x: 1, y: 1, z: 1 } );
knotGeom.computeVertexNormals();
const targetMesh = new THREE.Mesh( knotGeom, new THREE.MeshStandardMaterial( { color: 0x3f51b5, roughness: 0.4, metalness: 0.2 } ) );
app.scene.add( targetMesh );

// shell of sweep origins
const CAST_COUNT = 220;
const SHELL = 8;
const PROBE_RADIUS = 0.35;
const origins: THREE.Vector3[] = [];
const phi = Math.PI * ( 3 - Math.sqrt( 5 ) );
for ( let i = 0; i < CAST_COUNT; i++ )
{
	const y = 1 - ( i / ( CAST_COUNT - 1 ) ) * 2;
	const r = Math.sqrt( 1 - y * y );
	const th = phi * i;
	origins.push( new THREE.Vector3( Math.cos( th ) * r, y, Math.sin( th ) * r ).multiplyScalar( SHELL ) );
}

// green spheres marking the swept-sphere hit positions
const hitGeom = new THREE.SphereGeometry( PROBE_RADIUS, 8, 6 );
const hitMesh = new THREE.InstancedMesh( hitGeom, new THREE.MeshStandardMaterial( { color: 0x6bcb77, emissive: 0x1a3a1f } ), CAST_COUNT );
hitMesh.instanceMatrix.setUsage( THREE.DynamicDrawUsage );
app.scene.add( hitMesh );

const filter = b3.b3DefaultQueryFilter();
const _dir = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _hide = new THREE.Matrix4().makeScale( 0, 0, 0 );
let angle = 0;

app.onFrame( ( dt ) =>
{
	angle += dt * 0.4;
	const q = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0.3, 1, 0.2 ).normalize(), angle );
	b3.b3Body_SetTransform( targetBody, { x: 0, y: 0, z: 0 }, { v: { x: q.x, y: q.y, z: q.z }, s: q.w } );
	targetMesh.quaternion.copy( q );

	b3.b3World_Step( world, 1 / 60, 1 );

	for ( let i = 0; i < CAST_COUNT; i++ )
	{
		const o = origins[i];
		_dir.copy( o ).multiplyScalar( -1 ).normalize();

		let bestFrac = Infinity;
		let bx = 0, by = 0, bz = 0;
		b3.b3World_CastShape(
			world,
			{ x: o.x, y: o.y, z: o.z },
			[0, 0, 0], // point-cloud proxy = a sphere of the given radius
			PROBE_RADIUS,
			{ x: _dir.x * 2 * SHELL, y: _dir.y * 2 * SHELL, z: _dir.z * 2 * SHELL },
			filter,
			( _shapeId: b3ShapeId, point: b3Vec3, _normal: b3Vec3, fraction: number ) =>
			{
				if ( fraction < bestFrac ) { bestFrac = fraction; bx = point.x; by = point.y; bz = point.z; }
				return fraction; // clip the sweep to the closest hit so far
			},
		);

		if ( bestFrac < Infinity ) hitMesh.setMatrixAt( i, _m.makeTranslation( bx, by, bz ) );
		else hitMesh.setMatrixAt( i, _hide );
	}
	hitMesh.instanceMatrix.needsUpdate = true;
} );
app.start();
