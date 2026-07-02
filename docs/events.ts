import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3ShapeId } from 'box3d.js';

const b3: Box3DModule = await Box3D();
const world = b3.b3CreateWorld(b3.b3DefaultWorldDef());
const bodyDef = b3.b3DefaultBodyDef();
bodyDef.type = b3.b3BodyType.b3_dynamicBody;
const body = b3.b3CreateBody(world, bodyDef);

/* SNIPPET_START: contact-events */
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
/* SNIPPET_END: contact-events */

/* SNIPPET_START: sensor-events */
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
/* SNIPPET_END: sensor-events */

/* SNIPPET_START: pre-solve */
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
/* SNIPPET_END: pre-solve */

b3.b3DestroyWorld(world);
