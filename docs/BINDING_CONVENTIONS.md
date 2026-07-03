# box3d.js binding conventions

How box3d's flat C API is projected into JS/TS. The guiding principle, lifted from
[JoltPhysics.js](https://github.com/jrouwe/JoltPhysics.js): **math is mathcat-shaped
plain arrays, and value reads are out-param-first with zero allocation.**

## 1. Math value types → `value_array` (mathcat plain arrays)

Math types marshal to/from JS **arrays**, matching [mathcat](https://github.com/isaac-mason/mathcat)
— for **both input and output**. No `{x,y,z}` objects, no handles, no `.delete()`.

| box3d C type | JS shape (mathcat) | layout |
|---|---|---|
| `b3Vec3` | `Vec3 = [x, y, z]` | `value_array` (3) |
| `b3Quat` | `Quat = [x, y, z, w]` | `value_array` (4) — elems 0-2 → `.v`, elem 3 → `.s` |
| `b3AABB` | `Box3 = [minX, minY, minZ, maxX, maxY, maxZ]` | `value_array` (6) |
| `b3Transform` | `{ position: Vec3, quaternion: Quat }` | `value_object` of two arrays |
| `b3Plane` | `{ normal: Vec3, offset: number }` | `value_object` |

```cpp
value_array<b3Vec3>( "b3Vec3" )
    .element( &b3Vec3::x ).element( &b3Vec3::y ).element( &b3Vec3::z );

// b3Quat is {v:b3Vec3, s} in C; flatten to [x,y,z,w] via accessor lambdas
value_array<b3Quat>( "b3Quat" )
    .element( +[]( const b3Quat& q ){ return q.v.x; }, +[]( b3Quat& q, float x ){ q.v.x = x; } )
    .element( +[]( const b3Quat& q ){ return q.v.y; }, +[]( b3Quat& q, float y ){ q.v.y = y; } )
    .element( +[]( const b3Quat& q ){ return q.v.z; }, +[]( b3Quat& q, float z ){ q.v.z = z; } )
    .element( +[]( const b3Quat& q ){ return q.s;   }, +[]( b3Quat& q, float s ){ q.s   = s; } );
```

`--emit-tsd` emits these as tuple types (`b3Vec3 = [number, number, number]`), structurally
compatible with mathcat's `Vec3`/`Quat`/`Box3` — zero coupling to the mathcat package.

## 2. Value reads are out-param-first — THE api, not an addition

**Any function that would return a math value type takes an `out` first and fills it in
place.** There is exactly one public signature per read; the allocating returning form
does **not** exist.

```ts
b3Body_GetPosition(out: Vec3, bodyId: b3BodyId): Vec3   // the only form
b3Body_GetRotation(out: Quat, bodyId: b3BodyId): Quat
b3Body_GetTransform(out: { position: Vec3, quaternion: Quat }, bodyId): typeof out
b3Shape_GetAABB(out: Box3, shapeId: b3ShapeId): Box3
```

Callers own `out` and reuse it across frames — the read allocates nothing:

```ts
const p = [0, 0, 0];                 // once
function frame() { b3.b3Body_GetPosition(p, body); /* p mutated in place */ }
```

### Mechanism (three layers, all already present in this repo)

1. **C++ raw writer** — `bindings.cpp` binds `b3Body_GetPositionInto(out: uintptr_t, …)`
   that writes N floats to `out`. A static `float[16]` scratch is exposed as
   `b3_getMathScratch()`.
2. **facade.js installer** — `outRead(proto, "b3Body_GetPosition", "b3Body_GetPositionInto", 3)`
   installs the public `b3Body_GetPosition(out, …)`: it calls the raw writer against the
   scratch, then copies scratch → the caller's `out` (re-reading `HEAPF32` each call so it's
   memory-growth safe), and returns `out`. The `Into` twin is private plumbing, never a
   second public function.
3. **tsd post-process (build.mjs)** — rewrites `…Into(out: number, …): void` →
   `X(out: Vec3, …): Vec3`, using an `OUT_TYPE` map for the `Quat`/`Transform`/`Box3`
   readers. Length-safe: a `Vec3` passed to a `Quat` reader is a compile error.

Bulk per-frame reads (all bodies/shapes at once) use the same idea N× via a packed HEAP
buffer — see the contact/event buffers in `facade.js`.

## 3. ID handles stay small structs (the one place we diverge from Jolt)

Jolt's `BodyID` is a `uint32` → plain JS `number`. box3d's `b3BodyId` is
`{index1: int32, world0: uint16, generation: uint16}` = 64 bits, which cannot pack into a
single JS number (>53 safe bits). So IDs remain `value_object`s. They're opaque handles,
not math — mathcat doesn't cover them.

## 4. Bulk / packed reads → facade buffers

Contact data, sensor overlaps, and per-step events cross the wasm boundary **once** as a
packed typed-array buffer; the `facade.js` `getXAt(out, buf, i)` readers scan them with no
allocation and no further crossings. Allocate the buffer once with `createXBuffer()`, refill
each frame, free with `destroyXBuffer()`.

## 5. `.d.ts` generation

`--emit-tsd` → string post-process in `build.mjs`:
- `MainModule` → `Box3DModule`, `MainModuleFactory` → `Box3DFactory` (emscripten hardcodes
  these; only a rename can change them).
- `…Into(out: number)` → out-param reader types (§2).
- `val`-returning packed queries → their `ContactBuffer`/`ShapeIdBuffer` facade types.
- Patches are **regex on the signature**, robust to emsdk tsgen renaming params across
  versions (4.x `_0` vs 6.x `worldId`).
