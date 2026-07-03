// box3d.js facade — hand-written ergonomic readers over the flat, wasm-backed
// buffers for contacts, per-step events, sensor overlaps, and CollideMover planes.
//
// This file is appended into the Emscripten MODULARIZE factory via --post-js, so
// everything here attaches to the SAME module object as the embind bindings:
//
//   const b3 = await Box3D();
//   const cb = b3.createContactsBuffer();                 // reusable, allocate once
//   const contact = b3.createContact();                   // reusable, allocate once
//   const manifold = b3.createManifold();                 // reusable, allocate once
//   b3.getShapeContactData( cb, shapeId );                // fills wasm storage, grows if needed
//   for ( let i = 0, n = b3.getNumContacts( cb ); i < n; i++ )
//   {
//     b3.getContactAt( contact, cb, i );                  // out-arg first, fills in place
//     for ( let m = 0; m < contact.manifoldCount; m++ )
//     {
//       b3.getManifoldAt( manifold, contact, m );
//       manifold.normal.x; manifold.points[0].separation; // plain reads: no alloc, no crossings
//     }
//   }
//
// createX() allocates reusable out-objects; the getXAt() calls fill them in place,
// reading a pure-JS loop over the wasm heap, so scanning allocates nothing and
// crosses the wasm/JS boundary only for the fill.
//
// STRIDES BELOW MUST STAY IN SYNC with packContactsInto() in src/bindings.cpp.

// --- shape id overlaps (sensors) -------------------------------------------
// buffer: { count, data: Int32Array }, 3 int32 per id: index1, world0, generation

function getNumShapeIds( buf ) { return buf.count; }

function createShapeId() { return { index1: 0, world0: 0, generation: 0 }; }

function getShapeIdAt( out, buf, i )
{
	const d = buf.data;
	const s = i * 3;
	out.index1 = d[ s ];
	out.world0 = d[ s + 1 ];
	out.generation = d[ s + 2 ];
	return out;
}

// --- contacts (contacts -> manifolds -> points) ----------------------------

const CONTACT_STRIDE = 12; // idA(3) idB(3) contactId(4) manifoldStart manifoldCount
const MANIFOLD_STRIDE_F = 10; // normal(3) twistImpulse frictionImpulse(3) rollingImpulse(3)
const MANIFOLD_STRIDE_I = 2; // pointStart pointCount
const POINT_STRIDE_F = 11; // anchorA(3) anchorB(3) separation baseSeparation normalImpulse totalNormalImpulse normalVelocity
const POINT_STRIDE_I = 3; // featureId triangleIndex persisted

function getNumContacts( buf ) { return buf.count; }

function createContact()
{
	return {
		shapeIdA: { index1: 0, world0: 0, generation: 0 },
		shapeIdB: { index1: 0, world0: 0, generation: 0 },
		contactId: { index1: 0, world0: 0, padding: 0, generation: 0 },
		manifoldCount: 0,
		// internal cursor state used by getManifoldAt; do not read.
		_buf: null,
		_manifoldStart: 0,
	};
}

function getContactAt( out, buf, i )
{
	const a = buf.contactsI32;
	// Mode-1 buffers have no base fields (contacts start at index 0); the reusable
	// wasm-backed buffer sets a base so we can index into the live module HEAP.
	const s = ( buf.contactsBase | 0 ) + i * CONTACT_STRIDE;
	const A = out.shapeIdA;
	A.index1 = a[ s ]; A.world0 = a[ s + 1 ]; A.generation = a[ s + 2 ];
	const B = out.shapeIdB;
	B.index1 = a[ s + 3 ]; B.world0 = a[ s + 4 ]; B.generation = a[ s + 5 ];
	const C = out.contactId;
	C.index1 = a[ s + 6 ]; C.world0 = a[ s + 7 ]; C.padding = a[ s + 8 ]; C.generation = a[ s + 9 ] >>> 0;
	out._manifoldStart = a[ s + 10 ];
	out.manifoldCount = a[ s + 11 ];
	out._buf = buf;
	return out;
}

