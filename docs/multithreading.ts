import type { Box3DModule } from 'box3d.js';

/* SNIPPET_START: mt-init */
// The multithreaded build uses SharedArrayBuffer under the hood.
// The page must be served with cross-origin isolation headers:
//   Cross-Origin-Opener-Policy: same-origin
//   Cross-Origin-Embedder-Policy: require-corp
const isolated = self.crossOriginIsolated === true;

// Pick the right build at runtime; fall back gracefully when isolation is absent
const factory = isolated
    ? (await import('box3d.js/mt-inline')).default
    : (await import('box3d.js/inline')).default;

const b3: Box3DModule = await factory();
/* SNIPPET_END: mt-init */

/* SNIPPET_START: mt-world */
const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };

// Set workerCount to enable box3d's internal multi-threaded solver.
// box3d clamps this to [1, 32] (B3_MAX_WORKERS). Leave at 0 for single-threaded.
const hwThreads = navigator.hardwareConcurrency ?? 4;
worldDef.workerCount = isolated ? Math.max(2, hwThreads - 1) : 0;

const world = b3.b3CreateWorld(worldDef);
/* SNIPPET_END: mt-world */

/* SNIPPET_START: mt-step */
// The simulation API is identical to the single-threaded build;
// only the import and workerCount differ.
b3.b3World_Step(world, 1 / 60, 4);
/* SNIPPET_END: mt-step */

b3.b3DestroyWorld(world);
