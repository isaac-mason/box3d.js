// Allocation test: the out-param readers are meant to be zero-alloc on the hot path
// (they fill a caller-owned array and cross the wasm boundary with loose scalars, so
// there's no per-call embind value_object/value_array temp). This measures steady-state
// JS heap growth per call via forced-GC heapUsed deltas and fails if a reader regresses
// back to composite-argument marshaling (~100 B/call).
//
// Needs --expose-gc: `node --expose-gc test/alloc.mjs` (wired into `npm test`).

import assert from 'node:assert/strict';

if ( typeof global.gc !== 'function' )
{
	console.error( 'alloc test must be run with --expose-gc (e.g. `node --expose-gc test/alloc.mjs`)' );
	process.exit( 1 );
}

// A reader that still marshals a value_object/value_array arg allocates ~100 B/call; a
// zero-alloc one sits at the sub-1 B GC noise floor. 16 B cleanly separates the two.
const ZERO_ALLOC_LIMIT = 16;
// Multi-out readers (GetTransform: position + rotation) return a per-reader reused
// tuple filled with the caller's out args, so they're zero-alloc too.
// CastRayClosest fills a caller-owned result in place and is zero-alloc when the cast
// doesn't touch userMaterialId (a lazy getter that builds a BigInt only on read). This
// probe never reads it, so it should sit at the noise floor — down from ~150 B for the
// old value_object return.
const RAY_LIMIT = 16;

// Median per-call heapUsed delta over R rounds of N calls, after a warm-up so the JIT
// has settled and any one-time (first-call) allocations are already paid.
function bytesPerCall( fn, N = 20000, R = 9 )
{
	for ( let i = 0; i < 2000; i++ ) fn();
	const deltas = [];
	for ( let r = 0; r < R; r++ )
	{
		global.gc(); global.gc();
		const before = process.memoryUsage().heapUsed;
		for ( let i = 0; i < N; i++ ) fn();
		deltas.push( ( process.memoryUsage().heapUsed - before ) / N );
	}
	deltas.sort( ( a, b ) => a - b );
	return deltas[ Math.floor( R / 2 ) ];
}

function allocReaders( b3 )
{
	// a settled falling-sphere world, so the readers return real (non-trivial) values
	const worldDef = b3.b3DefaultWorldDef();
	worldDef.gravity = [ 0, -10, 0 ];
	const world = b3.b3CreateWorld( worldDef );

	const groundDef = b3.b3DefaultBodyDef();
	groundDef.type = b3.b3BodyType.b3_staticBody;
	const ground = b3.b3CreateBody( world, groundDef );
	b3.b3CreateBoxShape( ground, b3.b3DefaultShapeDef(), 25, 0.5, 25 );

	const bodyDef = b3.b3DefaultBodyDef();
	bodyDef.type = b3.b3BodyType.b3_dynamicBody;
	bodyDef.position = [ 0, 5, 0 ];
	const body = b3.b3CreateBody( world, bodyDef );
	b3.b3CreateSphereShape( body, b3.b3DefaultShapeDef(), { center: [ 0, 0, 0 ], radius: 0.5 } );
	for ( let i = 0; i < 30; i++ ) b3.b3World_Step( world, 1 / 60, 4 );

	// caller-owned outputs + inputs, allocated once (never inside the measured loop)
	const out = [ 0, 0, 0 ];
	const outQ = [ 0, 0, 0, 1 ];
	const point = [ 1, 2, 3 ];
	const rayHit = b3.createRayResult();
	const rayOrigin = [ 0, 5, 0 ], rayDir = [ 0, -10, 0 ];
	const filter = b3.b3DefaultQueryFilter();

	// (label, thunk, limit): one representative reader per argument shape
	const cases = [
		[ 'b3Body_GetPosition(out, bodyId)', () => b3.b3Body_GetPosition( out, body ), ZERO_ALLOC_LIMIT ],
		[ 'b3Body_GetRotation(out, bodyId)', () => b3.b3Body_GetRotation( outQ, body ), ZERO_ALLOC_LIMIT ],
		[ 'b3Body_GetLinearVelocity(out, bodyId)', () => b3.b3Body_GetLinearVelocity( out, body ), ZERO_ALLOC_LIMIT ],
		[ 'b3Body_GetWorldPointVelocity(out, bodyId, p)', () => b3.b3Body_GetWorldPointVelocity( out, body, point ), ZERO_ALLOC_LIMIT ],
		[ 'b3World_GetGravity(out, worldId)', () => b3.b3World_GetGravity( out, world ), ZERO_ALLOC_LIMIT ],
		[ 'b3Body_GetTransform(outPos, outRot, bodyId)', () => b3.b3Body_GetTransform( out, outQ, body ), ZERO_ALLOC_LIMIT ],
		[ 'b3World_CastRayClosest(out, world, o, t, filter)', () => b3.b3World_CastRayClosest( rayHit, world, rayOrigin, rayDir, filter ), RAY_LIMIT ],
	];

	for ( const [ label, fn, limit ] of cases )
	{
		const b = bytesPerCall( fn );
		console.log( `  ${label.padEnd( 46 )} ${b.toFixed( 1 ).padStart( 6 )} B/call  (limit ${limit})` );
		assert.ok( b < limit, `${label} allocates ${b.toFixed( 1 )} B/call, expected < ${limit} B/call` );
	}

	b3.b3DestroyWorld( world );
}

console.log( 'box3d.js allocation test' );
const { default: Box3D } = await import( '../dist/box3d.mjs' );
const b3 = await Box3D();
allocReaders( b3 );
console.log( 'OK' );
