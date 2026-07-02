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

// Read events through a reusable, wasm-backed buffer. Allocate the buffer and any
// event scratch objects ONCE, then refill each step with getEvents -- reading is
// a zero-allocation loop over the wasm heap, so it scales to thousands of events.
const eventsBuffer = b3.createEventsBuffer();
const touch = b3.createContactTouchEvent();
const hit = b3.createContactHitEvent();

b3.b3World_Step(world, 1 / 60, 4);
b3.getEvents(eventsBuffer, world);

for (let i = 0, n = b3.getNumContactBeginEvents(eventsBuffer); i < n; i++) {
    b3.getContactBeginEventAt(touch, eventsBuffer, i); // fills `touch` in place
    console.log('contact begin:', touch.shapeIdA, touch.shapeIdB);
}
for (let i = 0, n = b3.getNumContactEndEvents(eventsBuffer); i < n; i++) {
    b3.getContactEndEventAt(touch, eventsBuffer, i);
    console.log('contact end:', touch.shapeIdA, touch.shapeIdB);
}
for (let i = 0, n = b3.getNumContactHitEvents(eventsBuffer); i < n; i++) {
    // Impact event -- shapes struck each other above the hit speed threshold
    b3.getContactHitEventAt(hit, eventsBuffer, i);
    console.log('hit:', hit.shapeIdA, hit.shapeIdB, 'speed:', hit.approachSpeed);
}

// The buffer owns wasm memory -- free it when you're done with it.
// b3.destroyEventsBuffer(eventsBuffer);
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

// Read sensor events from the same reusable events buffer (created above).
const sensorTouch = b3.createSensorTouchEvent();
b3.b3World_Step(world, 1 / 60, 4);
b3.getEvents(eventsBuffer, world);

for (let i = 0, n = b3.getNumSensorBeginEvents(eventsBuffer); i < n; i++) {
    b3.getSensorBeginEventAt(sensorTouch, eventsBuffer, i);
    console.log('entered sensor:', sensorTouch.sensorShapeId, 'visitor:', sensorTouch.visitorShapeId);
}
for (let i = 0, n = b3.getNumSensorEndEvents(eventsBuffer); i < n; i++) {
    b3.getSensorEndEventAt(sensorTouch, eventsBuffer, i);
    console.log('left sensor:', sensorTouch.sensorShapeId, 'visitor:', sensorTouch.visitorShapeId);
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

/* SNIPPET_START: contacts-buffer */
// Events tell you when contacts begin/end/hit. To instead inspect *every current
// contact manifold* each frame, use a reusable, wasm-backed contacts buffer. Its
// storage lives in the wasm heap and grows on its own, so refilling it copies
// nothing to JS and allocates no typed arrays -- the fast path for per-frame use.

// Allocate the buffer and the reader scratch objects ONCE (never in the loop).
const contactsBuffer = b3.createContactsBuffer();
const contact = b3.createContact();
const manifold = b3.createManifold();

// Each frame, after stepping, refill the buffer for a body (or getShapeContactData
// for a single shape), then read it back with zero allocation:
b3.b3World_Step(world, 1 / 60, 4);
b3.getBodyContactData(contactsBuffer, body);

for (let i = 0, n = b3.getNumContacts(contactsBuffer); i < n; i++) {
    b3.getContactAt(contact, contactsBuffer, i); // fills `contact` in place (out-arg first)
    for (let m = 0; m < contact.manifoldCount; m++) {
        b3.getManifoldAt(manifold, contact, m); // fills `manifold` and its points in place
        for (let p = 0; p < manifold.pointCount; p++) {
            const point = manifold.points[p];
            // point.anchorA / anchorB: world-space offsets from each body's centre of mass
            // point.separation: negative when penetrating   point.normalImpulse: contact force
            console.log(point.separation, point.normalImpulse);
        }
    }
}

// The buffer owns wasm memory -- free it when you're done with it.
b3.destroyContactsBuffer(contactsBuffer);
/* SNIPPET_END: contacts-buffer */

b3.b3DestroyWorld(world);
