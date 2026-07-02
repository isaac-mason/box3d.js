// Generic world renderer: introspects a box3d world each frame and draws every
// shape with three.js. Examples never track meshes themselves — they build the
// world with the box3d API and hand it here. Geometry is derived by reading the
// shape back out of box3d (b3Shape_GetType / GetSphere / GetCapsule /
// GetHullVertices), so nothing has to be registered up front.
//
// One mesh per shape (cached by shape id). Simple and robust; a THREE.BatchedMesh
// variant is a drop-in optimization if a scene ever needs one draw call.

import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import type { Box3DModule, b3BodyId, b3ShapeId, b3WorldId } from 'box3d.js';

const HUGE_BOUNDS = { lowerBound: { x: -1e9, y: -1e9, z: -1e9 }, upperBound: { x: 1e9, y: 1e9, z: 1e9 } };
const PALETTE = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xc78bff, 0xff9f45, 0x22d3ee];

const shapeKey = ( s: b3ShapeId ): string => `${s.index1}:${s.world0}:${s.generation}`;

// Per-shape color using an "instance" scheme: static bodies get
// dark greys (slight per-body variance), dynamic/kinematic bodies cycle the
// bright palette so the sim stays readable.
function colorFor( b3: Box3DModule, body: b3BodyId, dynamicIdx: number ): THREE.Color
{
	const isStatic = b3.b3Body_GetType( body ).value === b3.b3BodyType.b3_staticBody.value;
	const color = new THREE.Color();
	if ( isStatic )
	{
		const hash = body.index1 * 137.5;
		const lightness = 0.22 + ( ( hash % 100 ) / 100 ) * 0.2; // 0.22 – 0.42
		color.setHSL( 0, 0, lightness );
	}
	else
	{
		color.setHex( PALETTE[dynamicIdx % PALETTE.length] );
	}
	return color;
}

export type WorldRenderer = {
	/** Add this to your THREE scene. */
	readonly object3d: THREE.Object3D;
	/** Call once per frame after stepping the world. */
	update(): void;
	/** The mesh drawn for a shape, if one exists yet (for per-shape effects). */
	getMesh( shapeId: b3ShapeId ): THREE.Mesh | undefined;
}

export function createWorldRenderer( b3: Box3DModule, world: b3WorldId ): WorldRenderer
{
	const group = new THREE.Group();
	const meshes = new Map<string, THREE.Mesh>();
	const filter = b3.b3DefaultQueryFilter();
	const seen = new Set<string>();
	let colorIdx = 0;

	// Build a shape-local three.js geometry by reading the shape back from box3d.
	function geometryFor( shapeId: b3ShapeId ): THREE.BufferGeometry | null
	{
		const type = b3.b3Shape_GetType( shapeId ).value;

		if ( type === b3.b3ShapeType.b3_sphereShape.value )
		{
			const s = b3.b3Shape_GetSphere( shapeId );
			const g = new THREE.SphereGeometry( s.radius, 20, 14 );
			g.translate( s.center.x, s.center.y, s.center.z );
			return g;
		}

		if ( type === b3.b3ShapeType.b3_capsuleShape.value )
		{
			const c = b3.b3Shape_GetCapsule( shapeId );
			const axis = new THREE.Vector3( c.center2.x - c.center1.x, c.center2.y - c.center1.y, c.center2.z - c.center1.z );
			const g = new THREE.CapsuleGeometry( c.radius, axis.length(), 8, 16 );
			g.applyQuaternion( new THREE.Quaternion().setFromUnitVectors( new THREE.Vector3( 0, 1, 0 ), axis.clone().normalize() ) );
			g.translate( ( c.center1.x + c.center2.x ) / 2, ( c.center1.y + c.center2.y ) / 2, ( c.center1.z + c.center2.z ) / 2 );
			return g;
		}

		if ( type === b3.b3ShapeType.b3_hullShape.value )
		{
			const flat = b3.b3Shape_GetHullVertices( shapeId ); // Float32Array [x,y,z,...]
			const points: THREE.Vector3[] = [];
			for ( let i = 0; i < flat.length; i += 3 ) points.push( new THREE.Vector3( flat[i], flat[i + 1], flat[i + 2] ) );
			return new ConvexGeometry( points );
		}

		// mesh / heightfield / compound: no generic geometry (can't introspect a
		// compound shape, and mesh/height data isn't read back) — the example that
		// created these draws its own meshes.
		return null;
	}

	function update(): void
	{
		seen.clear();

		b3.b3World_OverlapAABB( world, HUGE_BOUNDS, filter, ( shapeId: b3ShapeId ) =>
		{
			const key = shapeKey( shapeId );
			seen.add( key );

			const body = b3.b3Shape_GetBody( shapeId );

			let mesh = meshes.get( key );
			if ( mesh === undefined )
			{
				const geometry = geometryFor( shapeId );
				if ( geometry === null ) return true; // unsupported shape — example renders it
				const material = new THREE.MeshStandardMaterial( {
					color: colorFor( b3, body, colorIdx ),
					roughness: 0.5,
					metalness: 0.05,
				} );
				// Only advance the bright palette for dynamic/kinematic bodies.
				if ( b3.b3Body_GetType( body ).value !== b3.b3BodyType.b3_staticBody.value ) colorIdx++;
				mesh = new THREE.Mesh( geometry, material );
				mesh.castShadow = true;
				mesh.receiveShadow = true;
				meshes.set( key, mesh );
				group.add( mesh );
			}

			const p = b3.b3Body_GetPosition( body );
			const q = b3.b3Body_GetRotation( body );
			mesh.position.set( p.x, p.y, p.z );
			mesh.quaternion.set( q.v.x, q.v.y, q.v.z, q.s );
			mesh.visible = true;
			return true; // continue enumeration
		} );

		// hide shapes that were destroyed since last frame
		for ( const [key, mesh] of meshes )
		{
			if ( !seen.has( key ) ) mesh.visible = false;
		}
	}

	return { object3d: group, update, getMesh: ( shapeId ) => meshes.get( shapeKey( shapeId ) ) };
}
