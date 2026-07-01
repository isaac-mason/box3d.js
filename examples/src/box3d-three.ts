// Thin three.js glue for box3d. For now examples keep their own body<->mesh
// pairs and copy transforms each frame (box3d exposes b3Body_GetPosition /
// b3Body_GetRotation). A generic world debug renderer bridged to b3DebugDraw
// will land once the callback bindings do (M4), and this will be promoted to a
// published `box3d.js/three` subpath export.

import * as THREE from 'three';
import type { Box3DModule, b3BodyId } from 'box3d.js';

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
		for ( const { bodyId, mesh } of this.pairs )
		{
			syncMesh( this.b3, bodyId, mesh );
		}
	}
}
