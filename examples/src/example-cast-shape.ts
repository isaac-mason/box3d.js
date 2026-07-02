// Cast Shape — the shapecast companion to cast-ray: a
// shell of shape-casters drifts around a central torus-knot mesh. Each caster
// shows the cast box at its origin (radius `pointDist`) and a second box at the
// closest hit found by sweeping the box inward (b3World_CastShape).

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3ShapeId, b3Vec3 } from 'box3d.js';
import * as THREE from 'three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 3, 11], target: [0, 0, 0] } );

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: 0, z: 0 };
const world = b3.b3CreateWorld( worldDef );

const pointDist = 5;
const CAST_HALF = 0.15; // half-extent of the box we sweep
const boxProxy = [
	-CAST_HALF, -CAST_HALF, -CAST_HALF, CAST_HALF, -CAST_HALF, -CAST_HALF, CAST_HALF, -CAST_HALF, CAST_HALF, -CAST_HALF, -CAST_HALF, CAST_HALF,
	-CAST_HALF, CAST_HALF, -CAST_HALF, CAST_HALF, CAST_HALF, -CAST_HALF, CAST_HALF, CAST_HALF, CAST_HALF, -CAST_HALF, CAST_HALF, CAST_HALF,
];

// central torus-knot target
const knotGeom = new THREE.TorusKnotGeometry( 1.2, 0.4, 160, 20 ).toNonIndexed();
const knotPos = knotGeom.getAttribute( 'position' ).array as Float32Array;
const knotIdx = new Uint32Array( knotPos.length / 3 );
for ( let i = 0; i < knotIdx.length; i++ ) knotIdx[i] = i;
const meshData = b3.b3CreateMesh( knotPos, knotIdx );
const targetBody = b3.b3CreateBody( world, b3.b3DefaultBodyDef() );
b3.b3CreateMeshShape( targetBody, b3.b3DefaultShapeDef(), meshData, { x: 1, y: 1, z: 1 } );
knotGeom.computeVertexNormals();
const targetMesh = new THREE.Mesh( knotGeom, new THREE.MeshStandardMaterial( { color: 0x3f51b5, roughness: 0.4, metalness: 0.2 } ) );
app.scene.add( targetMesh );

// shape-casters
const filter = b3.b3DefaultQueryFilter();
const boxGeo = new THREE.BoxGeometry( CAST_HALF * 2, CAST_HALF * 2, CAST_HALF * 2 );
const originMat = new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: true } );
const hitMat = new THREE.MeshStandardMaterial( { color: 0x6bcb77, emissive: 0x1a3a1f } );

type Caster = { root: THREE.Object3D; hitMesh: THREE.Mesh; quat: THREE.Quaternion; spin: THREE.Vector3 };
const casters: Caster[] = [];
const CAST_COUNT = 110;
for ( let i = 0; i < CAST_COUNT; i++ )
{
	const root = new THREE.Object3D();
	const originMesh = new THREE.Mesh( boxGeo, originMat );
	originMesh.position.set( pointDist, 0, 0 );
	const hitMesh = new THREE.Mesh( boxGeo, hitMat );
	root.add( originMesh, hitMesh );
	root.quaternion.setFromEuler( new THREE.Euler( Math.random() * 10, Math.random() * 10, Math.random() * 10 ) );
	app.scene.add( root );
	casters.push( {
		root,
		hitMesh,
		quat: root.quaternion.clone(),
		spin: new THREE.Vector3( ( Math.random() - 0.5 ) * 0.6, ( Math.random() - 0.5 ) * 0.6, ( Math.random() - 0.5 ) * 0.6 ),
	} );
}

const _o = new THREE.Vector3();
const _dq = new THREE.Quaternion();
const _e = new THREE.Euler();
let targetAngle = 0;

app.onFrame( ( dt ) =>
{
	targetAngle += dt * 0.3;
	const tq = new THREE.Quaternion().setFromAxisAngle( new THREE.Vector3( 0.3, 1, 0.2 ).normalize(), targetAngle );
	b3.b3Body_SetTransform( targetBody, { x: 0, y: 0, z: 0 }, { v: { x: tq.x, y: tq.y, z: tq.z }, s: tq.w } );
	targetMesh.quaternion.copy( tq );
	b3.b3World_Step( world, 1 / 60, 1 );

	for ( const c of casters )
	{
		_dq.setFromEuler( _e.set( c.spin.x * dt, c.spin.y * dt, c.spin.z * dt ) );
		c.quat.multiply( _dq );
		c.root.quaternion.copy( c.quat );
		c.root.updateMatrixWorld();

		c.root.children[0].getWorldPosition( _o );
		const dir = _o.clone().multiplyScalar( -1 ).normalize();

		let bestFrac = Infinity;
		b3.b3World_CastShape(
			world,
			{ x: _o.x, y: _o.y, z: _o.z },
			boxProxy, 0,
			{ x: dir.x * pointDist, y: dir.y * pointDist, z: dir.z * pointDist },
			filter,
			( _s: b3ShapeId, _p: b3Vec3, _n: b3Vec3, fraction: number ) =>
			{
				if ( fraction < bestFrac ) bestFrac = fraction;
				return fraction;
			},
		);

		const hit = bestFrac < Infinity;
		c.hitMesh.visible = hit;
		if ( hit ) c.hitMesh.position.set( pointDist - bestFrac * pointDist, 0, 0 );
	}
} );
app.start();