function createPoint()
{
	return {
		anchorA: [ 0, 0, 0 ],
		anchorB: [ 0, 0, 0 ],
		separation: 0,
		baseSeparation: 0,
		normalImpulse: 0,
		totalNormalImpulse: 0,
		normalVelocity: 0,
		featureId: 0,
		triangleIndex: 0,
		persisted: false,
	};
}

// Manifolds hold at most B3_MAX_MANIFOLD_POINTS (4) points, so the point
// sub-objects are pre-allocated once here; getManifoldAt fills points[0..pointCount).
function createManifold()
{
	return {
		normal: [ 0, 0, 0 ],
		twistImpulse: 0,
		frictionImpulse: [ 0, 0, 0 ],
		rollingImpulse: [ 0, 0, 0 ],
		pointCount: 0,
		points: [ createPoint(), createPoint(), createPoint(), createPoint() ],
	};
}

function getManifoldAt( out, contact, m )
{
	const buf = contact._buf;
	const gm = contact._manifoldStart + m;
	const mf = buf.manifoldsF32;
	const mi = buf.manifoldsI32;
	const fs = ( buf.manifoldsF32Base | 0 ) + gm * MANIFOLD_STRIDE_F;
	const n = out.normal;
	n[ 0 ] = mf[ fs ]; n[ 1 ] = mf[ fs + 1 ]; n[ 2 ] = mf[ fs + 2 ];
	out.twistImpulse = mf[ fs + 3 ];
	const fr = out.frictionImpulse;
	fr[ 0 ] = mf[ fs + 4 ]; fr[ 1 ] = mf[ fs + 5 ]; fr[ 2 ] = mf[ fs + 6 ];
	const rl = out.rollingImpulse;
	rl[ 0 ] = mf[ fs + 7 ]; rl[ 1 ] = mf[ fs + 8 ]; rl[ 2 ] = mf[ fs + 9 ];

	const is = ( buf.manifoldsI32Base | 0 ) + gm * MANIFOLD_STRIDE_I;
	const pointStart = mi[ is ];
	const pointCount = mi[ is + 1 ];
	out.pointCount = pointCount;

	const pf = buf.pointsF32;
	const pi = buf.pointsI32;
	const pfBase = buf.pointsF32Base | 0;
	const piBase = buf.pointsI32Base | 0;
	for ( let p = 0; p < pointCount; p++ )
	{
		const P = out.points[ p ];
		const g = pointStart + p;
		const ps = pfBase + g * POINT_STRIDE_F;
		const pis = piBase + g * POINT_STRIDE_I;
		const aA = P.anchorA;
		aA[ 0 ] = pf[ ps ]; aA[ 1 ] = pf[ ps + 1 ]; aA[ 2 ] = pf[ ps + 2 ];
		const aB = P.anchorB;
		aB[ 0 ] = pf[ ps + 3 ]; aB[ 1 ] = pf[ ps + 4 ]; aB[ 2 ] = pf[ ps + 5 ];
		P.separation = pf[ ps + 6 ];
		P.baseSeparation = pf[ ps + 7 ];
		P.normalImpulse = pf[ ps + 8 ];
		P.totalNormalImpulse = pf[ ps + 9 ];
		P.normalVelocity = pf[ ps + 10 ];
		P.featureId = pi[ pis ] >>> 0;
		P.triangleIndex = pi[ pis + 1 ];
		P.persisted = pi[ pis + 2 ] !== 0;
	}
	return out;
}

// --- reusable, wasm-backed contact buffer (per-frame path, zero JS alloc) ----
//
//   const cb = b3.createContactsBuffer();          // allocate once
//   // each frame, after stepping:
//   b3.getShapeContactData( cb, shapeId );          // fills wasm storage, grows if needed
//   for ( let i = 0, n = b3.getNumContacts( cb ); i < n; i++ ) { ... same readers ... }
//   // when done:
//   b3.destroyContactsBuffer( cb );                 // frees the wasm storage
//
// Refilling this buffer copies nothing to JS and allocates no typed arrays: the
// data stays in the wasm heap and the readers index the live module HEAP views in
// place. Read the buffer before the next step or other allocation —
// getShapeContactData/getBodyContactData re-grab the views, so calling one each
// frame (after stepping) is always safe.

