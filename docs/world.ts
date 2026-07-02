import Box3D from 'box3d.js';
import type { Box3DModule } from 'box3d.js';

const b3: Box3DModule = await Box3D();

/* SNIPPET_START: create-world */
const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };

const world = b3.b3CreateWorld(worldDef);
/* SNIPPET_END: create-world */

/* SNIPPET_START: step */
// Advance the simulation by one fixed time step.
// subStepCount controls accuracy vs. performance (4 is a good default).
b3.b3World_Step(world, 1 / 60, 4);
/* SNIPPET_END: step */

/* SNIPPET_START: game-loop */
// Typical browser game loop
function animate() {
    b3.b3World_Step(world, 1 / 60, 4);
    // ... update mesh transforms from body positions ...
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
/* SNIPPET_END: game-loop */

/* SNIPPET_START: destroy */
// Always destroy the world when you are done to free WASM memory.
b3.b3DestroyWorld(world);
/* SNIPPET_END: destroy */
