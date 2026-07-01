// Cast Ray — inspired by the crashcat cast-ray demo. A spinning torus-knot
// triangle mesh sits at the centre; a shell of rays fires inward at it every
// frame (b3World_CastRayClosest). Rays that hit light up green at the hit point;
// misses fade. All rays are drawn in a single THREE.LineSegments for speed.

import Box3D from 'box3d.js/inline';
import type { Box3DModule } from 'box3d.js';
import * as THREE from 'three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 4, 16], target: [0, 0, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: 0, z: 0 };
const world = b3.b3CreateWorld( worldDef );

// --- torus-knot target as a triangle mesh ---
const knotGeom = new THREE.TorusKnotGeometry( 3, 1, 120, 20 ).toNonIndexed();
const knotPos = knotGeom.getAttribute( 'position' ).array as Float32Array;
const knotIdx = new Uint32Array( knotPos.length / 3 );
for ( let i = 0; i < knotIdx.length; i++ ) knotIdx[i] = i;

const meshData = b3.b3CreateMesh( knotPos, knotIdx );
const targetBody = b3.b3CreateBody( world, b3.b3DefaultBodyDef() ); // static, spun via SetTransform
b3.b3CreateMeshShape( targetBody, b3.b3DefaultShapeDef(), meshData, { x: 1, y: 1, z: 1 } );

knotGeom.computeVertexNormals();
const targetMesh = new THREE.Mesh( knotGeom, new THREE.MeshStandardMaterial( { color: 0xe91e63, roughness: 0.4, metalness: 0.2 } ) );
app.scene.add( targetMesh );

// --- ray shell (fibonacci sphere of origins, all aimed at the centre) ---
const RAY_COUNT = 300;
const SHELL = 8;
const origins: THREE.Vector3[] = [];
const phi = Math.PI * ( 3 - Math.sqrt( 5 ) );
for ( let i = 0; i < RAY_COUNT; i++ )
{
	const y = 1 - ( i / ( RAY_COUNT - 1 ) ) * 2;
	const r = Math.sqrt( 1 - y * y );
	const th = phi * i;
	origins.push( new THREE.Vector3( Math.cos( th ) * r, y, Math.sin( th ) * r ).multiplyScalar( SHELL ) );
}

const linePos = new Float32Array( RAY_COUNT * 2 * 3 );
const lineCol = new Float32Array( RAY_COUNT * 2 * 3 );
const lineGeom = new THREE.BufferGeometry();
lineGeom.setAttribute( 'position', new THREE.BufferAttribute( linePos, 3 ) );
lineGeom.setAttribute( 'color', new THREE.BufferAttribute( lineCol, 3 ) );
const lines = new THREE.LineSegments( lineGeom, new THREE.LineBasicMaterial( { vertexColors: true, transparent: true, opacity: 0.6 } ) );
app.scene.add( lines );

const filter = b3.b3DefaultQueryFilter();
const _dir = new THREE.Vector3();
let angle = 0;

app.onFrame( ( dt ) =>
{
	// spin the target mesh
	angle += dt * 0.4;
	const q = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0.3, 1, 0.2 ).normalize(), angle );
	b3.b3Body_SetTransform( targetBody, { x: 0, y: 0, z: 0 }, { v: { x: q.x, y: q.y, z: q.z }, s: q.w } );
	targetMesh.quaternion.copy( q );

	b3.b3World_Step( world, 1 / 60, 1 );

	// cast every ray inward at the centre
	for ( let i = 0; i < RAY_COUNT; i++ )
	{
		const o = origins[i];
		_dir.copy( o ).multiplyScalar( -1 ).normalize();
		const result = b3.b3World_CastRayClosest(
			world,
			{ x: o.x, y: o.y, z: o.z },
			{ x: _dir.x * 2 * SHELL, y: _dir.y * 2 * SHELL, z: _dir.z * 2 * SHELL },
			filter,
		);

		const p = i * 6;
		linePos[p] = o.x; linePos[p + 1] = o.y; linePos[p + 2] = o.z;
		if ( result.hit )
		{
			linePos[p + 3] = result.point.x; linePos[p + 4] = result.point.y; linePos[p + 5] = result.point.z;
			lineCol[p] = lineCol[p + 3] = 0.3; lineCol[p + 1] = lineCol[p + 4] = 1.0; lineCol[p + 2] = lineCol[p + 5] = 0.4;
		}
		else
		{
			linePos[p + 3] = o.x + _dir.x * 2 * SHELL; linePos[p + 4] = o.y + _dir.y * 2 * SHELL; linePos[p + 5] = o.z + _dir.z * 2 * SHELL;
			lineCol[p] = lineCol[p + 3] = 0.14; lineCol[p + 1] = lineCol[p + 4] = 0.14; lineCol[p + 2] = lineCol[p + 5] = 0.2;
		}
	}
	lineGeom.getAttribute( 'position' ).needsUpdate = true;
	lineGeom.getAttribute( 'color' ).needsUpdate = true;
} );
app.start();