function createContactsBuffer()
{
	return {
		_impl: new Module.ContactsBufferImpl(),
		count: 0,
		// tier views point at the live module HEAP; bases are element offsets into it
		contactsI32: null, contactsBase: 0,
		manifoldsF32: null, manifoldsF32Base: 0,
		manifoldsI32: null, manifoldsI32Base: 0,
		pointsF32: null, pointsF32Base: 0,
		pointsI32: null, pointsI32Base: 0,
	};
}

// Re-point the buffer's tier views/bases at the current wasm heap. HEAP32/HEAPF32
// are module-scope views that Emscripten swaps out when memory grows, so we grab
// them fresh (a reference copy, no allocation) and recompute the byte->element
// offsets after every fill, when a growing std::vector may have moved too.
function refreshContactsBuffer( buf )
{
	const impl = buf._impl;
	buf.count = impl.count();
	buf.contactsI32 = HEAP32; buf.contactsBase = impl.contactsPtr() >> 2;
	buf.manifoldsF32 = HEAPF32; buf.manifoldsF32Base = impl.manifoldsF32Ptr() >> 2;
	buf.manifoldsI32 = HEAP32; buf.manifoldsI32Base = impl.manifoldsI32Ptr() >> 2;
	buf.pointsF32 = HEAPF32; buf.pointsF32Base = impl.pointsF32Ptr() >> 2;
	buf.pointsI32 = HEAP32; buf.pointsI32Base = impl.pointsI32Ptr() >> 2;
}

function getShapeContactData( buf, shapeId )
{
	buf._impl.loadFromShape( shapeId );
	refreshContactsBuffer( buf );
	return buf;
}

function getBodyContactData( buf, bodyId )
{
	buf._impl.loadFromBody( bodyId );
	refreshContactsBuffer( buf );
	return buf;
}

function destroyContactsBuffer( buf )
{
	buf._impl.delete();
	buf._impl = null;
}

// --- per-step events (reusable, wasm-backed; zero JS alloc per step) ---------
//
//   const eb = b3.createEventsBuffer();          // allocate once
//   const hit = b3.createContactHitEvent();       // reusable scratch, once
//   // each frame, after stepping:
//   b3.getEvents( eb, world );                     // pulls all event groups into wasm storage
//   for ( let i = 0, n = b3.getNumContactHitEvents( eb ); i < n; i++ )
//   {
//     b3.getContactHitEventAt( hit, eb, i );       // fills `hit` in place (out-arg first)
//     hit.shapeIdA; hit.point; hit.normal; hit.approachSpeed;
//   }
//   b3.destroyEventsBuffer( eb );                   // free the wasm storage
//
// STRIDES MUST STAY IN SYNC with the EventsBuffer struct in src/bindings.cpp.

const CONTACT_TOUCH_STRIDE = 10; // shapeIdA(3) shapeIdB(3) contactId(4)
const CONTACT_HIT_STRIDE_I = 14; // shapeIdA(3) shapeIdB(3) contactId(4) matA(lo,hi) matB(lo,hi)
const CONTACT_HIT_STRIDE_F = 7; //  point(3) normal(3) approachSpeed
const BODY_MOVE_STRIDE_I = 4; //    bodyId(3) fellAsleep
const BODY_MOVE_STRIDE_F = 7; //    position(3) rotation(x,y,z,w)
const SENSOR_TOUCH_STRIDE = 6; //   sensorShapeId(3) visitorShapeId(3)
const JOINT_STRIDE = 3; //          jointId(3)

