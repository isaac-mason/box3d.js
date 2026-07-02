import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3ShapeId } from 'box3d.js';

const b3: Box3DModule = await Box3D();
const world = b3.b3CreateWorld(b3.b3DefaultWorldDef());
const filter = b3.b3DefaultQueryFilter();

/* SNIPPET_START: cast-ray */
// Cast a ray and return the closest hit.
// origin + translation defines the ray: it runs from origin to origin+translation.
const origin = { x: 0, y: 10, z: 0 };
const translation = { x: 0, y: -20, z: 0 }; // cast 20m downward

const rayResult = b3.b3World_CastRayClosest(world, origin, translation, filter);

if (rayResult.hit) {
    const fraction = rayResult.fraction;    // [0..1] how far along translation
    const normal = rayResult.normal;        // surface normal at hit point
    const hitX = origin.x + translation.x * fraction;
    const hitY = origin.y + translation.y * fraction;
    const hitZ = origin.z + translation.z * fraction;
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

const castOrigin  = { x: 0, y: 5, z: 0 };
const castDispacement = { x: 0, y: -10, z: 0 };
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
const aabb = {
    lowerBound: { x: -2, y: -2, z: -2 },
    upperBound: { x:  2, y:  2, z:  2 },
};

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
const overlapOrigin = { x: 0, y: 0, z: 0 };
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
