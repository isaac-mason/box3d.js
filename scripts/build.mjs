// Build box3d.js: compile box3d (static lib) with the Emscripten toolchain,
// then link our embind bindings into ES-module outputs.
//
// Single-threaded (default):
//   dist/box3d.mjs + dist/box3d.wasm   (separate wasm)
//   dist/box3d.inline.mjs              (inlined SINGLE_FILE)
//   dist/box3d.d.ts                    (emitted TypeScript defs, shared by all)
//
// Multithreaded (pthreads, opt-in — box3d's internal scheduler runs on the
// Emscripten pthread pool when worldDef.workerCount > 1):
//   dist/box3d.mt.mjs + dist/box3d.mt.wasm   (separate wasm)
//   dist/box3d.mt.inline.mjs                 (inlined SINGLE_FILE)
//
// Requires the Emscripten SDK on PATH (emcmake / em++). Source emsdk_env first.
// MT builds need cross-origin isolation (COOP: same-origin, COEP: require-corp)
// in the browser for SharedArrayBuffer.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve( dirname( fileURLToPath( import.meta.url ) ), '..' );
const debug = process.argv.includes( '--debug' );

// box3d clamps workerCount to [1, B3_MAX_WORKERS] (=32). The Emscripten pthread
// pool must be >= the max threads the scheduler can spawn or it deadlocks
// (the well-documented JoltPhysics.js gotcha), so size the pool to 32.
const PTHREAD_POOL_SIZE = 32;
const MAXIMUM_MEMORY = 2147483648; // 2 GiB — required with growth + shared memory

function run( cmd, args )
{
	console.log( `\n$ ${cmd} ${args.join( ' ' )}\n` );
	execFileSync( cmd, args, { stdio: 'inherit', cwd: root } );
}

function findFile( dir, name )
{
	for ( const e of readdirSync( dir, { withFileTypes: true } ) )
	{
		const p = join( dir, e.name );
		if ( e.isDirectory() )
		{
			const r = findFile( p, name );
			if ( r ) return r;
		}
		else if ( e.name === name )
		{
			return p;
		}
	}
	return null;
}

// Configure + build box3d as a static lib in its own build dir. `cflags` adds
// compile flags (used to compile box3d itself with -pthread for the MT lib).
function buildBox3dLib( buildDir, cflags )
{
	const args = [ 'cmake',
		'-S', 'vendor/box3d',
		'-B', buildDir,
		'-DCMAKE_BUILD_TYPE=' + ( debug ? 'Debug' : 'Release' ),
		'-DBOX3D_SAMPLES=OFF',
		'-DBOX3D_UNIT_TESTS=OFF',
		'-DBOX3D_BENCHMARKS=OFF',
		'-DBOX3D_DOCS=OFF',
		'-DBOX3D_VALIDATE=OFF',
	];
	if ( cflags ) args.push( '-DCMAKE_C_FLAGS=' + cflags );
	run( 'emcmake', args );
	run( 'cmake', [ '--build', buildDir, '--target', 'box3d', '-j', '8' ] );
	const lib = findFile( join( root, buildDir ), 'libbox3d.a' );
	if ( !lib ) throw new Error( `libbox3d.a not found under ${buildDir}` );
	return lib;
}

mkdirSync( join( root, 'dist' ), { recursive: true } );

// box3d static libs: single-threaded, and a threaded one (box3d compiled with
// -pthread -sSHARED_MEMORY so its scheduler uses real threads).
const stLib = buildBox3dLib( 'build/box3d', null );
const mtLib = buildBox3dLib( 'build/box3d-mt', '-pthread -sSHARED_MEMORY' );
console.log( 'box3d ST lib:', stLib );
console.log( 'box3d MT lib:', mtLib );