function readShapeId( dst, a, o )
{
	dst.index1 = a[ o ]; dst.world0 = a[ o + 1 ]; dst.generation = a[ o + 2 ];
}
function readContactId( dst, a, o )
{
	dst.index1 = a[ o ]; dst.world0 = a[ o + 1 ]; dst.padding = a[ o + 2 ]; dst.generation = a[ o + 3 ] >>> 0;
}
function readU64( a, o )
{
	return BigInt( a[ o ] >>> 0 ) | ( BigInt( a[ o + 1 ] >>> 0 ) << 32n );
}

function createEventsBuffer()
{
	return {
		_impl: new Module.EventsBufferImpl(),
		i32: null, f64: null, // live module HEAP views, refreshed on each getEvents
		contactBeginCount: 0, contactBeginBase: 0,
		contactEndCount: 0, contactEndBase: 0,
		contactHitCount: 0, contactHitI32Base: 0, contactHitF64Base: 0,
		bodyMoveCount: 0, bodyMoveI32Base: 0, bodyMoveF64Base: 0,
		sensorBeginCount: 0, sensorBeginBase: 0,
		sensorEndCount: 0, sensorEndBase: 0,
		jointCount: 0, jointBase: 0,
	};
}

function getEvents( eb, worldId )
{
	const impl = eb._impl;
	impl.loadFrom( worldId );
	// Re-grab HEAP views + byte->element bases (memory may have grown, vectors moved).
	eb.i32 = HEAP32;
	eb.f64 = HEAPF64;
	eb.contactBeginCount = impl.contactBeginCount(); eb.contactBeginBase = impl.contactBeginPtr() >> 2;
	eb.contactEndCount = impl.contactEndCount(); eb.contactEndBase = impl.contactEndPtr() >> 2;
	eb.contactHitCount = impl.contactHitCount();
	eb.contactHitI32Base = impl.contactHitI32Ptr() >> 2; eb.contactHitF64Base = impl.contactHitF64Ptr() >> 3;
	eb.bodyMoveCount = impl.bodyMoveCount();
	eb.bodyMoveI32Base = impl.bodyMoveI32Ptr() >> 2; eb.bodyMoveF64Base = impl.bodyMoveF64Ptr() >> 3;
	eb.sensorBeginCount = impl.sensorBeginCount(); eb.sensorBeginBase = impl.sensorBeginPtr() >> 2;
	eb.sensorEndCount = impl.sensorEndCount(); eb.sensorEndBase = impl.sensorEndPtr() >> 2;
	eb.jointCount = impl.jointCount(); eb.jointBase = impl.jointPtr() >> 2;
	return eb;
}

function destroyEventsBuffer( eb )
{
	eb._impl.delete();
	eb._impl = null;
}

function getNumContactBeginEvents( eb ) { return eb.contactBeginCount; }
function getNumContactEndEvents( eb ) { return eb.contactEndCount; }
function getNumContactHitEvents( eb ) { return eb.contactHitCount; }
function getNumBodyMoveEvents( eb ) { return eb.bodyMoveCount; }
function getNumSensorBeginEvents( eb ) { return eb.sensorBeginCount; }
function getNumSensorEndEvents( eb ) { return eb.sensorEndCount; }
function getNumJointEvents( eb ) { return eb.jointCount; }

// contact begin/end touch events: { shapeIdA, shapeIdB, contactId }
function createContactTouchEvent()
{
	return {
		shapeIdA: { index1: 0, world0: 0, generation: 0 },
		shapeIdB: { index1: 0, world0: 0, generation: 0 },
		contactId: { index1: 0, world0: 0, padding: 0, generation: 0 },
	};
}
function readContactTouch( out, eb, i, base )
{
	const a = eb.i32;
	const s = base + i * CONTACT_TOUCH_STRIDE;
	readShapeId( out.shapeIdA, a, s );
	readShapeId( out.shapeIdB, a, s + 3 );
	readContactId( out.contactId, a, s + 6 );
	return out;
}
function getContactBeginEventAt( out, eb, i ) { return readContactTouch( out, eb, i, eb.contactBeginBase ); }
function getContactEndEventAt( out, eb, i ) { return readContactTouch( out, eb, i, eb.contactEndBase ); }

