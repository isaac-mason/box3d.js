// Dynamic Tree — box3d's broadphase is an AABB tree (b3DynamicTree). This is the
// tree on its own, no world: a cloud of boxes are inserted as proxies and moved
// every frame (b3DynamicTree_MoveProxy). A ray sweeps around and b3DynamicTree_RayCast
// lights up the proxies it crosses; a query box highlights everything it overlaps
// (b3DynamicTree_Query). The tree's root bounds and live stats are shown too.

import Box3D from 'box3d.js/inline';
import type { Box3DModule } from 'box3d.js';
import * as THREE from 'three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness( { camera: [0, 10, 26], target: [0, 0, 0] } );

const BOUND = 9; // proxies bounce inside [-BOUND, BOUND]
type Proxy = { id: number; userData: number; pos: THREE.Vector3; vel: THREE.Vector3; half: number; mesh: THREE.Mesh };

let tree = b3.b3CreateDynamicTree( 256 );
let proxies: Proxy[] = [];
const group = new THREE.Group();
app.scene.add( group );

// wireframe box for the tree's root bounds
const rootBox = new THREE.LineSegments(
	new THREE.EdgesGeometry( new THREE.BoxGeometry( 1, 1, 1 ) ),
	new THREE.LineBasicMaterial( { color: 0x444444 } ),
);
app.scene.add( rootBox );

const BASE = new THREE.Color( 0x4d96ff );
const RAY_HIT = new THREE.Color( 0xff4020 );
const QUERY_HIT = new THREE.Color( 0x6bcb77 );

let seed = 7;
function rand(): number { seed = ( seed * 1103515245 + 12345 ) & 0x7fffffff; return seed / 0x7fffffff; }

function aabbOf( p: Proxy ) {
	return {
		lowerBound: { x: p.pos.x - p.half, y: p.pos.y - p.half, z: p.pos.z - p.half },
		upperBound: { x: p.pos.x + p.half, y: p.pos.y + p.half, z: p.pos.z + p.half },
	};
}

function rebuild( count: number ): void
{
	for ( const p of proxies ) group.remove( p.mesh );
	b3.b3DestroyDynamicTree( tree );
	tree = b3.b3CreateDynamicTree( Math.max( 16, count ) );
	proxies = [];
	seed = 7;
	for ( let i = 0; i < count; i++ )
	{
		const half = 0.3 + rand() * 0.5;
		const pos = new THREE.Vector3( ( rand() * 2 - 1 ) * BOUND, ( rand() * 2 - 1 ) * BOUND, ( rand() * 2 - 1 ) * BOUND );
		const vel = new THREE.Vector3( ( rand() * 2 - 1 ), ( rand() * 2 - 1 ), ( rand() * 2 - 1 ) ).multiplyScalar( 4 );
		const mesh = new THREE.Mesh(
			new THREE.BoxGeometry( half * 2, half * 2, half * 2 ),
			new THREE.MeshStandardMaterial( { color: BASE, roughness: 0.5, transparent: true, opacity: 0.85 } ),
		);
		group.add( mesh );
		const id = b3.b3DynamicTree_CreateProxy( tree, aabbOf( { pos, half } as Proxy ), 1, i );
		proxies.push( { id, userData: i, pos, vel, half, mesh } );
	}
}

const params = { proxies: 120, ray: true, query: true, rebuild: () => rebuild( params.proxies ) };
rebuild( params.proxies );
app.gui.add( params, 'proxies', 10, 400, 10 ).onChange( () => rebuild( params.proxies ) );
app.gui.add( params, 'ray' ).name( 'sweeping ray' );
app.gui.add( params, 'query' ).name( 'query box' );
const stats = { height: 0, areaRatio: 0, rayVisits: 0 };
app.gui.add( stats, 'height' ).listen().disable();
app.gui.add( stats, 'areaRatio' ).listen().disable();
app.gui.add( stats, 'rayVisits' ).name( 'ray leaf visits' ).listen().disable();