// Flags common to every link (bindings source + engine lib are prepended per build).
const commonFlags = [
	'-I', 'vendor/box3d/include',
	'-std=c++17',
	'-lembind',
	// Ergonomic JS readers for the packed query buffers, appended into the
	// MODULARIZE factory so they attach to the same module object as embind.
	'--post-js', 'src/facade.js',
	'-msimd128',
	'-sMODULARIZE=1',
	'-sEXPORT_ES6=1',
	'-sEXPORT_NAME=Box3D',
	'-sALLOW_MEMORY_GROWTH=1',
	'-sWASM_BIGINT=1',
	'-sFILESYSTEM=0',
	'-sENVIRONMENT=web,worker,node',
	// NDEBUG in release matches how libbox3d.a is built, so box3d's asserting
	// inline header functions (e.g. b3MakeQuatFromAxisAngle) don't pull in the
	// b3InternalAssert symbol the release lib omits.
	...( debug ? [ '-O0', '-g', '-sASSERTIONS=2' ] : [ '-O3', '-DNDEBUG' ] ),
];

// Multithreaded delta (from the JoltPhysics.js MT build).
const mtFlags = [
	'-pthread',
	'-sSHARED_MEMORY',
	`-sPTHREAD_POOL_SIZE=${PTHREAD_POOL_SIZE}`,
	`-sMAXIMUM_MEMORY=${MAXIMUM_MEMORY}`,
];

// --- single-threaded ---
// Separate-wasm build (also emits the shared TypeScript defs).
run( 'em++', [ 'src/bindings.cpp', stLib, ...commonFlags, '--emit-tsd', 'box3d.d.ts', '-o', 'dist/box3d.mjs' ] );

