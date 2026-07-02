import Box3D from 'box3d.js/inline';
import type { Box3DModule } from 'box3d.js';

const b3: Box3DModule = await Box3D();
const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = { x: 0, y: -10, z: 0 };
const world = b3.b3CreateWorld(worldDef);

/* SNIPPET_START: body-types */
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
/* SNIPPET_END: body-types */

/* SNIPPET_START: transform */
// Read position and rotation
const pos = b3.b3Body_GetPosition(dynamicBody);
const rot = b3.b3Body_GetRotation(dynamicBody); // { v: {x,y,z}, s: number } (quaternion)

// Set position and rotation
const IDENTITY_QUAT = { v: { x: 0, y: 0, z: 0 }, s: 1 };
b3.b3Body_SetTransform(dynamicBody, { x: 1, y: 5, z: 0 }, IDENTITY_QUAT);

void pos; void rot;
/* SNIPPET_END: transform */

/* SNIPPET_START: velocity */
// Read velocities
const linVel = b3.b3Body_GetLinearVelocity(dynamicBody);
const angVel = b3.b3Body_GetAngularVelocity(dynamicBody);

// Set velocities
b3.b3Body_SetLinearVelocity(dynamicBody, { x: 5, y: 0, z: 0 });
b3.b3Body_SetAngularVelocity(dynamicBody, { x: 0, y: 1, z: 0 }); // spin around Y

void linVel; void angVel;
/* SNIPPET_END: velocity */

/* SNIPPET_START: forces */
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
/* SNIPPET_END: forces */

/* SNIPPET_START: damping */
// Linear damping slows translational velocity each step (0 = none, higher = more drag)
b3.b3Body_SetLinearDamping(dynamicBody, 0.5);

// Angular damping slows rotational velocity each step
b3.b3Body_SetAngularDamping(dynamicBody, 0.5);
/* SNIPPET_END: damping */

/* SNIPPET_START: gravity-scale */
// Multiply world gravity for this body (0 = weightless, 2 = double gravity)
b3.b3Body_SetGravityScale(dynamicBody, 0.5);
/* SNIPPET_END: gravity-scale */

/* SNIPPET_START: sleeping */
// Check whether a body is awake
const awake = b3.b3Body_IsAwake(dynamicBody);

// Manually wake or sleep a body
b3.b3Body_SetAwake(dynamicBody, true);
b3.b3Body_SetAwake(dynamicBody, false);

// Disable sleep entirely for a body (keeps it active even at rest)
b3.b3Body_EnableSleep(dynamicBody, false);

void awake;
/* SNIPPET_END: sleeping */

/* SNIPPET_START: ccd */
// Enable CCD (bullet mode) for fast-moving objects to prevent tunneling.
// Also raise worldDef.maximumLinearSpeed if the body exceeds the default cap.
b3.b3Body_SetBullet(dynamicBody, true);
/* SNIPPET_END: ccd */

/* SNIPPET_START: change-type */
// Change body type at runtime
b3.b3Body_SetType(dynamicBody, b3.b3BodyType.b3_staticBody);
b3.b3Body_SetType(dynamicBody, b3.b3BodyType.b3_dynamicBody);
/* SNIPPET_END: change-type */

const IDENTITY_QUAT2 = { v: { x: 0, y: 0, z: 0 }, s: 1 };

/* SNIPPET_START: kinematic-move */
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
/* SNIPPET_END: kinematic-move */

/* SNIPPET_START: material */
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
/* SNIPPET_END: material */

/* SNIPPET_START: collision-filter */
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
/* SNIPPET_END: collision-filter */

/* SNIPPET_START: sensor */
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

// Read begin/end events each frame through a reusable, wasm-backed events buffer
// (allocate the buffer + scratch once; refilling with getEvents allocates nothing).
const eventsBuffer = b3.createEventsBuffer();
const sensorTouch = b3.createSensorTouchEvent();
b3.b3World_Step(world, 1 / 60, 4);
b3.getEvents(eventsBuffer, world);
for (let i = 0, n = b3.getNumSensorBeginEvents(eventsBuffer); i < n; i++) {
    b3.getSensorBeginEventAt(sensorTouch, eventsBuffer, i);
    console.log('entered sensor:', sensorTouch.visitorShapeId);
}
for (let i = 0, n = b3.getNumSensorEndEvents(eventsBuffer); i < n; i++) {
    b3.getSensorEndEventAt(sensorTouch, eventsBuffer, i);
    console.log('left sensor:', sensorTouch.visitorShapeId);
}
/* SNIPPET_END: sensor */

b3.b3DestroyWorld(world);
