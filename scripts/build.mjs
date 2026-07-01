// Build box3d.js: compile box3d (static lib) with the Emscripten toolchain,
// then link our embind bindings into two ES-module outputs:
//   dist/box3d.mjs + dist/box3d.wasm   (separate wasm)
//   dist/box3d.single.mjs              (inlined SINGLE_FILE)
//   dist/box3d.d.ts                    (emitted TypeScript defs, shared)
//
// Requires the Emscripten SDK on PATH (emcmake / em++). Source emsdk_env first.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve( dirname( fileURLToPath( import.meta.url ) ), '..' );
const debug = process.argv.includes( '--debug' );

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

mkdirSync( join( root, 'dist' ), { recursive: true } );

// 1. Configure box3d for wasm (samples/tests/etc. off).
run( 'emcmake', [ 'cmake',
	'-S', 'vendor/box3d',
	'-B', 'build/box3d',
	'-DCMAKE_BUILD_TYPE=' + ( debug ? 'Debug' : 'Release' ),
	'-DBOX3D_SAMPLES=OFF',
	'-DBOX3D_UNIT_TESTS=OFF',
	'-DBOX3D_BENCHMARKS=OFF',
	'-DBOX3D_DOCS=OFF',
	'-DBOX3D_VALIDATE=OFF',
] );

// 2. Build the box3d static library.
run( 'cmake', [ '--build', 'build/box3d', '--target', 'box3d', '-j', '8' ] );

const lib = findFile( join( root, 'build', 'box3d' ), 'libbox3d.a' );
if ( !lib )
{
	throw new Error( 'libbox3d.a not found under build/box3d' );
}
console.log( 'box3d static lib:', lib );

// 3. Link the embind bindings. Shared flags for both outputs.
const common = [
	'src/bindings.cpp', lib,
	'-I', 'vendor/box3d/include',
	'-std=c++17',
	'-lembind',
	'-msimd128',
	'-sMODULARIZE=1',
	'-sEXPORT_ES6=1',
	'-sEXPORT_NAME=Box3D',
	'-sALLOW_MEMORY_GROWTH=1',
	'-sWASM_BIGINT=1',
	'-sENVIRONMENT=web,worker,node',
	'-sFILESYSTEM=0',
	...( debug ? [ '-O0', '-g', '-sASSERTIONS=2' ] : [ '-O3' ] ),
];

// Separate-wasm build (also emits the shared TypeScript defs).
run( 'em++', [ ...common, '--emit-tsd', 'box3d.d.ts', '-o', 'dist/box3d.mjs' ] );

// emscripten hardcodes MainModule / MainModuleFactory in --emit-tsd output.
// Rename them to friendlier box3d names.
const tsdPath = join( root, 'dist', 'box3d.d.ts' );
const tsd = readFileSync( tsdPath, 'utf8' )
	.replaceAll( 'MainModuleFactory', 'Box3DFactory' )
	.replaceAll( 'MainModule', 'Box3DModule' );
writeFileSync( tsdPath, tsd );

// Inlined single-file build (wasm base64-embedded).
run( 'em++', [ ...common, '-sSINGLE_FILE=1', '-o', 'dist/box3d.single.mjs' ] );

console.log( '\nBuild artifacts:' );
for ( const f of [ 'box3d.mjs', 'box3d.wasm', 'box3d.single.mjs', 'box3d.d.ts' ] )
{
	try
	{
		const kb = ( statSync( join( root, 'dist', f ) ).size / 1024 ).toFixed( 1 );
		console.log( `  dist/${f.padEnd( 18 )} ${kb} KiB` );
	}
	catch
	{
		console.log( `  dist/${f.padEnd( 18 )} (missing)` );
	}
}
