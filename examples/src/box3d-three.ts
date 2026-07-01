// Thin three.js glue for box3d. Examples render shapes as solid THREE meshes
// (map shape -> mesh once, then copy body transforms each frame). box3d's own
// debug draw is exposed separately (b3World_Draw) as a toggleable overlay, not
// the render path. This will be promoted to a published `box3d.js/three` subpath.

import * as THREE from 'three';
import type { Box3DModule, b3BodyId, b3ShapeDef, b3Vec3, b3WorldId } from 'box3d.js';

/** Copy a box3d body's world transform onto a three.js object. */
export function syncMesh( b3: Box3DModule, bodyId: b3BodyId, object: THREE.Object3D ): void
{
	const p = b3.b3Body_GetPosition( bodyId );
	const q = b3.b3Body_GetRotation( bodyId ); // b3Quat = { v: {x,y,z}, s }
	object.position.set( p.x, p.y, p.z );
	object.quaternion.set( q.v.x, q.v.y, q.v.z, q.s );
}

/** Tracks {body, mesh} pairs and syncs them all each frame. */
export class BodyMeshMap
{
	private pairs: Array<{ bodyId: b3BodyId; mesh: THREE.Object3D }> = [];

	constructor( private b3: Box3DModule ) {}

	add( bodyId: b3BodyId, mesh: THREE.Object3D ): void
	{
		this.pairs.push( { bodyId, mesh } );
	}

	sync(): void
	{
		for ( const { bodyId, mesh } of this.pairs ) syncMesh( this.b3, bodyId, mesh );
	}
}

const PALETTE = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xc78bff, 0xff9f45, 0x22d3ee];
let colorIdx = 0;
export function nextColor(): number
{
	return PALETTE[colorIdx++ % PALETTE.length];
}

function standardMaterial( color?: number ): THREE.MeshStandardMaterial
{
	return new THREE.MeshStandardMaterial( { color: color ?? nextColor(), roughness: 0.45, metalness: 0.1 } );
}

export type Vec = { x: number; y: number; z: number };
export interface SpawnOpts
{
	color?: number;
	density?: number;
	restitution?: number;
	friction?: number;
}

export type Handle = { bodyId: b3BodyId; mesh: THREE.Mesh };

/** Spawns box3d bodies paired with solid THREE meshes and tracks them for per-frame sync. */
export class Spawner
{
	readonly bodies: BodyMeshMap;

	constructor(
		private b3: Box3DModule,
		private world: b3WorldId,
		private scene: THREE.Object3D,
	)
	{
		this.bodies = new BodyMeshMap( b3 );
	}

	private shapeDef( o?: SpawnOpts ): b3ShapeDef
	{
		const d = this.b3.b3DefaultShapeDef();
		if ( o?.density !== undefined ) d.density = o.density;
		if ( o?.restitution !== undefined ) d.baseMaterial.restitution = o.restitution;
		if ( o?.friction !== undefined ) d.baseMaterial.friction = o.friction;
		return d;
	}

	private makeBody( type: number, position: Vec, rotation?: b3Vec3 ): b3BodyId
	{
		const d = this.b3.b3DefaultBodyDef();
		d.type = type;
		d.position = position;
		if ( rotation ) d.rotation = { v: rotation, s: Math.sqrt( Math.max( 0, 1 - ( rotation.x ** 2 + rotation.y ** 2 + rotation.z ** 2 ) ) ) };
		return this.b3.b3CreateBody( this.world, d );
	}

	private track( bodyId: b3BodyId, mesh: THREE.Mesh ): Handle
	{
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		this.scene.add( mesh );
		this.bodies.add( bodyId, mesh );
		return { bodyId, mesh };
	}

	sphere( position: Vec, radius: number, o?: SpawnOpts ): Handle
	{
		const body = this.makeBody( this.b3.b3BodyType.b3_dynamicBody.value, position );
		this.b3.b3CreateSphereShape( body, this.shapeDef( o ), { center: { x: 0, y: 0, z: 0 }, radius } );
		return this.track( body, new THREE.Mesh( new THREE.SphereGeometry( radius, 24, 16 ), standardMaterial( o?.color ) ) );
	}

	box( position: Vec, hx: number, hy: number, hz: number, o?: SpawnOpts ): Handle
	{
		const body = this.makeBody( this.b3.b3BodyType.b3_dynamicBody.value, position );
		this.b3.b3CreateBoxShape( body, this.shapeDef( o ), hx, hy, hz );
		return this.track( body, new THREE.Mesh( new THREE.BoxGeometry( hx * 2, hy * 2, hz * 2 ), standardMaterial( o?.color ) ) );
	}

	capsule( position: Vec, radius: number, halfHeight: number, o?: SpawnOpts ): Handle
	{
		const body = this.makeBody( this.b3.b3BodyType.b3_dynamicBody.value, position );
		this.b3.b3CreateCapsuleShape( body, this.shapeDef( o ), {
			center1: { x: 0, y: -halfHeight, z: 0 },
			center2: { x: 0, y: halfHeight, z: 0 },
			radius,
		} );
		return this.track( body, new THREE.Mesh( new THREE.CapsuleGeometry( radius, halfHeight * 2, 8, 16 ), standardMaterial( o?.color ) ) );
	}

	/** A large static floor box centered so its top surface is at y = 0. */
	ground( halfExtent = 20, thickness = 0.5, color = 0x2b2b33 ): Handle
	{
		const body = this.makeBody( this.b3.b3BodyType.b3_staticBody.value, { x: 0, y: -thickness, z: 0 } );
		this.b3.b3CreateBoxShape( body, this.b3.b3DefaultShapeDef(), halfExtent, thickness, halfExtent );
		const mesh = new THREE.Mesh(
			new THREE.BoxGeometry( halfExtent * 2, thickness * 2, halfExtent * 2 ),
			new THREE.MeshStandardMaterial( { color, roughness: 0.95 } ),
		);
		return this.track( body, mesh );
	}

	sync(): void
	{
		this.bodies.sync();
	}
}
