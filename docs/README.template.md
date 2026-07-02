# box3d.js

WebAssembly bindings for [box3d](https://github.com/erincatto/box3d) - Erin Catto's 3D rigid body physics engine - compiled with Emscripten and exposed as an ES module with full TypeScript definitions.

The API mirrors the box3d C API 1:1 (`b3CreateWorld`, `b3World_Step`, …) so the upstream docs and samples translate relatively directly.

```bash
npm install box3d.js
```

**Builds**

| Import | Use case |
|--------|----------|
| `box3d.js/inline` | Browser - single-file, no separate `.wasm` to serve |
| `box3d.js` | Node.js or bundlers that can serve `.wasm` |
| `box3d.js/mt-inline` | Browser + multithreading (requires cross-origin isolation) |
| `box3d.js/mt` | Node.js + multithreading |

**Examples**

<Examples />

## Table of Contents

<TOC />

## Quick Start

Initialize the WASM module once with `await Box3D()`, then call the physics API through the returned module object.

<Snippet source="./quick-start.ts" />

## How Does This Compare to Jolt / Rapier / Others?

box3d is Erin Catto's 3D rigid body engine — the 3D sibling of Box2D, from the author of Box2D itself.

For comparisons across engines (box3d.js, Jolt, Rapier, and others), see the **[JS physics benchmarks](https://isaac-mason.github.io/js-physics-benchmarks/)**.

## Physics World

### Creating a World

<Snippet source="./world.ts" select="create-world" />

`b3DefaultWorldDef()` returns a world definition with sensible defaults. Common fields to override:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `gravity` | `b3Vec3` | `{x:0,y:0,z:0}` | World gravity vector |
| `workerCount` | `number` | `0` | Thread count for the MT build (see [Multithreading](#multithreading)) |
| `maximumLinearSpeed` | `number` | `500` | Speed cap - raise this for CCD bullet bodies |

### Stepping the Simulation

<Snippet source="./world.ts" select="step" />

Call `b3World_Step` in your game loop. `subStepCount` controls solver accuracy - 4 is a good default.

<Snippet source="./world.ts" select="game-loop" />

### Destroying a World

<Snippet source="./world.ts" select="destroy" />

### Memory Management

box3d.js wraps a WASM module, so some objects are allocated on the WASM heap and must be freed explicitly.

**Hull data is copied** into the world's internal database on shape creation, so `b3HullData` handles can be destroyed immediately after - or reused across multiple shapes before being destroyed.

**Mesh, compound, and heightfield data are not copied** - the world stores a raw pointer. `b3MeshData`, `b3CompoundData`, and `b3HeightFieldData` must be kept alive for as long as the shape (or world) exists, and destroyed only after.

<Snippet source="./memory.ts" select="geometry-lifetime" />

**Destroying a world** frees all bodies, shapes, and joints inside it automatically - no need to clean them up individually first.

<Snippet source="./memory.ts" select="world-cleanup" />

**Removing objects during simulation** - use the individual destroy functions. Destroying a body also removes all its shapes and any joints attached to it.

<Snippet source="./memory.ts" select="runtime-removal" />

### Units and Scale

box3d uses SI units and a right-handed coordinate system (+Y up by default):

- **Length**: metres (m)
- **Mass**: kilograms (kg) - note: default shape density is **1000 kg/m³**
- **Time**: seconds (s)
- **Triangle winding**: counter-clockwise (CCW) is the front face

## Rigid Bodies

### Body Types

<Snippet source="./bodies.ts" select="body-types" />

| Type | Moves | Affected by forces | Collides with |
|------|-------|-------------------|---------------|
| `b3_staticBody` | Never | No | Dynamic only |
| `b3_dynamicBody` | Simulated | Yes | All types |
| `b3_kinematicBody` | Scripted | No | Dynamic only |

<ExamplesTable ids="example-shapes,example-cube-heap" />

### Position and Rotation

Quaternions use the box3d convention: `{ v: {x,y,z}, s: number }` where `v` is the vector part and `s` is the scalar (w component).

<Snippet source="./bodies.ts" select="transform" />

### Velocity

<Snippet source="./bodies.ts" select="velocity" />

### Forces and Impulses

Forces accumulate until the next `b3World_Step` call, then clear. Impulses apply an instant velocity change.

**Important:** box3d's default shape density is 1000 kg/m³, making bodies much heavier than in most engines. Scale your impulse magnitudes by the body's mass to get predictable results.

<Snippet source="./bodies.ts" select="forces" />

<ExamplesTable ids="example-add-impulse-at-position,example-explosion" />

### Damping

<Snippet source="./bodies.ts" select="damping" />

<ExamplesTable ids="example-linear-damping,example-angular-damping" />

### Gravity Scale

<Snippet source="./bodies.ts" select="gravity-scale" />

<ExamplesTable ids="example-gravity-factor" />

### Sleeping

Bodies at rest are put to sleep automatically to save CPU. You can also control sleep manually.

<Snippet source="./bodies.ts" select="sleeping" />

### Continuous Collision Detection

Enable CCD for fast-moving objects (bullets, projectiles) to prevent tunneling through thin walls.

<Snippet source="./bodies.ts" select="ccd" />

<ExamplesTable ids="example-ccd" />

### Changing Body Type

<Snippet source="./bodies.ts" select="change-type" />

### Kinematic Bodies

Use `b3Body_SetTargetTransform` to move kinematic bodies each frame. box3d computes the velocities needed to reach the target, so dynamic bodies are pushed physically rather than teleported through.

<Snippet source="./bodies.ts" select="kinematic-move" />

### Material Properties

Friction and restitution can be set per shape at creation, or updated at runtime via `b3Shape_SetSurfaceMaterial`.

<Snippet source="./bodies.ts" select="material" />

<ExamplesTable ids="example-friction,example-restitution" />

### Collision Filtering

box3d filters collisions with `bigint` category and mask bits. A contact fires when `(categoryA & maskB) != 0n AND (categoryB & maskA) != 0n`.

<Snippet source="./bodies.ts" select="collision-filter" />

<ExamplesTable ids="example-collision-filtering" />

### Sensors

Sensor shapes detect overlaps without generating contact forces. Both the sensor and each visitor shape must opt in to sensor events.

<Snippet source="./bodies.ts" select="sensor" />

<ExamplesTable ids="example-sensor" />

## Shapes

box3d shapes attach to a body and define its collision geometry. A body can have multiple shapes.

### Box

<Snippet source="./shapes.ts" select="box" />

### Sphere

<Snippet source="./shapes.ts" select="sphere" />

### Capsule

<Snippet source="./shapes.ts" select="capsule" />

### Convex Hull

<Snippet source="./shapes.ts" select="hull" />

### Cylinder and Cone

<Snippet source="./shapes.ts" select="cylinder-cone" />

### Triangle Mesh

Triangle meshes are best suited for static terrain and level geometry. box3d performs internal preprocessing (active edges, BVH) on mesh creation.

<Snippet source="./shapes.ts" select="mesh" />

<ExamplesTable ids="example-triangle-mesh" />

### Compound Shapes (Static Only)

Compound shapes combine multiple child shapes on a single body. **In box3d, compound shapes are static-only** - `b3_dynamicBody` and `b3_kinematicBody` will reject compound shapes.

<Snippet source="./shapes.ts" select="compound" />

<ExamplesTable ids="example-static-compound" />

## Joints

Joints constrain the relative motion between two bodies. All joint defs share a `bodyIdA` / `bodyIdB` pair. Joint frames (`frameA`, `frameB`) are local-space transforms that define where and how the joint attaches.

**Axis conventions:**
- Revolute: rotates about the joint frame's local **Z**-axis
- Prismatic: slides along the joint frame's local **X**-axis
- Spherical: cone centered on frame **Z**

<ExamplesTable ids="example-constraints,example-hinge-motor" />

### Revolute (Hinge)

<Snippet source="./joints.ts" select="revolute" />

### Revolute Motor

<Snippet source="./joints.ts" select="revolute-motor" />

### Weld (Fixed)

<Snippet source="./joints.ts" select="weld" />

### Distance

<Snippet source="./joints.ts" select="distance" />

### Spherical (Ball and Socket)

<Snippet source="./joints.ts" select="spherical" />

### Prismatic (Slider)

<Snippet source="./joints.ts" select="prismatic" />

### Wheel (Suspension)

<Snippet source="./joints.ts" select="wheel" />

## Queries

Queries ask questions about the physics world without advancing the simulation.

### Cast Ray (Closest)

<Snippet source="./queries.ts" select="cast-ray" />

<ExamplesTable ids="example-cast-ray" />

### Cast Ray (All Hits)

<Snippet source="./queries.ts" select="cast-ray-all" />

### Cast Shape (Shapecast)

Sweep a sphere proxy through the world and find the closest hit.

<Snippet source="./queries.ts" select="cast-shape" />

<ExamplesTable ids="example-cast-shape" />

### Overlap AABB

<Snippet source="./queries.ts" select="overlap-aabb" />

### Overlap Shape

<Snippet source="./queries.ts" select="overlap-shape" />

### Query Filter

<Snippet source="./queries.ts" select="query-filter" />

## Events

box3d surfaces physics events (contacts, sensors, body moves, joints) each `b3World_Step`. Events are opt-in per shape. Rather than allocating a JS object per event every step — which does not scale — box3d.js reads them through a **reusable, wasm-backed events buffer**: allocate the buffer (and small reader scratch objects) once, refill it each step with `getEvents`, and read it back with zero allocation. Free it with `destroyEventsBuffer` when done.

### Contact Events

<Snippet source="./events.ts" select="contact-events" />

<ExamplesTable ids="example-events" />

### Reading Contacts Every Frame

Events fire when contacts begin, end, or hit. To instead inspect **every current contact manifold** each frame — for debug drawing, gameplay logic, or custom response — use a reusable, wasm-backed contacts buffer. This is the recommended fast path: its storage lives in the wasm heap and grows on its own, so refilling it each frame copies nothing across the wasm/JS boundary and allocates no typed arrays. You allocate the buffer (and small reader scratch objects) once, fill it in place each frame, and free it when done.

<Snippet source="./events.ts" select="contacts-buffer" />

<ExamplesTable ids="example-contacts" />

### Sensor Events

<Snippet source="./events.ts" select="sensor-events" />

<ExamplesTable ids="example-sensor" />

### Pre-Solve Callback

The pre-solve callback fires for each contact before the constraint solver runs. Return `false` to suppress the contact response entirely (useful for one-way platforms).

<Snippet source="./events.ts" select="pre-solve" />

## Multithreading

box3d's internal solver can spread work across OS threads via Emscripten pthreads. This requires `SharedArrayBuffer`, which in turn requires [cross-origin isolation](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated).

**Required HTTP headers:**
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Initialization

<Snippet source="./multithreading.ts" select="mt-init" />

### World Setup

<Snippet source="./multithreading.ts" select="mt-world" />

### Stepping

<Snippet source="./multithreading.ts" select="mt-step" />

The simulation API is identical to the single-threaded build - only the import path and `workerCount` differ.

<ExamplesTable ids="example-multithreading" />

## Building from Source

### Prerequisites

- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) - `emcmake` and `em++` must be on `PATH`. The published builds are produced with **emsdk 6.0.2** (emcc/clang 6.0.2); other recent versions should work.
- [CMake](https://cmake.org/) ≥ 3.22
- Node.js ≥ 18
- pnpm

```bash
# Install the pinned Emscripten version and activate the environment
cd /path/to/emsdk
./emsdk install 6.0.2
./emsdk activate 6.0.2
source ./emsdk_env.sh
```

### Build

```bash
git clone --recurse-submodules <repo-url>
pnpm install
pnpm build
```

Outputs to `dist/`:

| File | Description |
|------|-------------|
| `box3d.mjs` + `box3d.wasm` | Single-threaded, separate WASM |
| `box3d.inline.mjs` | Single-threaded, inlined WASM |
| `box3d.mt.mjs` + `box3d.mt.wasm` | Multithreaded, separate WASM |
| `box3d.mt.inline.mjs` | Multithreaded, inlined WASM |
| `box3d.d.ts` | TypeScript definitions (shared by all builds) |

```bash
# Debug build
pnpm build:debug

# Smoke test (falling-box simulation on both ST and MT builds)
pnpm test
```

### Docs

```bash
# Regenerate README.md from docs/README.template.md
pnpm docs:build

# Typecheck all code snippets in docs/
pnpm docs:check
```
