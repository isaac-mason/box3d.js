import Box3D from 'box3d.js/inline';
import type { Box3DModule } from 'box3d.js';

const b3: Box3DModule = await Box3D();

const worldDef = b3.b3DefaultWorldDef();
const world = b3.b3CreateWorld(worldDef);

const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
const indices = new Uint32Array([0, 1, 2, 0, 2, 3]);

/* SNIPPET_START: geometry-lifetime */
// Hull data IS copied into the world's internal database on shape creation,
// so the handle can be destroyed immediately after — or reused to stamp out
// multiple shapes and destroyed when no longer needed.
const hull = b3.b3CreateHull(positions)!;
const bodyA = b3.b3CreateBody(world, b3.b3DefaultBodyDef());
b3.b3CreateHullShape(bodyA, b3.b3DefaultShapeDef(), hull);
b3.b3DestroyHull(hull); // safe — world keeps its own copy

// Mesh, compound, and heightfield data are NOT copied. The world stores a raw
// pointer to the data, so it must be kept alive for as long as the shape (or
// world) exists. Destroy it only after the shape or world has been destroyed.
const mesh = b3.b3CreateMesh(positions, indices)!;
const bodyB = b3.b3CreateBody(world, b3.b3DefaultBodyDef());
b3.b3CreateMeshShape(bodyB, b3.b3DefaultShapeDef(), mesh, { x: 1, y: 1, z: 1 });
// b3.b3DestroyMesh(mesh) — NOT safe here; the shape still holds a pointer to it
b3.b3DestroyWorld(world);
b3.b3DestroyMesh(mesh); // safe now — world (and its shapes) are gone
/* SNIPPET_END: geometry-lifetime */

const world2 = b3.b3CreateWorld(b3.b3DefaultWorldDef());

/* SNIPPET_START: world-cleanup */
// b3DestroyWorld frees all bodies, shapes, and joints inside it automatically.
// Call it once at teardown — no need to destroy individual objects first.
b3.b3DestroyWorld(world2);
/* SNIPPET_END: world-cleanup */

const world3 = b3.b3CreateWorld(b3.b3DefaultWorldDef());

/* SNIPPET_START: runtime-removal */
// Destroying a body also removes all its shapes and any joints attached to it.
const dynDef = b3.b3DefaultBodyDef();
dynDef.type = b3.b3BodyType.b3_dynamicBody;
const dynBody = b3.b3CreateBody(world3, dynDef);
b3.b3CreateBoxShape(dynBody, b3.b3DefaultShapeDef(), 0.5, 0.5, 0.5);
b3.b3DestroyBody(dynBody); // body, its shapes, and attached joints all removed

// To remove one shape from a multi-shape body without destroying the body,
// use b3DestroyShape. The boolean controls whether body mass is recalculated.
const multiBody = b3.b3CreateBody(world3, b3.b3DefaultBodyDef());
const shapeA = b3.b3CreateBoxShape(multiBody, b3.b3DefaultShapeDef(), 0.5, 0.5, 0.5);
b3.b3CreateSphereShape(multiBody, b3.b3DefaultShapeDef(), { center: { x: 0, y: 1, z: 0 }, radius: 0.3 });
b3.b3DestroyShape(shapeA, true); // removes shapeA and recalculates body mass

// Joints can also be destroyed independently. The boolean controls whether
// the connected bodies are woken up.
const bodyC = b3.b3CreateBody(world3, b3.b3DefaultBodyDef());
const bodyD = b3.b3CreateBody(world3, b3.b3DefaultBodyDef());
const jd = b3.b3DefaultDistanceJointDef();
jd.base.bodyIdA = bodyC;
jd.base.bodyIdB = bodyD;
const joint = b3.b3CreateDistanceJoint(world3, jd);
b3.b3DestroyJoint(joint, true); // removes joint; true = wake the connected bodies
/* SNIPPET_END: runtime-removal */

b3.b3DestroyWorld(world3);
