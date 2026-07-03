// Replay — box3d can record a world's simulation into a buffer (b3World_Start/
// StopRecording → b3Recording) and play it back deterministically with a
// b3RecPlayer. Here a tower is knocked over, the whole run is recorded up front,
// then you scrub and play the recording. The player exposes a b3WorldId per
// frame, so the same world renderer draws it. Ported from box3d's sample_replay.

import Box3D from 'box3d.js/inline';
import type { Box3DModule, b3WorldId } from 'box3d.js';
import { createWorldRenderer, type WorldRenderer } from './box3d-three';
import { createHarness } from './harness';

const b3: Box3DModule = await Box3D();
const app = createHarness({ camera: [0, 8, 18], target: [0, 4, 0] });

// ---------------------------------------------------------------------------
// Record phase — simulate a toppling tower and capture every frame
// ---------------------------------------------------------------------------

const RECORD_FRAMES = 360;

const worldDef = b3.b3DefaultWorldDef();
worldDef.gravity = [0, -10, 0];
const recWorld = b3.b3CreateWorld(worldDef);

const groundDef = b3.b3DefaultBodyDef();
groundDef.position = [0, -0.5, 0];
const ground = b3.b3CreateBody(recWorld, groundDef);
b3.b3CreateBoxShape(ground, b3.b3DefaultShapeDef(), 12, 0.5, 12);

// a tower of boxes
for (let i = 0; i < 14; i++) {
	const def = b3.b3DefaultBodyDef();
	def.type = b3.b3BodyType.b3_dynamicBody;
	def.position = [0, 0.5 + i, 0];
	const body = b3.b3CreateBody(recWorld, def);
	b3.b3CreateBoxShape(body, b3.b3DefaultShapeDef(), 0.5, 0.5, 0.5);
	// give the top few a shove so the tower topples
	if (i >= 11) b3.b3Body_SetLinearVelocity(body, [6, 0, 0]);
}

const recording = b3.b3CreateRecording(8 * 1024 * 1024);
b3.b3World_StartRecording(recWorld, recording);
for (let i = 0; i < RECORD_FRAMES; i++) b3.b3World_Step(recWorld, 1 / 60, 4);
b3.b3World_StopRecording(recWorld);
b3.b3DestroyWorld(recWorld);

// ---------------------------------------------------------------------------
// Replay phase — create a player and scrub through the captured frames
// ---------------------------------------------------------------------------

const player = b3.b3RecPlayer_CreateFromRecording(recording, 0);
const frameCount = b3.b3RecPlayer_GetFrameCount(player);

// the player's world id can change per frame, so (re)build the renderer to match
let worldId: b3WorldId = b3.b3RecPlayer_GetWorldId(player);
let renderer: WorldRenderer = createWorldRenderer(b3, worldId);
app.scene.add(renderer.object3d);

function syncRenderer(): void {
	const w = b3.b3RecPlayer_GetWorldId(player);
	if (w.index1 !== worldId.index1 || w.generation !== worldId.generation) {
		app.scene.remove(renderer.object3d);
		worldId = w;
		renderer = createWorldRenderer(b3, worldId);
		app.scene.add(renderer.object3d);
	}
}

const params = {
	playing: true,
	frame: 0,
	restart: () => { b3.b3RecPlayer_Restart(player); params.frame = 0; params.playing = true; },
};
app.gui.add(params, 'playing').name('play / pause').listen();
const frameCtrl = app.gui.add(params, 'frame', 0, Math.max(1, frameCount - 1), 1).name('frame').listen();
frameCtrl.onChange((v: number) => { params.playing = false; b3.b3RecPlayer_SeekFrame(player, v | 0); });
app.gui.add(params, 'restart').name('restart');

app.onFrame(() => {
	if (params.playing) {
		if (b3.b3RecPlayer_IsAtEnd(player)) b3.b3RecPlayer_Restart(player);
		app.step(() => b3.b3RecPlayer_StepFrame(player));
		params.frame = b3.b3RecPlayer_GetFrame(player);
	}
	syncRenderer();
	renderer.update();
});
app.start();