// emscripten hardcodes MainModule / MainModuleFactory in --emit-tsd output.
// Rename them to friendlier box3d names.
// Also fix the Get*Events return types: the lambdas return val::object() which
// --emit-tsd can only see as `any`, but the runtime shape is well-defined.
// Types for the packed query buffers and the src/facade.js reader helpers,
// intersected into Box3DModule below so `b3.getContactAt(...)` etc. are typed.
const facadeTypes = `// The facade readers below emit named {x,y,z} objects (ergonomic field
// access over the packed buffers), distinct from the core b3Vec3 mathcat arrays.
export interface Vec3Obj { x: number; y: number; z: number }
export interface ShapeIdBuffer { count: number; data: Int32Array; }
export interface ContactBuffer {
  count: number;
  contactsI32: Int32Array;
  manifoldsF32: Float32Array;
  manifoldsI32: Int32Array;
  pointsF32: Float32Array;
  pointsI32: Int32Array;
  readonly contactsBase?: number;
  readonly manifoldsF32Base?: number;
  readonly manifoldsI32Base?: number;
  readonly pointsF32Base?: number;
  readonly pointsI32Base?: number;
}
/** Reusable, wasm-backed contact buffer. Refilling allocates nothing on the JS
 * side; free it with destroyContactsBuffer when done. */
export interface ContactsBuffer extends ContactBuffer {}
/** Reusable, wasm-backed per-step events buffer. Fill with getEvents after each
 * b3World_Step, read with the get*EventAt helpers; free with destroyEventsBuffer. */
export interface EventsBuffer { readonly _brand?: 'EventsBuffer'; }
export interface ContactTouchEvent { shapeIdA: b3ShapeId; shapeIdB: b3ShapeId; contactId: b3ContactId; }
export interface ContactHitEvent {
  shapeIdA: b3ShapeId;
  shapeIdB: b3ShapeId;
  contactId: b3ContactId;
  point: Vec3Obj;
  normal: Vec3Obj;
  approachSpeed: number;
  userMaterialIdA: bigint;
  userMaterialIdB: bigint;
}
export interface BodyMoveEvent {
  bodyId: b3BodyId;
  position: Vec3Obj;
  rotation: { x: number; y: number; z: number; w: number };
  fellAsleep: boolean;
}
export interface SensorTouchEvent { sensorShapeId: b3ShapeId; visitorShapeId: b3ShapeId; }
export interface JointEvent { jointId: b3JointId; }
/** Packed plane buffer passed to the b3World_CollideMover callback. */
export interface PlaneResultBuffer { count: number; data: Float32Array; }
export interface PlaneResult { plane: { normal: Vec3Obj; offset: number }; point: Vec3Obj; }
export interface Contact {
  shapeIdA: b3ShapeId;
  shapeIdB: b3ShapeId;
  contactId: b3ContactId;
  manifoldCount: number;
}
export interface ManifoldPoint {
  anchorA: Vec3Obj;
  anchorB: Vec3Obj;
  separation: number;
  baseSeparation: number;
  normalImpulse: number;
  totalNormalImpulse: number;
  normalVelocity: number;
  featureId: number;
  triangleIndex: number;
  persisted: boolean;
}
export interface Manifold {
  normal: Vec3Obj;
  twistImpulse: number;
  frictionImpulse: Vec3Obj;
  rollingImpulse: Vec3Obj;
  pointCount: number;
  points: ManifoldPoint[];
}
export interface Box3DFacade {
  createTransform(): { position: b3Vec3; quaternion: b3Quat };
  getNumShapeIds(buf: ShapeIdBuffer): number;
  createShapeId(): b3ShapeId;
  getShapeIdAt(out: b3ShapeId, buf: ShapeIdBuffer, i: number): b3ShapeId;
  getNumContacts(buf: ContactBuffer): number;
  createContact(): Contact;
  getContactAt(out: Contact, buf: ContactBuffer, i: number): Contact;
  createPoint(): ManifoldPoint;
  createManifold(): Manifold;
  getManifoldAt(out: Manifold, contact: Contact, m: number): Manifold;
  createContactsBuffer(): ContactsBuffer;
  getShapeContactData(buf: ContactsBuffer, shapeId: b3ShapeId): ContactsBuffer;
  getBodyContactData(buf: ContactsBuffer, bodyId: b3BodyId): ContactsBuffer;
  destroyContactsBuffer(buf: ContactsBuffer): void;
  createEventsBuffer(): EventsBuffer;
  getEvents(eb: EventsBuffer, worldId: b3WorldId): EventsBuffer;
  destroyEventsBuffer(eb: EventsBuffer): void;
  getNumContactBeginEvents(eb: EventsBuffer): number;
  getNumContactEndEvents(eb: EventsBuffer): number;
  getNumContactHitEvents(eb: EventsBuffer): number;
  getNumBodyMoveEvents(eb: EventsBuffer): number;
  getNumSensorBeginEvents(eb: EventsBuffer): number;
  getNumSensorEndEvents(eb: EventsBuffer): number;
  getNumJointEvents(eb: EventsBuffer): number;
  createContactTouchEvent(): ContactTouchEvent;
  getContactBeginEventAt(out: ContactTouchEvent, eb: EventsBuffer, i: number): ContactTouchEvent;
  getContactEndEventAt(out: ContactTouchEvent, eb: EventsBuffer, i: number): ContactTouchEvent;
  createContactHitEvent(): ContactHitEvent;
  getContactHitEventAt(out: ContactHitEvent, eb: EventsBuffer, i: number): ContactHitEvent;
  createBodyMoveEvent(): BodyMoveEvent;
  getBodyMoveEventAt(out: BodyMoveEvent, eb: EventsBuffer, i: number): BodyMoveEvent;
  createSensorTouchEvent(): SensorTouchEvent;
  getSensorBeginEventAt(out: SensorTouchEvent, eb: EventsBuffer, i: number): SensorTouchEvent;
  getSensorEndEventAt(out: SensorTouchEvent, eb: EventsBuffer, i: number): SensorTouchEvent;
  createJointEvent(): JointEvent;
  getJointEventAt(out: JointEvent, eb: EventsBuffer, i: number): JointEvent;
  getNumPlaneResults(buf: PlaneResultBuffer): number;
  createPlaneResult(): PlaneResult;
  getPlaneResultAt(out: PlaneResult, buf: PlaneResultBuffer, i: number): PlaneResult;
}`;

// Functions bound as lambdas returning emscripten::val show up as `any` in
// --emit-tsd (tsgen can't see a val's runtime shape), so we rewrite each one to
// its real signature here. Matched by name + `any` return, which is robust to how
// tsgen names params across emsdk versions (`_0` in 4.x, `worldId` in 6.x).
const valReturnSignatures = {
	// packed query buffer, read via the src/facade.js helpers (--post-js). Contact
	// and event data no longer have array-returning accessors — they are read
	// through the reusable ContactsBuffer / EventsBuffer instead (see facadeTypes).
	b3Shape_GetSensorData: '(shapeId: b3ShapeId): ShapeIdBuffer',
};