// contact hit events
function createContactHitEvent()
{
	return {
		shapeIdA: { index1: 0, world0: 0, generation: 0 },
		shapeIdB: { index1: 0, world0: 0, generation: 0 },
		contactId: { index1: 0, world0: 0, padding: 0, generation: 0 },
		point: [ 0, 0, 0 ],
		normal: [ 0, 0, 0 ],
		approachSpeed: 0,
		userMaterialIdA: 0n,
		userMaterialIdB: 0n,
	};
}
function getContactHitEventAt( out, eb, i )
{
	const a = eb.i32;
	const s = eb.contactHitI32Base + i * CONTACT_HIT_STRIDE_I;
	readShapeId( out.shapeIdA, a, s );
	readShapeId( out.shapeIdB, a, s + 3 );
	readContactId( out.contactId, a, s + 6 );
	out.userMaterialIdA = readU64( a, s + 10 );
	out.userMaterialIdB = readU64( a, s + 12 );
	const f = eb.f64;
	const fs = eb.contactHitF64Base + i * CONTACT_HIT_STRIDE_F;
	out.point[ 0 ] = f[ fs ]; out.point[ 1 ] = f[ fs + 1 ]; out.point[ 2 ] = f[ fs + 2 ];
	out.normal[ 0 ] = f[ fs + 3 ]; out.normal[ 1 ] = f[ fs + 4 ]; out.normal[ 2 ] = f[ fs + 5 ];
	out.approachSpeed = f[ fs + 6 ];
	return out;
}

// body move events
function createBodyMoveEvent()
{
	return {
		bodyId: { index1: 0, world0: 0, generation: 0 },
		position: [ 0, 0, 0 ],
		rotation: [ 0, 0, 0, 1 ],
		fellAsleep: false,
	};
}
function getBodyMoveEventAt( out, eb, i )
{
	const a = eb.i32;
	const s = eb.bodyMoveI32Base + i * BODY_MOVE_STRIDE_I;
	out.bodyId.index1 = a[ s ]; out.bodyId.world0 = a[ s + 1 ]; out.bodyId.generation = a[ s + 2 ];
	out.fellAsleep = a[ s + 3 ] !== 0;
	const f = eb.f64;
	const fs = eb.bodyMoveF64Base + i * BODY_MOVE_STRIDE_F;
	out.position[ 0 ] = f[ fs ]; out.position[ 1 ] = f[ fs + 1 ]; out.position[ 2 ] = f[ fs + 2 ];
	out.rotation[ 0 ] = f[ fs + 3 ]; out.rotation[ 1 ] = f[ fs + 4 ]; out.rotation[ 2 ] = f[ fs + 5 ]; out.rotation[ 3 ] = f[ fs + 6 ];
	return out;
}

// sensor begin/end touch events: { sensorShapeId, visitorShapeId }
function createSensorTouchEvent()
{
	return {
		sensorShapeId: { index1: 0, world0: 0, generation: 0 },
		visitorShapeId: { index1: 0, world0: 0, generation: 0 },
	};
}
function readSensorTouch( out, eb, i, base )
{
	const a = eb.i32;
	const s = base + i * SENSOR_TOUCH_STRIDE;
	readShapeId( out.sensorShapeId, a, s );
	readShapeId( out.visitorShapeId, a, s + 3 );
	return out;
}
function getSensorBeginEventAt( out, eb, i ) { return readSensorTouch( out, eb, i, eb.sensorBeginBase ); }
function getSensorEndEventAt( out, eb, i ) { return readSensorTouch( out, eb, i, eb.sensorEndBase ); }

