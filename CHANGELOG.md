# Changelog

## v0.0.3 (Unreleased)

- **Breaking:** math types are now mathcat-style plain arrays — `b3Vec3` is `[x, y, z]`, `b3Quat` is `[x, y, z, w]`, `b3AABB` is `[minX, minY, minZ, maxX, maxY, maxZ]`, `b3Transform` is `{ position, quaternion }` — for both input and output.
- **Breaking:** value reads are out-param-first and zero-allocation, e.g. `b3Body_GetPosition(out, bodyId)` fills and returns `out`; the allocating returning form is gone.
- Removed the pure math-op bindings (`b3Cross`, `b3MakeQuatFromAxisAngle`, `b3AABB_Union`, …) — do these in JS (gl-matrix/mathcat) rather than crossing the wasm boundary.

## v0.0.2

- Added `repository`, `homepage`, `bugs`, and `author` fields to `package.json`

## v0.0.1

- Initial release
