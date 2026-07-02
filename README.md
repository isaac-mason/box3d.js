# box3d.js

WebAssembly bindings for [box3d](https://github.com/erincatto/box3d) - Erin Catto's 3D rigid body physics engine - compiled with Emscripten and exposed as an ES module with full TypeScript definitions.

The API mirrors the box3d C API 1:1 (`b3CreateWorld`, `b3World_Step`, …) so the upstream docs and samples translate directly.

**Features**

- 🎯 rigid body simulation (static, dynamic, kinematic)
- 📦 sphere, capsule, box, convex hull, cylinder, cone, triangle mesh, compound, heightfield shapes
- 🔗 9 joint types: revolute, prismatic, spherical, weld, distance, wheel, motor, parallel, filter
- ⚡ continuous collision detection (bullet mode)
- 🎭 bigint category/mask collision filtering
- 🔔 contact and sensor events
- 🌍 radial explosion impulse (`b3World_Explode`)
- 🧵 multithreaded solver via Emscripten pthreads (`box3d.js/mt-inline`)
- 🔌 framework-agnostic - works with three.js, babylon.js, or any renderer

**Builds**

| Import | Use case |
|--------|----------|
| `box3d.js/inline` | Browser - single-file, no separate `.wasm` to serve |
| `box3d.js` | Node.js or bundlers that can serve `.wasm` |
| `box3d.js/mt-inline` | Browser + multithreading (requires cross-origin isolation) |
| `box3d.js/mt` | Node.js + multithreading |

**Examples**

<table>
  <tr>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-shapes">
        <img src="./examples/public/screenshots/example-shapes.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Shapes
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-cube-heap">
        <img src="./examples/public/screenshots/example-cube-heap.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Cube Heap
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-stacking">
        <img src="./examples/public/screenshots/example-stacking.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Stacking
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-robustness">
        <img src="./examples/public/screenshots/example-robustness.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Robustness
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-restitution">
        <img src="./examples/public/screenshots/example-restitution.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Restitution
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-friction">
        <img src="./examples/public/screenshots/example-friction.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Friction
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-conveyor-belt">
        <img src="./examples/public/screenshots/example-conveyor-belt.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Conveyor Belt
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-ccd">
        <img src="./examples/public/screenshots/example-ccd.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Continuous Collision Detection
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-gravity-factor">
        <img src="./examples/public/screenshots/example-gravity-factor.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Gravity Factor
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-linear-damping">
        <img src="./examples/public/screenshots/example-linear-damping.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Linear Damping
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-angular-damping">
        <img src="./examples/public/screenshots/example-angular-damping.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Angular Damping
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-add-impulse-at-position">
        <img src="./examples/public/screenshots/example-add-impulse-at-position.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Add Impulse at Position
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-collision-filtering">
        <img src="./examples/public/screenshots/example-collision-filtering.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Collision Filtering
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-joints">
        <img src="./examples/public/screenshots/example-joints.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Joints
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-ragdoll">
        <img src="./examples/public/screenshots/example-ragdoll.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Ragdoll
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-static-compound">
        <img src="./examples/public/screenshots/example-static-compound.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Static Compound
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-triangle-mesh">
        <img src="./examples/public/screenshots/example-triangle-mesh.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Triangle Mesh
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-cast-ray">
        <img src="./examples/public/screenshots/example-cast-ray.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Cast Ray
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-cast-shape">
        <img src="./examples/public/screenshots/example-cast-shape.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Cast Shape
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-hinge-motor">
        <img src="./examples/public/screenshots/example-hinge-motor.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Hinge Motor
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-gjk">
        <img src="./examples/public/screenshots/example-gjk.png" width="180" height="120" style="object-fit:cover;"/><br/>
        GJK Distance
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-tree">
        <img src="./examples/public/screenshots/example-tree.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Dynamic Tree
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-explosion">
        <img src="./examples/public/screenshots/example-explosion.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Explosion
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-geometry">
        <img src="./examples/public/screenshots/example-geometry.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Geometry
      </a>
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-sensor">
        <img src="./examples/public/screenshots/example-sensor.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Sensor
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-events">
        <img src="./examples/public/screenshots/example-events.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Events
      </a>
    </td>
    <td align="center">
      <a href="https://box3d.js.dev/examples#example-multithreading">
        <img src="./examples/public/screenshots/example-multithreading.png" width="180" height="120" style="object-fit:cover;"/><br/>
        Multithreading
      </a>
    </td>
  </tr>
</table>


## Table of Contents

- [Quick Start](#quick-start)
- [Physics World](#physics-world)
- [Rigid Bodies](#rigid-bodies)
- [Shapes](#shapes)
- [Joints](#joints)
- [Queries](#queries)
- [Events](#events)
- [Multithreading](#multithreading)
- [Building from Source](#building-from-source)

## Quick Start

Initialize the WASM module once with `await Box3D()`, then call the physics API through the returned module object.

For **browsers**, import `box3d.js/inline` (single file, no separate `.wasm` to host). For **Node.js**, import `box3d.js`.

```ts
import Box3D from 'box3d.js';
import type { Box3DModule } from 'box3d.js';

// Initialize the WASM module. In the browser, prefer box3d.js/inline (no separate .wasm to serve).
const b3: Box3DModule = await Box3D();

// Create a world with downward gravity
const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld(worldDef);

// Static ground: a wide flat box
const groundDef = b3.b3DefaultBodyDef();
groundDef.position = { x: 0, y: 0, z: 0 };
const ground = b3.b3CreateBody(world, groundDef);
b3.b3CreateBoxShape(ground, b3.b3DefaultShapeDef(), 25, 0.5, 25);

// Dynamic sphere dropped from above
const bodyDef = b3.b3DefaultBodyDef();
bodyDef.type = b3.b3BodyType.b3_dynamicBody;
bodyDef.position = { x: 0, y: 10, z: 0 };
const body = b3.b3CreateBody(world, bodyDef);
b3.b3CreateSphereShape(body, b3.b3DefaultShapeDef(), { center: { x: 0, y: 0, z: 0 }, radius: 0.5 });

// Step the simulation at 60 Hz for ~2.5 seconds
for (let i = 0; i < 150; i++) {
    b3.b3World_Step(world, 1 / 60, 4);
}

const pos = b3.b3Body_GetPosition(body);
console.log(`sphere landed at y = ${pos.y.toFixed(2)}`);

b3.b3DestroyWorld(world);
```

## Physics World

### Creating a World

```ts
const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };

const world = b3.b3CreateWorld(worldDef);
```

`b3DefaultWorldDef()` returns a world definition with sensible defaults. Common fields to override:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `gravity` | `b3Vec3` | `{x:0,y:0,z:0}` | World gravity vector |
| `workerCount` | `number` | `0` | Thread count for the MT build (see [Multithreading](#multithreading)) |
| `maximumLinearSpeed` | `number` | `500` | Speed cap - raise this for CCD bullet bodies |

### Stepping the Simulation

```ts
// Advance the simulation by one fixed time step.
// subStepCount controls accuracy vs. performance (4 is a good default).
b3.b3World_Step(world, 1 / 60, 4);
```

Call `b3World_Step` in your game loop. `subStepCount` controls solver accuracy - 4 is a good default.

```ts
// Typical browser game loop
function animate() {
    b3.b3World_Step(world, 1 / 60, 4);
    // ... update mesh transforms from body positions ...
    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

### Destroying a World

```ts
// Always destroy the world when you are done to free WASM memory.
b3.b3DestroyWorld(world);
```

### Units and Scale

box3d uses SI units and a right-handed coordinate system (+Y up by default):

- **Length**: metres (m)
- **Mass**: kilograms (kg) - note: default shape density is **1000 kg/m³**, so bodies are heavier than you might expect
- **Time**: seconds (s)
- **Triangle winding**: counter-clockwise (CCW) is the front face

## Rigid Bodies

### Body Types

```ts
// Static: immovable; infinite mass; collides with dynamic bodies
const staticDef = b3.b3DefaultBodyDef();
staticDef.type = b3.b3BodyType.b3_staticBody;
staticDef.position = { x: 0, y: 0, z: 0 };
const staticBody = b3.b3CreateBody(world, staticDef);
b3.b3CreateBoxShape(staticBody, b3.b3DefaultShapeDef(), 10, 0.5, 10);

// Dynamic: fully simulated; affected by forces and gravity
const dynamicDef = b3.b3DefaultBodyDef();
dynamicDef.type = b3.b3BodyType.b3_dynamicBody;
dynamicDef.position = { x: 0, y: 5, z: 0 };
const dynamicBody = b3.b3CreateBody(world, dynamicDef);
b3.b3CreateSphereShape(dynamicBody, b3.b3DefaultShapeDef(), { center: { x: 0, y: 0, z: 0 }, radius: 0.5 });

// Kinematic: user-controlled velocity; pushes dynamic bodies but is not pushed back
const kinematicDef = b3.b3DefaultBodyDef();
kinematicDef.type = b3.b3BodyType.b3_kinematicBody;
kinematicDef.position = { x: 0, y: 2, z: 0 };
const kinematicBody = b3.b3CreateBody(world, kinematicDef);
b3.b3CreateBoxShape(kinematicBody, b3.b3DefaultShapeDef(), 2, 0.2, 2);
```

| Type | Moves | Affected by forces | Collides with |
|------|-------|-------------------|---------------|
| `b3_staticBody` | Never | No | Dynamic only |
| `b3_dynamicBody` | Simulated | Yes | All types |
| `b3_kinematicBody` | Scripted | No | Dynamic only |

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-shapes">
      <img src="./examples/public/screenshots/example-shapes.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Shapes</strong>
    </a>
  </td>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-cube-heap">
      <img src="./examples/public/screenshots/example-cube-heap.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Cube Heap</strong>
    </a>
  </td>
  </tr>
</table>

### Position and Rotation

Quaternions use the box3d convention: `{ v: {x,y,z}, s: number }` where `v` is the vector part and `s` is the scalar (w component).

```ts
// Read position and rotation
const pos = b3.b3Body_GetPosition(dynamicBody);
const rot = b3.b3Body_GetRotation(dynamicBody); // { v: {x,y,z}, s: number } (quaternion)

// Set position and rotation
const IDENTITY_QUAT = { v: { x: 0, y: 0, z: 0 }, s: 1 };
b3.b3Body_SetTransform(dynamicBody, { x: 1, y: 5, z: 0 }, IDENTITY_QUAT);

void pos; void rot;
```

### Velocity

```ts
// Read velocities
const linVel = b3.b3Body_GetLinearVelocity(dynamicBody);
const angVel = b3.b3Body_GetAngularVelocity(dynamicBody);

// Set velocities
b3.b3Body_SetLinearVelocity(dynamicBody, { x: 5, y: 0, z: 0 });
b3.b3Body_SetAngularVelocity(dynamicBody, { x: 0, y: 1, z: 0 }); // spin around Y

void linVel; void angVel;
```

### Forces and Impulses

Forces accumulate until the next `b3World_Step` call, then clear. Impulses apply an instant velocity change.

**Important:** box3d's default shape density is 1000 kg/m³, making bodies much heavier than in most engines. Scale your impulse magnitudes by the body's mass to get predictable results.

```ts
// Apply force at center of mass (accumulates until next step)
b3.b3Body_ApplyForceToCenter(dynamicBody, { x: 0, y: 100, z: 0 }, true);

// Apply force at a world-space point (generates torque)
b3.b3Body_ApplyForce(dynamicBody, { x: 0, y: 100, z: 0 }, { x: 1, y: 5, z: 0 }, true);

// Apply instant impulse at center of mass.
// box3d's default shape density is 1000 kg/m3 -- bodies are heavy.
// Scale impulse by mass so the magnitude is predictable regardless of size.
const mass = b3.b3Body_GetMass(dynamicBody);
b3.b3Body_ApplyLinearImpulseToCenter(dynamicBody, { x: 0, y: mass * 5, z: 0 }, true);

// Apply impulse at a world-space point (generates both linear and angular velocity change)
b3.b3Body_ApplyLinearImpulse(dynamicBody, { x: 0, y: mass * 5, z: 0 }, { x: 0.3, y: 5, z: 0 }, true);
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-add-impulse-at-position">
      <img src="./examples/public/screenshots/example-add-impulse-at-position.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Add Impulse at Position</strong>
    </a>
  </td>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-explosion">
      <img src="./examples/public/screenshots/example-explosion.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Explosion</strong>
    </a>
  </td>
  </tr>
</table>

### Damping

```ts
// Linear damping slows translational velocity each step (0 = none, higher = more drag)
b3.b3Body_SetLinearDamping(dynamicBody, 0.5);

// Angular damping slows rotational velocity each step
b3.b3Body_SetAngularDamping(dynamicBody, 0.5);
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-linear-damping">
      <img src="./examples/public/screenshots/example-linear-damping.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Linear Damping</strong>
    </a>
  </td>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-angular-damping">
      <img src="./examples/public/screenshots/example-angular-damping.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Angular Damping</strong>
    </a>
  </td>
  </tr>
</table>

### Gravity Scale

```ts
// Multiply world gravity for this body (0 = weightless, 2 = double gravity)
b3.b3Body_SetGravityScale(dynamicBody, 0.5);
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-gravity-factor">
      <img src="./examples/public/screenshots/example-gravity-factor.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Gravity Factor</strong>
    </a>
  </td>
  </tr>
</table>

### Sleeping

Bodies at rest are put to sleep automatically to save CPU. You can also control sleep manually.

```ts
// Check whether a body is awake
const awake = b3.b3Body_IsAwake(dynamicBody);

// Manually wake or sleep a body
b3.b3Body_SetAwake(dynamicBody, true);
b3.b3Body_SetAwake(dynamicBody, false);

// Disable sleep entirely for a body (keeps it active even at rest)
b3.b3Body_EnableSleep(dynamicBody, false);

void awake;
```

### Continuous Collision Detection

Enable CCD for fast-moving objects (bullets, projectiles) to prevent tunneling through thin walls.

```ts
// Enable CCD (bullet mode) for fast-moving objects to prevent tunneling.
// Also raise worldDef.maximumLinearSpeed if the body exceeds the default cap.
b3.b3Body_SetBullet(dynamicBody, true);
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-ccd">
      <img src="./examples/public/screenshots/example-ccd.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Continuous Collision Detection</strong>
    </a>
  </td>
  </tr>
</table>

### Changing Body Type

```ts
// Change body type at runtime
b3.b3Body_SetType(dynamicBody, b3.b3BodyType.b3_staticBody);
b3.b3Body_SetType(dynamicBody, b3.b3BodyType.b3_dynamicBody);
```

### Kinematic Bodies

Use `b3Body_SetTargetTransform` to move kinematic bodies each frame. box3d computes the velocities needed to reach the target, so dynamic bodies are pushed physically rather than teleported through.

```ts
// Move a kinematic body towards a target transform each frame.
// box3d computes the velocities needed to reach it in `dt` seconds,
// so dynamic bodies are pushed physically rather than teleported through.
const dt = 1 / 60;
b3.b3Body_SetTargetTransform(
    kinematicBody,
    { p: { x: 2, y: 2, z: 0 }, q: IDENTITY_QUAT2 },
    dt,
    true,
);
```

### Material Properties

Friction and restitution can be set per shape at creation, or updated at runtime via `b3Shape_SetSurfaceMaterial`.

```ts
// Set friction and restitution via the shape's baseMaterial at creation time
const shapeDef = b3.b3DefaultShapeDef();
shapeDef.baseMaterial.friction = 0.6;     // 0 = frictionless, 1 = rough
shapeDef.baseMaterial.restitution = 0.8;  // 0 = no bounce, 1 = perfectly elastic
const shape = b3.b3CreateBoxShape(dynamicBody, shapeDef, 0.5, 0.5, 0.5);

// Or update a shape's surface material after creation
const mat = b3.b3DefaultSurfaceMaterial();
mat.friction = 0.1;
mat.restitution = 0.9;
b3.b3Shape_SetSurfaceMaterial(shape, mat);
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-friction">
      <img src="./examples/public/screenshots/example-friction.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Friction</strong>
    </a>
  </td>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-restitution">
      <img src="./examples/public/screenshots/example-restitution.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Restitution</strong>
    </a>
  </td>
  </tr>
</table>

### Collision Filtering

box3d filters collisions with `bigint` category and mask bits. A contact fires when `(categoryA & maskB) != 0n AND (categoryB & maskA) != 0n`.

```ts
// b3Filter uses bigint category/mask bits.
// A contact is generated when (categoryA & maskB) != 0n AND (categoryB & maskA) != 0n.
const GROUND  = 1n;
const GROUP_A = 2n;
const GROUP_B = 4n;

const filterDef = b3.b3DefaultShapeDef();

// Belongs to GROUP_A, collides with GROUND and GROUP_A (not GROUP_B)
filterDef.filter = { categoryBits: GROUP_A, maskBits: GROUND | GROUP_A, groupIndex: 0 };
b3.b3CreateBoxShape(dynamicBody, filterDef, 0.5, 0.5, 0.5);

// Update filter at runtime (second arg: wake bodies immediately)
const aShape = b3.b3Body_GetShapes(dynamicBody).get(0)!;
b3.b3Shape_SetFilter(aShape, { categoryBits: GROUP_B, maskBits: GROUND | GROUP_B, groupIndex: 0 }, true);
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-collision-filtering">
      <img src="./examples/public/screenshots/example-collision-filtering.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Collision Filtering</strong>
    </a>
  </td>
  </tr>
</table>

### Sensors

Sensor shapes detect overlaps without generating contact forces. Both the sensor and each visitor shape must opt in to sensor events.

```ts
// A sensor detects overlaps without applying contact forces.
// Both the sensor shape and visitor shapes must opt in to sensor events.
const sensorBodyDef = b3.b3DefaultBodyDef();
sensorBodyDef.type = b3.b3BodyType.b3_kinematicBody;
const sensorBody = b3.b3CreateBody(world, sensorBodyDef);

const sensorShapeDef = b3.b3DefaultShapeDef();
sensorShapeDef.isSensor = true;
sensorShapeDef.enableSensorEvents = true;
b3.b3CreateBoxShape(sensorBody, sensorShapeDef, 2, 2, 2);

// Each visitor shape must also enable sensor events
const visitorDef = b3.b3DefaultBodyDef();
visitorDef.type = b3.b3BodyType.b3_dynamicBody;
visitorDef.position = { x: 0, y: 5, z: 0 };
const visitor = b3.b3CreateBody(world, visitorDef);
const visitorShapeDef = b3.b3DefaultShapeDef();
visitorShapeDef.enableSensorEvents = true;
b3.b3CreateBoxShape(visitor, visitorShapeDef, 0.5, 0.5, 0.5);

// Read begin/end events each frame after b3World_Step
b3.b3World_Step(world, 1 / 60, 4);
const sensorEvents = b3.b3World_GetSensorEvents(world);
for (const e of sensorEvents.beginEvents) {
    console.log('entered sensor:', e.visitorShapeId);
}
for (const e of sensorEvents.endEvents) {
    console.log('left sensor:', e.visitorShapeId);
}
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-sensor">
      <img src="./examples/public/screenshots/example-sensor.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Sensor</strong>
    </a>
  </td>
  </tr>
</table>

## Shapes

box3d shapes attach to a body and define its collision geometry. A body can have multiple shapes.

### Box

```ts
// Box: defined by half-extents (hx, hy, hz) from the body origin
b3.b3CreateBoxShape(body, sd, 0.5, 0.5, 0.5);  // 1x1x1 cube
b3.b3CreateBoxShape(body, sd, 2.0, 0.1, 2.0);  // flat platform
```

### Sphere

```ts
b3.b3CreateSphereShape(body, sd, { center: { x: 0, y: 0, z: 0 }, radius: 0.5 });
```

### Capsule

```ts
// Capsule: a cylinder with hemispherical caps, defined by two center points + radius
b3.b3CreateCapsuleShape(body, sd, {
    center1: { x: 0, y: -0.5, z: 0 },
    center2: { x: 0, y:  0.5, z: 0 },
    radius: 0.3,
});
```

### Convex Hull

```ts
// Convex hull: the tightest convex shape enclosing a set of points.
// Pass a flat [x,y,z, x,y,z, ...] array -- box3d computes the hull internally.
const positions = [
    -0.5, 0, -0.5,
     0.5, 0, -0.5,
     0.5, 0,  0.5,
    -0.5, 0,  0.5,
     0,   1,  0,   // apex
];
const hullData = b3.b3CreateHull(positions)!;
b3.b3CreateHullShape(body, sd, hullData);
hullData.delete(); // free the C++ handle when done
```

### Cylinder and Cone

```ts
// Cylinder and cone are built-in hull makers.
// b3CreateCylinder(halfHeight, radius, convexRadius, segments)
const cylData = b3.b3CreateCylinder(0.5, 0.4, 0.0, 16)!;
b3.b3CreateHullShape(body, sd, cylData);
cylData.delete();

// b3CreateCone(height, radius, convexRadius, segments)
const coneData = b3.b3CreateCone(1.0, 0.5, 0.0, 16)!;
b3.b3CreateHullShape(body, sd, coneData);
coneData.delete();
```

### Triangle Mesh

Triangle meshes are best suited for static terrain and level geometry. box3d performs internal preprocessing (active edges, BVH) on mesh creation.

```ts
// Triangle mesh: for complex static terrain and level geometry.
// Positions: flat Float32Array [x,y,z, ...]; indices: Uint32Array.
// Winding: counter-clockwise (CCW) is the front face.
const meshPositions = new Float32Array([
    -10, 0, -10,
     10, 0, -10,
     10, 0,  10,
    -10, 0,  10,
]);
const meshIndices = new Uint32Array([0, 1, 2, 0, 2, 3]);

const meshData = b3.b3CreateMesh(meshPositions, meshIndices)!;

const staticBodyDef = b3.b3DefaultBodyDef();
const staticBody = b3.b3CreateBody(world, staticBodyDef);
const scale = { x: 1, y: 1, z: 1 };
b3.b3CreateMeshShape(staticBody, b3.b3DefaultShapeDef(), meshData, scale);
meshData.delete();
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-triangle-mesh">
      <img src="./examples/public/screenshots/example-triangle-mesh.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Triangle Mesh</strong>
    </a>
  </td>
  </tr>
</table>

### Compound Shapes (Static Only)

Compound shapes combine multiple child shapes on a single body. **In box3d, compound shapes are static-only** - `b3_dynamicBody` and `b3_kinematicBody` will reject compound shapes.

```ts
// Compound shapes combine multiple child shapes on a single body.
// In box3d, compounds are static-only -- the body type must be b3_staticBody.
const compoundBodyDef = b3.b3DefaultBodyDef();
compoundBodyDef.type = b3.b3BodyType.b3_staticBody;
const compoundBody = b3.b3CreateBody(world, compoundBodyDef);

const IDENTITY_QUAT = { v: { x: 0, y: 0, z: 0 }, s: 1 };

// Build a compound description: arrays of spheres, capsules, and convex hulls
const spec = {
    spheres: [],
    capsules: [],
    hulls: [
        { position: { x: -2, y: 0, z: 0 }, rotation: IDENTITY_QUAT, hx: 0.5, hy: 2, hz: 0.5 }, // left wall
        { position: { x:  2, y: 0, z: 0 }, rotation: IDENTITY_QUAT, hx: 0.5, hy: 2, hz: 0.5 }, // right wall
        { position: { x:  0, y: -1, z: 0 }, rotation: IDENTITY_QUAT, hx: 2.5, hy: 0.5, hz: 0.5 }, // floor
    ],
};

const compoundData = b3.b3CreateCompound(spec)!;
b3.b3CreateCompoundShape(compoundBody, b3.b3DefaultShapeDef(), compoundData);
compoundData.delete();
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-static-compound">
      <img src="./examples/public/screenshots/example-static-compound.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Static Compound</strong>
    </a>
  </td>
  </tr>
</table>

## Joints

Joints constrain the relative motion between two bodies. All joint defs share a `bodyIdA` / `bodyIdB` pair. Joint frames (`frameA`, `frameB`) are local-space transforms that define where and how the joint attaches.

**Axis conventions:**
- Revolute: rotates about the joint frame's local **Z**-axis
- Prismatic: slides along the joint frame's local **X**-axis
- Spherical: cone centered on frame **Z**

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-hinge-motor">
      <img src="./examples/public/screenshots/example-hinge-motor.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Hinge Motor</strong>
    </a>
  </td>
  </tr>
</table>

### Revolute (Hinge)

```ts
// Revolute joint: rotates around the joint frame's local Z-axis.
// To hinge around world Y, rotate the frame +90 deg about X (local Z -> world Y).
// All joint bodies and frames live on `def.base`.
const revoluteDef = b3.b3DefaultRevoluteJointDef();
revoluteDef.base.bodyIdA = anchor;
revoluteDef.base.bodyIdB = pendulum;
revoluteDef.base.localFrameA = { p: { x: 0, y: -1, z: 0 }, q: IDENTITY_QUAT };
revoluteDef.base.localFrameB = { p: { x: 0, y:  1, z: 0 }, q: IDENTITY_QUAT };
b3.b3CreateRevoluteJoint(world, revoluteDef);
```

### Revolute Motor

```ts
// Motorized revolute joint: the motor drives the hinge at a target angular speed
const motorDef = b3.b3DefaultRevoluteJointDef();
motorDef.base.bodyIdA = anchor;
motorDef.base.bodyIdB = pendulum;
motorDef.base.localFrameA = { p: { x: 0, y: -1, z: 0 }, q: IDENTITY_QUAT };
motorDef.base.localFrameB = { p: { x: 0, y:  1, z: 0 }, q: IDENTITY_QUAT };
motorDef.enableMotor = true;
motorDef.motorSpeed = 2.0;          // rad/s
motorDef.maxMotorTorque = 10000;    // must be large enough to overcome inertia
const motorJoint = b3.b3CreateRevoluteJoint(world, motorDef);

// Adjust speed at runtime
b3.b3RevoluteJoint_SetMotorSpeed(motorJoint, 4.0);
```

### Weld (Fixed)

```ts
// Weld joint: locks two bodies together rigidly (no relative motion)
const weldDef = b3.b3DefaultWeldJointDef();
weldDef.base.bodyIdA = anchor;
weldDef.base.bodyIdB = pendulum;
weldDef.base.localFrameA = { p: { x: 0, y: -1, z: 0 }, q: IDENTITY_QUAT };
weldDef.base.localFrameB = { p: { x: 0, y:  1, z: 0 }, q: IDENTITY_QUAT };
b3.b3CreateWeldJoint(world, weldDef);
```

### Distance

```ts
// Distance joint: maintains a target distance between two local anchor points
const distanceDef = b3.b3DefaultDistanceJointDef();
distanceDef.base.bodyIdA = anchor;
distanceDef.base.bodyIdB = pendulum;
distanceDef.base.localFrameA = { p: { x: 0, y: -1, z: 0 }, q: IDENTITY_QUAT };
distanceDef.base.localFrameB = { p: { x: 0, y:  1, z: 0 }, q: IDENTITY_QUAT };
distanceDef.length = 2.0; // desired distance in metres
b3.b3CreateDistanceJoint(world, distanceDef);
```

### Spherical (Ball and Socket)

```ts
// Spherical (ball-and-socket) joint: allows free rotation in all directions.
// Optionally constrain the cone angle to limit how far B can swing from A's Z-axis.
const sphericalDef = b3.b3DefaultSphericalJointDef();
sphericalDef.base.bodyIdA = anchor;
sphericalDef.base.bodyIdB = pendulum;
sphericalDef.base.localFrameA = { p: { x: 0, y: -1, z: 0 }, q: IDENTITY_QUAT };
sphericalDef.base.localFrameB = { p: { x: 0, y:  1, z: 0 }, q: IDENTITY_QUAT };
b3.b3CreateSphericalJoint(world, sphericalDef);
```

### Prismatic (Slider)

```ts
// Prismatic joint: slides along the joint frame's local X-axis
const prismaticDef = b3.b3DefaultPrismaticJointDef();
prismaticDef.base.bodyIdA = anchor;
prismaticDef.base.bodyIdB = pendulum;
prismaticDef.base.localFrameA = { p: { x: 0, y: 0, z: 0 }, q: IDENTITY_QUAT };
prismaticDef.base.localFrameB = { p: { x: 0, y: 0, z: 0 }, q: IDENTITY_QUAT };
prismaticDef.enableLimit = true;
prismaticDef.lowerTranslation = -2.0;
prismaticDef.upperTranslation =  2.0;
b3.b3CreatePrismaticJoint(world, prismaticDef);
```

### Wheel (Suspension)

```ts
// Wheel joint: revolute + suspension spring; models a vehicle wheel
const wheelDef = b3.b3DefaultWheelJointDef();
wheelDef.base.bodyIdA = anchor;
wheelDef.base.bodyIdB = pendulum;
wheelDef.base.localFrameA = { p: { x: 0, y: -1, z: 0 }, q: IDENTITY_QUAT };
wheelDef.base.localFrameB = { p: { x: 0, y:  0, z: 0 }, q: IDENTITY_QUAT };
wheelDef.enableSuspensionSpring = true;
wheelDef.suspensionHertz = 4.0;         // spring frequency (Hz)
wheelDef.suspensionDampingRatio = 0.7;  // 0 = undamped, 1 = critically damped
b3.b3CreateWheelJoint(world, wheelDef);
```

## Queries

Queries ask questions about the physics world without advancing the simulation.

### Cast Ray (Closest)

```ts
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
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-cast-ray">
      <img src="./examples/public/screenshots/example-cast-ray.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Cast Ray</strong>
    </a>
  </td>
  </tr>
</table>

### Cast Ray (All Hits)

```ts
// Collect every hit along a ray via callback (called once per shape, unordered).
// Return false from the callback to stop traversal early.
const hits: b3ShapeId[] = [];
b3.b3World_CastRay(world, origin, translation, filter, (shapeId: b3ShapeId, _fraction: number, _normal: unknown) => {
    hits.push(shapeId);
    return true;
});
console.log(`ray hit ${hits.length} shapes`);
```

### Cast Shape (Shapecast)

Sweep a sphere proxy through the world and find the closest hit.

```ts
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
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-cast-shape">
      <img src="./examples/public/screenshots/example-cast-shape.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Cast Shape</strong>
    </a>
  </td>
  </tr>
</table>

### Overlap AABB

```ts
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
```

### Overlap Shape

```ts
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
```

### Query Filter

```ts
// b3QueryFilter controls what a query can hit using category/mask bits (bigint).
// A shape is tested when (filterMaskBits & shapeCategoryBits) != 0n.
const customFilter = b3.b3DefaultQueryFilter();
customFilter.maskBits = 1n; // only hit shapes in category 0x0001
```

## Events

box3d surfaces physics events as arrays read after each `b3World_Step`. Events are opt-in per shape.

### Contact Events

```ts
// Contact events are opt-in per shape -- set enableContactEvents on the shape def.
const shapeDef = b3.b3DefaultShapeDef();
shapeDef.enableContactEvents = true;
const shape = b3.b3CreateBoxShape(body, shapeDef, 0.5, 0.5, 0.5);

// Or enable on an existing shape at runtime
b3.b3Shape_EnableContactEvents(shape, true);

// After b3World_Step, read the contact event arrays for the frame
b3.b3World_Step(world, 1 / 60, 4);
const contactEvents = b3.b3World_GetContactEvents(world);

for (const e of contactEvents.beginEvents) {
    console.log('contact begin:', e.shapeIdA, e.shapeIdB);
}
for (const e of contactEvents.endEvents) {
    console.log('contact end:', e.shapeIdA, e.shapeIdB);
}
for (const e of contactEvents.hitEvents) {
    // Impact event -- shapes struck each other above the hit speed threshold
    console.log('hit:', e.shapeIdA, e.shapeIdB, 'speed:', e.approachSpeed);
}
```

### Sensor Events

```ts
// Sensor shapes generate begin/end overlap events instead of contact forces.
// Both the sensor shape and each visitor shape must opt in to sensor events.
const sensorBodyDef = b3.b3DefaultBodyDef();
sensorBodyDef.type = b3.b3BodyType.b3_kinematicBody;
const sensorBody = b3.b3CreateBody(world, sensorBodyDef);

const sensorShapeDef = b3.b3DefaultShapeDef();
sensorShapeDef.isSensor = true;
sensorShapeDef.enableSensorEvents = true;
b3.b3CreateBoxShape(sensorBody, sensorShapeDef, 2, 2, 2);

const visitorBodyDef = b3.b3DefaultBodyDef();
visitorBodyDef.type = b3.b3BodyType.b3_dynamicBody;
const visitorBody = b3.b3CreateBody(world, visitorBodyDef);
const visitorShapeDef = b3.b3DefaultShapeDef();
visitorShapeDef.enableSensorEvents = true;
b3.b3CreateBoxShape(visitorBody, visitorShapeDef, 0.5, 0.5, 0.5);

b3.b3World_Step(world, 1 / 60, 4);
const sensorEvents = b3.b3World_GetSensorEvents(world);

for (const e of sensorEvents.beginEvents) {
    console.log('entered sensor:', e.sensorShapeId, 'visitor:', e.visitorShapeId);
}
for (const e of sensorEvents.endEvents) {
    console.log('left sensor:', e.sensorShapeId, 'visitor:', e.visitorShapeId);
}
```

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-sensor">
      <img src="./examples/public/screenshots/example-sensor.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Sensor</strong>
    </a>
  </td>
  </tr>
</table>

### Pre-Solve Callback

The pre-solve callback fires for each contact before the constraint solver runs. Return `false` to suppress the contact response entirely (useful for one-way platforms).

```ts
// Pre-solve callback: fires for each contact before the constraint solver runs.
// Return false to suppress the contact response (useful for one-way platforms).
// Set once -- the callback is retained for the world's lifetime.
b3.b3World_SetPreSolveCallback(world, (shapeIdA: b3ShapeId, _shapeIdB: b3ShapeId, _manifold: unknown) => {
    // Example: one-way platform -- let bodies pass through from below
    const bodyA = b3.b3Shape_GetBody(shapeIdA);
    const velA = b3.b3Body_GetLinearVelocity(bodyA);
    if (velA.y > 0) return false; // moving upward: skip contact
    return true;
});
```

## Multithreading

box3d's internal solver can spread work across OS threads via Emscripten pthreads. This requires `SharedArrayBuffer`, which in turn requires [cross-origin isolation](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated).

**Required HTTP headers:**
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Initialization

```ts
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
```

### World Setup

```ts
const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };

// Set workerCount to enable box3d's internal multi-threaded solver.
// box3d clamps this to [1, 32] (B3_MAX_WORKERS). Leave at 0 for single-threaded.
const hwThreads = navigator.hardwareConcurrency ?? 4;
worldDef.workerCount = isolated ? Math.max(2, hwThreads - 1) : 0;

const world = b3.b3CreateWorld(worldDef);
```

### Stepping

```ts
// The simulation API is identical to the single-threaded build;
// only the import and workerCount differ.
b3.b3World_Step(world, 1 / 60, 4);
```

The simulation API is identical to the single-threaded build - only the import path and `workerCount` differ.

<table>
  <tr>
  <td align="center">
    <a href="https://box3d.js.dev/examples#example-multithreading">
      <img src="./examples/public/screenshots/example-multithreading.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>Multithreading</strong>
    </a>
  </td>
  </tr>
</table>

## Building from Source

### Prerequisites

- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) - `emcmake` and `em++` must be on `PATH`
- [CMake](https://cmake.org/) ≥ 3.22
- Node.js ≥ 18
- pnpm

```bash
# Install Emscripten and activate environment
source /path/to/emsdk/emsdk_env.sh
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