// the sweeping ray, drawn as a line
const rayLine = new THREE.Line(
	new THREE.BufferGeometry().setFromPoints( [new THREE.Vector3(), new THREE.Vector3()] ),
	new THREE.LineBasicMaterial( { color: 0xffd93d } ),
);
app.scene.add( rayLine );

// the query box, drawn as a wireframe
const QSIZE = 5;
const queryBox = new THREE.LineSegments(
	new THREE.EdgesGeometry( new THREE.BoxGeometry( QSIZE, QSIZE, QSIZE ) ),
	new THREE.LineBasicMaterial( { color: QUERY_HIT } ),
);
app.scene.add( queryBox );

let t = 0;
const idToProxy = new Map<number, Proxy>();

app.onFrame( ( dt: number ) =>
{
	t += dt;
	idToProxy.clear();

	// move every proxy, bouncing off the bounds, and update the tree
	app.step( () =>
	{
		for ( const p of proxies )
		{
			p.pos.addScaledVector( p.vel, dt );
			for ( const axis of ['x', 'y', 'z'] as const )
			{
				if ( p.pos[axis] > BOUND - p.half ) { p.pos[axis] = BOUND - p.half; p.vel[axis] *= -1; }
				if ( p.pos[axis] < -BOUND + p.half ) { p.pos[axis] = -BOUND + p.half; p.vel[axis] *= -1; }
			}
			b3.b3DynamicTree_MoveProxy( tree, p.id, aabbOf( p ) );
			p.mesh.position.copy( p.pos );
			( p.mesh.material as THREE.MeshStandardMaterial ).color.copy( BASE );
			idToProxy.set( p.userData, p ); // map proxy userData -> proxy for query/raycast callbacks
		}
	} );

	// query box overlap
	queryBox.visible = params.query;
	if ( params.query )
	{
		const h = QSIZE / 2;
		b3.b3DynamicTree_Query(
			tree,
			{ lowerBound: { x: -h, y: -h, z: -h }, upperBound: { x: h, y: h, z: h } },
			0xffffffff,
			( _pid: number, userData: number ) =>
			{
				const p = idToProxy.get( userData );
				if ( p ) ( p.mesh.material as THREE.MeshStandardMaterial ).color.copy( QUERY_HIT );
				return true;
			},
		);
	}

	// sweeping ray from outside the cloud toward the centre
	rayLine.visible = params.ray;
	if ( params.ray )
	{
		const r = BOUND + 6;
		const origin = { x: Math.cos( t * 0.6 ) * r, y: Math.sin( t * 0.35 ) * 4, z: Math.sin( t * 0.6 ) * r };
		const translation = { x: -origin.x * 2, y: -origin.y * 2, z: -origin.z * 2 };
		const s = b3.b3DynamicTree_RayCast(
			tree, origin, translation, 1, 0xffffffff,
			( _pid: number, userData: number ) =>
			{
				const p = idToProxy.get( userData );
				if ( p ) ( p.mesh.material as THREE.MeshStandardMaterial ).color.copy( RAY_HIT );
				return 1; // keep going so every crossed proxy lights up
			},
		);
		stats.rayVisits = s.leafVisits;
		( rayLine.geometry as THREE.BufferGeometry ).setFromPoints( [
			new THREE.Vector3( origin.x, origin.y, origin.z ),
			new THREE.Vector3( origin.x + translation.x, origin.y + translation.y, origin.z + translation.z ),
		] );
	}

	// root bounds + stats
	const rb = b3.b3DynamicTree_GetRootBounds( tree );
	rootBox.position.set( ( rb.lowerBound.x + rb.upperBound.x ) / 2, ( rb.lowerBound.y + rb.upperBound.y ) / 2, ( rb.lowerBound.z + rb.upperBound.z ) / 2 );
	rootBox.scale.set( rb.upperBound.x - rb.lowerBound.x, rb.upperBound.y - rb.lowerBound.y, rb.upperBound.z - rb.lowerBound.z );
	stats.height = b3.b3DynamicTree_GetHeight( tree );
	stats.areaRatio = Math.round( b3.b3DynamicTree_GetAreaRatio( tree ) * 100 ) / 100;
} );
app.start();