// joint events: { jointId }
function createJointEvent() { return { jointId: { index1: 0, world0: 0, generation: 0 } }; }
function getJointEventAt( out, eb, i )
{
	const a = eb.i32;
	const s = eb.jointBase + i * JOINT_STRIDE;
	out.jointId.index1 = a[ s ]; out.jointId.world0 = a[ s + 1 ]; out.jointId.generation = a[ s + 2 ];
	return out;
}

// --- b3World_CollideMover plane results ---------------------------------------
// The CollideMover callback receives a packed buffer { count, data: Float32Array }
// (7 floats per plane); read it with these instead of a JS array of objects.

function getNumPlaneResults( buf ) { return buf.count; }
function createPlaneResult()
{
	return { plane: { normal: [ 0, 0, 0 ], offset: 0 }, point: [ 0, 0, 0 ] };
}
function getPlaneResultAt( out, buf, i )
{
	const d = buf.data;
	const s = i * 7;
	const nrm = out.plane.normal;
	nrm[ 0 ] = d[ s ]; nrm[ 1 ] = d[ s + 1 ]; nrm[ 2 ] = d[ s + 2 ];
	out.plane.offset = d[ s + 3 ];
	out.point[ 0 ] = d[ s + 4 ]; out.point[ 1 ] = d[ s + 5 ]; out.point[ 2 ] = d[ s + 6 ];
	return out;
}

// --- out-param math reads (conventions documented in src/bindings.cpp header) ---
// Each raw `b3X_GetYInto(out, ...)` writes floats to a static wasm scratch; the
// public `b3X_GetY(out, ...) -> out` copies scratch -> the caller's mathcat array.
//
// Zero-allocation: the readers are specialized per (type × arity), so there is no
// `arguments`/slice/spread on the hot path — each installed function is a fixed-arity,
// branch-free, unrolled copy. One wasm crossing per read; HEAPF32 is re-read each call
// (memory-growth safe). raw fn + scratch pointer are resolved once, lazily (so
// post-js/embind init order never matters); the static scratch address is stable.

// Resolve the static scratch once — the address is stable — and strip the getter
// from the public module (it's internal plumbing). --post-js runs after embind has
// registered, so the raw fns are already on Module here.
const SCRATCH = Module.b3_getMathScratch(); // byte pointer to the static float scratch
const BASE = SCRATCH >>> 2; //                 element base
delete Module.b3_getMathScratch;

// Specialization matrix: MAKERS[type][argc]( rawFn ) -> the installed reader.
// Each reader is monomorphic + fixed-arity with an unrolled copy — no arguments,
// slice, spread, or per-call branch. type: v3 (Vec3, 3) · q4 (Quat, 4) · v6 (AABB/
// Box3, 6) · xf (Transform, 7 split). Add m9/m16 for Mat3/Mat4 (same shape) later.
const MAKERS = {
	v3: {
		1: ( raw ) => ( out, a ) => { raw( SCRATCH, a ); const h = HEAPF32; out[ 0 ] = h[ BASE ]; out[ 1 ] = h[ BASE + 1 ]; out[ 2 ] = h[ BASE + 2 ]; return out; },
		2: ( raw ) => ( out, a, b ) => { raw( SCRATCH, a, b ); const h = HEAPF32; out[ 0 ] = h[ BASE ]; out[ 1 ] = h[ BASE + 1 ]; out[ 2 ] = h[ BASE + 2 ]; return out; },
	},
	q4: {
		1: ( raw ) => ( out, a ) => { raw( SCRATCH, a ); const h = HEAPF32; out[ 0 ] = h[ BASE ]; out[ 1 ] = h[ BASE + 1 ]; out[ 2 ] = h[ BASE + 2 ]; out[ 3 ] = h[ BASE + 3 ]; return out; },
	},
	v6: {
		1: ( raw ) => ( out, a ) => { raw( SCRATCH, a ); const h = HEAPF32; out[ 0 ] = h[ BASE ]; out[ 1 ] = h[ BASE + 1 ]; out[ 2 ] = h[ BASE + 2 ]; out[ 3 ] = h[ BASE + 3 ]; out[ 4 ] = h[ BASE + 4 ]; out[ 5 ] = h[ BASE + 5 ]; return out; },
	},
	// transform out is { position: Vec3, quaternion: Quat } — split the 7-float scratch
	xf: {
		1: ( raw ) => ( out, a ) => { raw( SCRATCH, a ); const h = HEAPF32; const p = out.position, q = out.quaternion; p[ 0 ] = h[ BASE ]; p[ 1 ] = h[ BASE + 1 ]; p[ 2 ] = h[ BASE + 2 ]; q[ 0 ] = h[ BASE + 3 ]; q[ 1 ] = h[ BASE + 4 ]; q[ 2 ] = h[ BASE + 5 ]; q[ 3 ] = h[ BASE + 6 ]; return out; },
	},
};

