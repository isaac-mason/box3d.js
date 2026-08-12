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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve( dirname( fileURLToPath( import.meta.url ) ), '..' );
const debug = process.argv.includes( '--debug' );

// box3d clamps workerCount to [1, B3_MAX_WORKERS] (=32). The Emscripten pthread
// pool must be >= the max threads the scheduler can spawn or it deadlocks
// (the well-documented JoltPhysics.js gotcha), so size the pool to 32.
const PTHREAD_POOL_SIZE = 32;
const MAXIMUM_MEMORY = 2147483648; // 2 GiB — required with growth + shared memory

// Pin the Emscripten toolchain. The ESM post-processing in validateESModule()
// pattern-matches emscripten's generated output, so an unexpected emcc version
// can silently change that output and break the rewrites. Assert it up front.
// Bump this (and re-verify the build) intentionally when upgrading emsdk.
const REQUIRED_EMSDK = '6.0.2';

function run( cmd, args )
{
	console.log( `\n$ ${cmd} ${args.join( ' ' )}\n` );
	execFileSync( cmd, args, { stdio: 'inherit', cwd: root } );
}

// Fail fast unless the emcc/em++ on PATH matches REQUIRED_EMSDK, so the build
// output the ESM rewrites depend on can't drift out from under us unnoticed.
function assertEmscriptenVersion()
{
	let out;
	try
	{
		out = execFileSync( 'em++', [ '--version' ], { cwd: root, encoding: 'utf8' } );
	}
	catch ( err )
	{
		throw new Error( 'em++ not found on PATH — source the emsdk env first (emsdk_env). ' + err.message );
	}
	// e.g. "emcc (Emscripten ...) 6.0.2 (7a2d97d...)"
	const m = out.match( /\b(\d+\.\d+\.\d+)\b/ );
	if ( !m ) throw new Error( `could not parse emcc version from:\n${out}` );
	if ( m[ 1 ] !== REQUIRED_EMSDK )
	{
		throw new Error(
			`emsdk ${m[ 1 ]} detected but this build is pinned to ${REQUIRED_EMSDK}. ` +
			`Install it via \`emsdk install ${REQUIRED_EMSDK} && emsdk activate ${REQUIRED_EMSDK}\`, ` +
			`or update REQUIRED_EMSDK in scripts/build.mjs after re-verifying the build.`,
		);
	}
	console.log( `emsdk ${m[ 1 ]} OK` );
}

