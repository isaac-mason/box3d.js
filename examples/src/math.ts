// Tiny math helpers for the examples. box3d intentionally does NOT expose its
// inline vector/quaternion ops as bindings — a quick math op should never cross
// the wasm boundary. Do it in JS (or bring your own gl-matrix / mathcat).

import type { b3Quat, b3Vec3 } from 'box3d.js';

// quaternion [x,y,z,w] for a rotation of `angle` radians about `axis` (any length)
export function quatFromAxisAngle(axis: b3Vec3, angle: number): b3Quat {
	const len = Math.hypot(axis[0], axis[1], axis[2]) || 1;
	const s = Math.sin(angle / 2) / len;
	return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}
