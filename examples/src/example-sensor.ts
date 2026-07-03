// Sensor — a kinematic sensor box sweeps
// side to side past a dynamic and a static box; a label above it reads hit/no-hit
// driven by box3d sensor events (begin/end touch).

import type { Box3DModule, b3BodyType, b3Quat, b3ShapeId } from 'box3d.js';
import Box3D from 'box3d.js/inline';
import * as THREE from 'three';
import { createWorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 5, 15], target: [0, 2, 0] });

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, 0, 0]; // zero gravity
const world = b3.b3CreateWorld(worldDef);

const shapeKey = (s: b3ShapeId): string =>
	`${s.index1}:${s.world0}:${s.generation}`;

// kinematic sensor box that slides side to side
const sensorDef = b3.b3DefaultBodyDef();
sensorDef.type = b3.b3BodyType.b3_kinematicBody;
sensorDef.position = [-8, 1, 0];
const sensorBody = b3.b3CreateBody(world, sensorDef);
const sensorShapeDef = b3.b3DefaultShapeDef();
sensorShapeDef.isSensor = true;
sensorShapeDef.enableSensorEvents = true;
b3.b3CreateBoxShape(sensorBody, sensorShapeDef, 1.5, 1.0, 1.5);

// visitors: one dynamic box, one static box (both opt into sensor events)
function makeBox(type: b3BodyType, x: number): void {
	const def = b3.b3DefaultBodyDef();
	def.type = type;
	def.position = [x, 1, 0];
	const body = b3.b3CreateBody(world, def);
	const sd = b3.b3DefaultShapeDef();
	sd.enableSensorEvents = true;
	b3.b3CreateBoxShape(body, sd, 0.5, 0.5, 0.5);
}
makeBox(b3.b3BodyType.b3_dynamicBody, -2);
makeBox(b3.b3BodyType.b3_staticBody, 2);

// label sprite above the sensor
const canvas = document.createElement('canvas');
canvas.width = 256;
canvas.height = 64;
const ctx = canvas.getContext('2d')!;
const texture = new THREE.CanvasTexture(canvas);
function updateLabel(text: string, color: string): void {
	ctx.fillStyle = '#1a1a1a';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = color;
	ctx.font = 'bold 32px monospace';
	ctx.textAlign = 'center';
	ctx.fillText(text, 128, 42);
	texture.needsUpdate = true;
}
updateLabel('no hit', '#F44336');
const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
sprite.scale.set(4, 1, 1);
app.scene.add(sprite);

const renderer = createWorldRenderer(b3, world);
app.scene.add(renderer.object3d);

// track active sensor overlaps via begin/end touch events
const active = new Set<string>();
const IDENTITY: b3Quat = [0, 0, 0, 1];
const amplitude = 6.0;
const frequency = 1.0;
let time = 0;

// Reusable events buffer + sensor-touch scratch, allocated once.
const eventsBuffer = b3.createEventsBuffer();
const touch = b3.createSensorTouchEvent();

app.onFrame((dt) => {
	time += dt;
	const x = Math.sin(time * frequency) * amplitude;
	b3.b3Body_SetTransform(sensorBody, [x, 1, 0], IDENTITY);

	app.step(() => b3.b3World_Step(world, 1 / 60, 4));

	// Read this step's sensor begin/end events through the zero-alloc buffer.
	b3.getEvents(eventsBuffer, world);
	for (let i = 0, n = b3.getNumSensorBeginEvents(eventsBuffer); i < n; i++) {
		b3.getSensorBeginEventAt(touch, eventsBuffer, i);
		active.add(shapeKey(touch.visitorShapeId));
	}
	for (let i = 0, n = b3.getNumSensorEndEvents(eventsBuffer); i < n; i++) {
		b3.getSensorEndEventAt(touch, eventsBuffer, i);
		active.delete(shapeKey(touch.visitorShapeId));
	}

	if (active.size > 0) updateLabel('hit', '#4CAF50');
	else updateLabel('no hit', '#F44336');

	sprite.position.set(x, 3.5, 0);
	renderer.update();
});
app.start();
