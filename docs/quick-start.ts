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
