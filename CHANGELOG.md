# Changelog

## Unreleased

- Out-param readers (`b3Body_GetPosition`, `b3Body_GetWorldPointVelocity`, `b3World_GetGravity`, …) are now truly zero-allocation. Their id/vector arguments cross the wasm boundary as loose scalars instead of embind value objects, removing the ~100–200 B/call marshaling temporaries that remained after v0.1.0. Multi-out readers (`b3Body_GetTransform`, `b3Joint_GetLocalFrameA/B`) return a reused tuple of the caller's out args rather than a fresh array, so they're zero-alloc too. No API or type change. A `test:alloc` regression test guards this.
- **Breaking:** `b3World_CastRayClosest` is now an out-param-first zero-allocation reader: `b3World_CastRayClosest(out, worldId, origin, translation, filter)`, where `out` is a reusable result from the new `createRayResult()`. It fills `out` in place and returns it instead of allocating a fresh `b3RayResult` per cast (`userMaterialId` is a lazy getter, so casts that don't read it allocate nothing). Migrate `const r = b3World_CastRayClosest(world, o, t, filter)` to `const r = createRayResult()` once, then `b3World_CastRayClosest(r, world, o, t, filter)`.

## v0.1.1

- Documentation updates to reflect the new API surface and usage patterns, included in the npm package README.md

## v0.1.0

Rework of embind API surface so that box3d.js interops with gl-matrix-style libraries and reads values without allocating JavaScript objects.

- **Breaking:** math types are now plain arrays, matching gl-matrix/mathcat — `b3Vec3` is `[x, y, z]`, `b3Quat` is `[x, y, z, w]`, `b3AABB` is `[minX, minY, minZ, maxX, maxY, maxZ]`. Pass and receive them straight from your existing math library, no wrapper objects or conversion.
- **Breaking:** value reads are out-param-first and zero-allocation. Getters fill a caller-supplied array and return it, e.g. `b3Body_GetPosition(out, bodyId)`; the allocating form that returned a fresh object is gone. Reuse a scratch array per frame to keep the hot path free of GC pressure.
- Removed the pure math-op bindings (`b3Cross`, `b3MakeQuatFromAxisAngle`, `b3AABB_Union`, …). Do vector/quaternion math in JS with gl-matrix/mathcat rather than crossing the wasm boundary for each operation.
- The emitted modules are now validated and post-processed into clean ESM: Emscripten's `require()` calls are rewritten to `await import`, Node builtins are given the `node:` scheme, and the single-file (`*.inline.mjs`) builds have their dead Node file-reader code stripped. The outputs now bundle with no bundler config.

## v0.0.2

- Added `repository`, `homepage`, `bugs`, and `author` fields to `package.json`

## v0.0.1

- Initial release