const tsdPath = join( root, 'dist', 'box3d.d.ts' );
let tsd = readFileSync( tsdPath, 'utf8' )
	.replaceAll( 'MainModuleFactory', 'Box3DFactory' )
	.replaceAll( 'MainModule', 'Box3DModule' )
	.replace(
		'export type Box3DModule = WasmModule & EmbindModule;',
		`${facadeTypes}\nexport type Box3DModule = WasmModule & EmbindModule & Box3DFacade;`,
	);
if ( !tsd.includes( '& Box3DFacade' ) ) throw new Error( 'tsd: Box3DModule alias not found — did --emit-tsd output change?' );
for ( const [ fn, sig ] of Object.entries( valReturnSignatures ) )
{
	const re = new RegExp( `${fn}\\([^)]*\\): any;` );
	if ( !re.test( tsd ) ) throw new Error( `tsd: no \`any\`-returning ${fn} to retype — binding renamed/removed or return type changed?` );
	tsd = tsd.replace( re, `${fn}${sig};` );
}

// out-param math reads (see docs/BINDING_CONVENTIONS.md §2): rewrite the raw
// `XInto(out: number, ...): void;` embind method to the public out-param reader
// `X(out: T, ...): T;`. Default out type is b3Vec3; OUT_TYPE overrides per method.
const OUT_TYPE = {
	b3Body_GetRotation: 'b3Quat',
	b3World_GetBounds: 'b3AABB', b3Body_ComputeAABB: 'b3AABB', b3Shape_GetAABB: 'b3AABB',
	b3Body_GetTransform: '{ position: b3Vec3, quaternion: b3Quat }',
	b3Joint_GetLocalFrameA: '{ position: b3Vec3, quaternion: b3Quat }',
	b3Joint_GetLocalFrameB: '{ position: b3Vec3, quaternion: b3Quat }',
};
if ( !/\w+Into\(out: number/.test( tsd ) ) throw new Error( 'tsd: no *Into out-param methods found — binding changed?' );
tsd = tsd.replace( /^(\s*)(b3\w+)Into\(out: number(, [^)]*)?\): void;/gm, ( _, indent, name, rest ) =>
{
	const t = OUT_TYPE[ name ] || 'b3Vec3';
	return `${indent}${name}(out: ${t}${rest || ''}): ${t};`;
} );

writeFileSync( tsdPath, tsd );

// Inlined single-file build (wasm base64-embedded).
run( 'em++', [ 'src/bindings.cpp', stLib, ...commonFlags, '-sSINGLE_FILE=1', '-o', 'dist/box3d.inline.mjs' ] );

// --- multithreaded (pthreads) ---
run( 'em++', [ 'src/bindings.cpp', mtLib, ...commonFlags, ...mtFlags, '-o', 'dist/box3d.mt.mjs' ] );
// Single-file MT build: base64-embedding the wasm sidesteps the SharedArrayBuffer
// + separate-wasm-fetch friction (as JoltPhysics.js does).
run( 'em++', [ 'src/bindings.cpp', mtLib, ...commonFlags, ...mtFlags, '-sSINGLE_FILE=1', '-o', 'dist/box3d.mt.inline.mjs' ] );

console.log( '\nBuild artifacts:' );
for ( const f of [
	'box3d.mjs', 'box3d.wasm', 'box3d.inline.mjs', 'box3d.d.ts',
	'box3d.mt.mjs', 'box3d.mt.wasm', 'box3d.mt.inline.mjs',
] )
{
	try
	{
		const kb = ( statSync( join( root, 'dist', f ) ).size / 1024 ).toFixed( 1 );
		console.log( `  dist/${f.padEnd( 20 )} ${kb} KiB` );
	}
	catch
	{
		console.log( `  dist/${f.padEnd( 20 )} (missing)` );
	}
}
