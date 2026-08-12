import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3ShapeId, b3AABB, b3Vec3 } from 'box3d.js';

const b3: Box3DModule = await Box3D();
const world = b3.b3CreateWorld(b3.b3DefaultWorldDef());
const filter = b3.b3DefaultQueryFilter();

/* SNIPPET_START: cast-ray */
// Cast a ray for the closest hit. origin/translation are b3Vec3 arrays; origin +
// translation defines the ray (it runs from origin to origin+translation). The result
// is filled into a caller-owned object — allocate it once with createRayResult and
// reuse it across casts so hot-loop raycasts allocate nothing.
const origin: b3Vec3 = [0, 10, 0];
const translation: b3Vec3 = [0, -20, 0]; // cast 20m downward

const rayResult = b3.createRayResult(); // reuse across casts
b3.b3World_CastRayClosest(rayResult, world, origin, translation, filter);

if (rayResult.hit) {
    const fraction = rayResult.fraction;    // [0..1] how far along translation
    const normal = rayResult.normal;        // surface normal at hit point (b3Vec3)
    const hitX = origin[0] + translation[0] * fraction;
    const hitY = origin[1] + translation[1] * fraction;
    const hitZ = origin[2] + translation[2] * fraction;
    console.log(`hit at (${hitX.toFixed(2)}, ${hitY.toFixed(2)}, ${hitZ.toFixed(2)})`);
    console.log('normal:', normal);
}
/* SNIPPET_END: cast-ray */

/* SNIPPET_START: cast-ray-all */
// Collect every hit along a ray via callback (called once per shape, unordered).
// Return false from the callback to stop traversal early.
const hits: b3ShapeId[] = [];
b3.b3World_CastRay(world, origin, translation, filter, (shapeId: b3ShapeId, _fraction: number, _normal: unknown) => {
    hits.push(shapeId);
    return true;
});
console.log(`ray hit ${hits.length} shapes`);
/* SNIPPET_END: cast-ray-all */

/* SNIPPET_START: cast-shape */
// Sweep a convex proxy through the world and find the closest hit (shapecast).
// The proxy is a flat [x,y,z, ...] array of points; convexRadius rounds the edges.
// The callback returns the current best fraction -- return a smaller value to narrow
// the search, or Infinity to collect all hits.
const halfE = 0.3;
const boxProxy = [
    -halfE, -halfE, -halfE,  halfE, -halfE, -halfE,
     halfE, -halfE,  halfE, -halfE, -halfE,  halfE,
    -halfE,  halfE, -halfE,  halfE,  halfE, -halfE,
     halfE,  halfE,  halfE, -halfE,  halfE,  halfE,
];

const castOrigin: b3Vec3 = [0, 5, 0];
const castDispacement: b3Vec3 = [0, -10, 0];
let bestFraction = Infinity;

b3.b3World_CastShape(
    world,
    castOrigin,
    boxProxy, 0,          // points array + convex radius
    castDispacement,
    filter,
    (_shapeId: b3ShapeId, _point: unknown, _normal: unknown, fraction: number) => {
        if (fraction < bestFraction) bestFraction = fraction;
        return fraction;  // return current best to narrow search
    },
);

if (bestFraction < Infinity) {
    console.log(`shape hit at fraction ${bestFraction.toFixed(3)}`);
}
/* SNIPPET_END: cast-shape */

/* SNIPPET_START: overlap-aabb */
// Find all shapes whose AABBs overlap a given axis-aligned box.
// b3AABB is a flat array: [minX, minY, minZ, maxX, maxY, maxZ].
const aabb: b3AABB = [-2, -2, -2, 2, 2, 2];

const overlapping: b3ShapeId[] = [];
b3.b3World_OverlapAABB(world, aabb, filter, (shapeId: b3ShapeId) => {
    overlapping.push(shapeId);
    return true; // return false to stop early
});
console.log(`${overlapping.length} shapes in AABB`);
/* SNIPPET_END: overlap-aabb */

/* SNIPPET_START: overlap-shape */
// Test which shapes overlap a convex proxy (exact narrowphase, not just AABB).
// Same proxy format as b3World_CastShape: flat points array + convex radius.
const overlapOrigin: b3Vec3 = [0, 0, 0];
const overlapHits: b3ShapeId[] = [];

b3.b3World_OverlapShape(
    world,
    overlapOrigin,
    boxProxy, 0,  // reuse proxy from above
    filter,
    (shapeId: b3ShapeId) => {
        overlapHits.push(shapeId);
        return true;
    },
);
console.log(`${overlapHits.length} shapes overlapping proxy`);
/* SNIPPET_END: overlap-shape */

/* SNIPPET_START: query-filter */
// b3QueryFilter controls what a query can hit using category/mask bits (bigint).
// A shape is tested when (filterMaskBits & shapeCategoryBits) != 0n.
const customFilter = b3.b3DefaultQueryFilter();
customFilter.maskBits = 1n; // only hit shapes in category 0x0001
/* SNIPPET_END: query-filter */

b3.b3DestroyWorld(world);