function createTransform() { return { position: [ 0, 0, 0 ], quaternion: [ 0, 0, 0, 1 ] }; }

// [ publicName, type, argCount ] — install the public reader, capture + strip the raw `*Into`.
for ( const [ name, type, argc ] of [
	[ 'b3World_GetGravity', 'v3', 1 ], [ 'b3World_GetBounds', 'v6', 1 ],
	[ 'b3Body_GetPosition', 'v3', 1 ], [ 'b3Body_GetRotation', 'q4', 1 ],
	[ 'b3Body_GetLinearVelocity', 'v3', 1 ], [ 'b3Body_GetAngularVelocity', 'v3', 1 ],
	[ 'b3Body_GetLocalPoint', 'v3', 2 ], [ 'b3Body_GetWorldPoint', 'v3', 2 ],
	[ 'b3Body_GetLocalVector', 'v3', 2 ], [ 'b3Body_GetWorldVector', 'v3', 2 ],
	[ 'b3Body_GetLocalPointVelocity', 'v3', 2 ], [ 'b3Body_GetWorldPointVelocity', 'v3', 2 ],
	[ 'b3Body_GetLocalCenterOfMass', 'v3', 1 ], [ 'b3Body_GetWorldCenterOfMass', 'v3', 1 ],
	[ 'b3Body_ComputeAABB', 'v6', 1 ], [ 'b3Shape_GetAABB', 'v6', 1 ], [ 'b3Shape_GetClosestPoint', 'v3', 2 ],
	[ 'b3Joint_GetConstraintForce', 'v3', 1 ], [ 'b3Joint_GetConstraintTorque', 'v3', 1 ],
	[ 'b3Body_GetTransform', 'xf', 1 ], [ 'b3Joint_GetLocalFrameA', 'xf', 1 ], [ 'b3Joint_GetLocalFrameB', 'xf', 1 ],
] )
{
	const rawName = name + 'Into';
	const raw = Module[ rawName ];
	delete Module[ rawName ]; // strip the raw writer from the public surface
	Module[ name ] = MAKERS[ type ][ argc ]( raw );
}

// Attach onto the Emscripten module object (in scope here as `Module`).
Object.assign( Module, {
	createTransform,
	getNumShapeIds, createShapeId, getShapeIdAt,
	getNumContacts, createContact, getContactAt,
	createPoint, createManifold, getManifoldAt,
	createContactsBuffer, getShapeContactData, getBodyContactData, destroyContactsBuffer,
	createEventsBuffer, getEvents, destroyEventsBuffer,
	getNumContactBeginEvents, getNumContactEndEvents, getNumContactHitEvents,
	getNumBodyMoveEvents, getNumSensorBeginEvents, getNumSensorEndEvents, getNumJointEvents,
	createContactTouchEvent, getContactBeginEventAt, getContactEndEventAt,
	createContactHitEvent, getContactHitEventAt,
	createBodyMoveEvent, getBodyMoveEventAt,
	createSensorTouchEvent, getSensorBeginEventAt, getSensorEndEventAt,
	createJointEvent, getJointEventAt,
	getNumPlaneResults, createPlaneResult, getPlaneResultAt,
} );