// Post-process an emitted module into clean, valid ESM:
//
// 1. Emscripten's Node support code (-sENVIRONMENT=...,node) loads node
//    builtins with require() via a createRequire shim. That's valid ESM at
//    runtime, but bundlers flag the require() calls when the file is consumed
//    as an ES module. The calls all sit at the top level of the async
//    MODULARIZE factory, so rewrite them to await import (node builtins expose
//    everything as named exports, so namespace access keeps working) and drop
//    the dead shim.
//
// 2. SINGLE_FILE builds (*.inline.mjs) embed the wasm, so emscripten's file
//    readers (readAsync / readBinary, the node:fs / node:path / node:url
//    imports) are dead code. Strip them so the inline builds carry no node builtin
//    references and bundle with no config.
//
// -sSOURCE_PHASE_IMPORTS would obsolete most of this post-processing: the wasm
// loads via a static `import source` instead of fetch/fs, leaving only the MT
// worker_threads import to rewrite. Adopt it once browsers, bundlers, and
// emscripten's optimizer all support the syntax.
function validateESModule( file )
{
	const path = join( root, file );
	let src = readFileSync( path, 'utf8' );

	// require() -> await import
	src = src.replaceAll( /\brequire\(\s*["']([^"']+)["']\s*\)/g, '(await import("$1"))' );
	// node: scheme on every builtin import (emscripten emits some itself, bare)
	// so bundlers unambiguously treat them as Node builtins.
	src = src.replaceAll( /\bimport\(\s*["'](?:node:)?(fs|path|url|util|module|crypto|worker_threads)["']\s*\)/g, 'import("node:$1")' );
	src = src.replace( /const\s*{\s*createRequire\s*}\s*=\s*await import\(\s*["'](?:node:)?module["']\s*\);?\s*(?:\/\*\*[^]*?\*\/\s*)?var require\s*=\s*createRequire\(\s*import\.meta\.url\s*\);?/, '' );
	if ( /\brequire\s*\(\s*["']/.test( src ) || src.includes( 'createRequire(import.meta.url)' ) )
	{
		throw new Error( `${file}: require() still present after rewrite — did emscripten's output change?` );
	}

	// dead file readers (SINGLE_FILE builds only)
	if ( file.includes( '.inline.' ) )
	{
		// arrow function with at most one nested brace level, which covers all
		// of emscripten's reader closures
		const arrow = /(?:async\s*)?(?:\([^()]*\)|[\w$]+)\s*=>\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/.source;
		src = src.replaceAll( new RegExp( `\\b(?:readAsync|readBinary)=${arrow};?`, 'g' ), '' );
		src = src.replace( 'var readAsync,readBinary;', '' );
		src = src.replace( /var fs=\(await import\("node:fs"\)\);?/, '' );
		// Node-only scriptDirectory computation, the sole user of node:path/node:url
		src = src.replace( /if\(_scriptName\.startsWith\("file:"\)\)\{scriptDirectory=[^{}]*\}/, '' );
		for ( const leftover of [ 'readAsync', 'readBinary', 'readFileSync', 'node:fs', 'node:path', 'node:url' ] )
		{
			if ( src.includes( leftover ) )
			{
				throw new Error( `${file}: ${leftover} still present after strip — did emscripten's output change?` );
			}
		}
	}

	writeFileSync( path, src );
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

assertEmscriptenVersion();

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
	// NB: the facade post-js (build/facade.generated.js) is NOT here — it is codegen'd
	// from the probe below and appended per shipped build. The probe itself links
	// without it (it only needs the raw _layoutMeta()/_outMeta() getters).
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

// --- probe build ---
// Separate-wasm build WITHOUT the facade post-js, used only to (a) emit the shared
// TypeScript defs and (b) be loaded here to read the binding-site metadata. It is
// overwritten below by the real, facade-carrying dist/box3d.mjs.
run( 'em++', [ 'src/bindings.cpp', stLib, ...commonFlags, '--emit-tsd', 'box3d.d.ts', '-o', 'dist/box3d.mjs' ] );
validateESModule( 'dist/box3d.mjs' );

// Read the binding-site metadata straight off the probe: _layoutMeta() (packed-buffer
// tier strides), _outMeta() (out-param value types + reader shapes) and _retMeta()
// (val-returning function return types). These are the single source of truth — for the
// TS types below AND for the generated facade further down — so nothing is hardcoded.
const { default: Box3DProbe } = await import( pathToFileURL( join( root, 'dist', 'box3d.mjs' ) ).href );
const probe = await Box3DProbe();
// These getters return plain JS values (embind val), so no JSON.parse — the probe
// hands back native objects/arrays directly.
const layoutMeta = probe._layoutMeta();
const outMeta = probe._outMeta();
const retMeta = probe._retMeta();

// emscripten hardcodes MainModule / MainModuleFactory in --emit-tsd output.
// Rename them to friendlier box3d names.
// Also fix the Get*Events return types: the lambdas return val::object() which
// --emit-tsd can only see as `any`, but the runtime shape is well-defined.
// Types for the packed query buffers and the src/facade.js reader helpers,
// intersected into Box3DModule below so `b3.getContactAt(...)` etc. are typed.
const facadeTypes = `export interface ShapeIdBuffer { count: number; data: Int32Array; }
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
  point: b3Vec3;
  normal: b3Vec3;
  approachSpeed: number;
  userMaterialIdA: bigint;
  userMaterialIdB: bigint;
}
export interface BodyMoveEvent {
  bodyId: b3BodyId;
  position: b3Vec3;
  rotation: b3Quat;
  fellAsleep: boolean;
}
export interface SensorTouchEvent { sensorShapeId: b3ShapeId; visitorShapeId: b3ShapeId; }
export interface JointEvent { jointId: b3JointId; }
/** Packed plane buffer passed to the b3World_CollideMover callback. */
export interface PlaneResultBuffer { count: number; data: Float32Array; }
export interface PlaneResult { plane: { normal: b3Vec3; offset: number }; point: b3Vec3; }
export interface Contact {
  shapeIdA: b3ShapeId;
  shapeIdB: b3ShapeId;
  contactId: b3ContactId;
  manifoldCount: number;
}
export interface ManifoldPoint {
  anchorA: b3Vec3;
  anchorB: b3Vec3;
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
  normal: b3Vec3;
  twistImpulse: number;
  frictionImpulse: b3Vec3;
  rollingImpulse: b3Vec3;
  pointCount: number;
  points: ManifoldPoint[];
}
export interface Box3DFacade {
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
  /** Reusable ray-cast result; allocate once with createRayResult, fill per cast. */
  createRayResult(): b3RayResult;
  /** Zero-alloc closest-ray cast: fills the caller-owned result in place and returns it. */
  b3World_CastRayClosest(out: b3RayResult, worldId: b3WorldId, origin: b3Vec3, translation: b3Vec3, filter: b3QueryFilter): b3RayResult;
}`;

const tsdPath = join( root, 'dist', 'box3d.d.ts' );
let tsd = readFileSync( tsdPath, 'utf8' )
	.replaceAll( 'MainModuleFactory', 'Box3DFactory' )
	.replaceAll( 'MainModule', 'Box3DModule' )
	.replace(
		'export type Box3DModule = WasmModule & EmbindModule;',
		`${facadeTypes}\nexport type Box3DModule = WasmModule & EmbindModule & Box3DFacade;`,
	);
if ( !tsd.includes( '& Box3DFacade' ) ) throw new Error( 'tsd: Box3DModule alias not found — did --emit-tsd output change?' );

// val-returning functions emit as `... : any;`; retype the return from _retMeta
// (declared at the binding site via the ret_function ": T" DSL). Keeps the params
// emit-tsd inferred, only replacing the `any` return.
for ( const { method, tsType } of retMeta )
{
	const re = new RegExp( `^(\\s*)${method}\\(([^)]*)\\): any;`, 'm' );
	if ( !re.test( tsd ) ) throw new Error( `tsd: no \`${method}(...): any;\` line to retype — binding renamed/removed or return type changed?` );
	tsd = tsd.replace( re, `$1${method}($2): ${tsType};` );
}

// out-param math reads: replace each raw `MethodInto(...): void;` embind line with its
// public reader `Method(out: T, id: b3BodyId, ...): T;`, rebuilt entirely from the
// binding-site metadata (outMeta above). The raw `*Into` takes loose scalars (the facade
// unpacks ids/vecs before the wasm crossing), so its params are an implementation detail
// — the public signature comes from `names` (public param names, out slots then passes),
// `outTs` (out value types) and `passTs` (input types). The out types live once in
// bindings.cpp's out_function DSL; nothing is duplicated here. A multi-out getter (e.g. a
// transform read as position + rotation) returns a tuple of its out types.
if ( !outMeta.length ) throw new Error( 'tsd: _outMeta() returned no entries — did the out_function DSL change?' );
for ( const { method, names, outTs, passTs } of outMeta )
{
	const re = new RegExp( `^(\\s*)${method}Into\\([^)]*\\): void;`, 'm' );
	if ( !re.test( tsd ) ) throw new Error( `tsd: no \`${method}Into(...): void;\` line to retype — binding renamed/removed?` );
	const paramTypes = [ ...outTs, ...passTs ]; // positional: out slots then passes
	const params = names.map( ( name, i ) => `${name}: ${paramTypes[ i ]}` ).join( ', ' );
	const ret = outTs.length === 1 ? outTs[ 0 ] : `[ ${outTs.join( ', ' )} ]`;
	tsd = tsd.replace( re, `$1${method}(${params}): ${ret};` );
}

// Internal plumbing — strip from the public types. b3_getMathScratch: scratch
// pointer (facade captures it); _outMeta/_retMeta/_layoutMeta: the binding-site
// metadata getters read above (out-param types, val-return types, buffer strides).
// The three meta getters return embind val, which --emit-tsd renders as `: any;`.
tsd = tsd.replace( /^\s*b3_getMathScratch\(\): number;\r?\n/m, '' );
tsd = tsd.replace( /^\s*_outMeta\(\): any;\r?\n/m, '' );
tsd = tsd.replace( /^\s*_retMeta\(\): any;\r?\n/m, '' );
tsd = tsd.replace( /^\s*_layoutMeta\(\): any;\r?\n/m, '' );
// Ray cast plumbing — the facade captures these and exposes the public reader from
// Box3DFacade above (b3World_CastRayClosest / createRayResult); strip the raw scalar-in
// writer + the two storage-pointer getters so they don't leak into the public surface.
for ( const re of [
	/^\s*b3World_CastRayClosestInto\([^)]*\): void;\r?\n/m,
	/^\s*b3_getRayResultI32Ptr\(\): number;\r?\n/m,
	/^\s*b3_getRayResultF64Ptr\(\): number;\r?\n/m,
] )
{
	if ( !re.test( tsd ) ) throw new Error( `tsd: expected to strip ${re} but it was not found — ray cast binding renamed/removed?` );
	tsd = tsd.replace( re, '' );
}

writeFileSync( tsdPath, tsd );

// Codegen the facade post-js. src/facade.js is a template: substitute the metadata
// literals read off the probe above for its __B3_LAYOUT__ / __B3_OUT_META__ tokens, so
// the shipped runtime uses baked-in constants instead of calling _layoutMeta()/_outMeta()
// (which return JSON strings that TextDecoder rejects over growable wasm memory in the
// browser). bindings.cpp stays the source of truth — these values come from it, via the
// probe, on every build. Emitted to build/ (not dist/) so it is not published.
const facadeSrc = readFileSync( join( root, 'src', 'facade.js' ), 'utf8' );
if ( !facadeSrc.includes( '__B3_LAYOUT__' ) || !facadeSrc.includes( '__B3_OUT_META__' ) )
	throw new Error( 'facade codegen: __B3_LAYOUT__/__B3_OUT_META__ token missing from src/facade.js' );
const facadeGen = facadeSrc
	.replaceAll( '__B3_LAYOUT__', JSON.stringify( layoutMeta ) )
	.replaceAll( '__B3_OUT_META__', JSON.stringify( outMeta ) );
const facadePost = 'build/facade.generated.js';
writeFileSync( join( root, facadePost ), facadeGen );
const post = [ '--post-js', facadePost ];

// --- single-threaded ---
// Real separate-wasm build (with the facade), overwriting the probe above.
run( 'em++', [ 'src/bindings.cpp', stLib, ...commonFlags, ...post, '-o', 'dist/box3d.mjs' ] );
validateESModule( 'dist/box3d.mjs' );
// Inlined single-file build (wasm base64-embedded).
run( 'em++', [ 'src/bindings.cpp', stLib, ...commonFlags, ...post, '-sSINGLE_FILE=1', '-o', 'dist/box3d.inline.mjs' ] );
validateESModule( 'dist/box3d.inline.mjs' );

// --- multithreaded (pthreads) ---
run( 'em++', [ 'src/bindings.cpp', mtLib, ...commonFlags, ...mtFlags, ...post, '-o', 'dist/box3d.mt.mjs' ] );
validateESModule( 'dist/box3d.mt.mjs' );
// Single-file MT build: base64-embedding the wasm sidesteps the SharedArrayBuffer
// + separate-wasm-fetch friction (as JoltPhysics.js does).
run( 'em++', [ 'src/bindings.cpp', mtLib, ...commonFlags, ...mtFlags, ...post, '-sSINGLE_FILE=1', '-o', 'dist/box3d.mt.inline.mjs' ] );
validateESModule( 'dist/box3d.mt.inline.mjs' );

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
