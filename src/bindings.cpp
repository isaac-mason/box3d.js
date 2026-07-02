// box3d.js — hand-written embind bindings for box3d.
//
// Style: flat & faithful. We mirror the C API ~1:1. C structs map to embind
// value_objects; C functions bind directly. Functions that take a `const
// b3*Def*` pointer are wrapped by a tiny by-value lambda, because embind
// marshals value_objects by value, not by pointer.
//
// The file is organized into sections so it stays buildable as coverage grows.

#include <cmath>
#include <string>
#include <vector>

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <box3d/box3d.h>
#include <box3d/collision.h>

using namespace emscripten;

// A captureless lambda decays to a function pointer via unary +, which is what
// embind's function() wants. Wrappers below adapt pointer-taking C functions to
// by-value value_object arguments.

// Convert a C (pointer, count) event array into a native JS array of the
// (registered) value_object element type.
namespace
{
template <class T>
val eventsToArray( const T* data, int count )
{
	val arr = val::array();
	for ( int i = 0; i < count; ++i )
	{
		arr.call<void>( "push", val( data[i] ) );
	}
	return arr;
}

// Marshal b3ContactData[] into a JS array of { shapeIdA, shapeIdB, manifolds:
// [{ normal, points: [{ anchorA, anchorB, separation }] }] }.
inline val contactsToArray( const b3ContactData* data, int count )
{
	val arr = val::array();
	for ( int i = 0; i < count; ++i )
	{
		val c = val::object();
		c.set( "shapeIdA", val( data[i].shapeIdA ) );
		c.set( "shapeIdB", val( data[i].shapeIdB ) );
		val manifolds = val::array();
		for ( int m = 0; m < data[i].manifoldCount; ++m )
		{
			const b3Manifold& man = data[i].manifolds[m];
			val mo = val::object();
			mo.set( "normal", val( man.normal ) );
			val pts = val::array();
			for ( int p = 0; p < man.pointCount; ++p )
			{
				val po = val::object();
				po.set( "anchorA", val( man.points[p].anchorA ) );
				po.set( "anchorB", val( man.points[p].anchorB ) );
				po.set( "separation", man.points[p].separation );
				pts.call<void>( "push", po );
			}
			mo.set( "points", pts );
			manifolds.call<void>( "push", mo );
		}
		c.set( "manifolds", manifolds );
		arr.call<void>( "push", c );
	}
	return arr;
}

// Faithful debug-draw binding. b3World_Draw takes a b3DebugDraw struct of C
// function pointers; we bridge each to a method on a JS handler object carried
// through the context pointer. This crosses into JS per primitive, so it is for
// debug/inspection, NOT the render hot path (examples map shapes to solid
// meshes and only read body transforms).
struct JsDebugDraw
{
	val handlers;
};

void jsDrawSegment( b3Pos p1, b3Pos p2, b3HexColor color, void* ctx )
{
	static_cast<JsDebugDraw*>( ctx )->handlers.call<void>( "drawSegment", p1, p2, (uint32_t)color );
}
void jsDrawPoint( b3Pos p, float size, b3HexColor color, void* ctx )
{
	static_cast<JsDebugDraw*>( ctx )->handlers.call<void>( "drawPoint", p, size, (uint32_t)color );
}
void jsDrawSphere( b3Pos p, float radius, b3HexColor color, float alpha, void* ctx )
{
	static_cast<JsDebugDraw*>( ctx )->handlers.call<void>( "drawSphere", p, radius, (uint32_t)color, alpha );
}
void jsDrawCapsule( b3Pos p1, b3Pos p2, float radius, b3HexColor color, float alpha, void* ctx )
{
	static_cast<JsDebugDraw*>( ctx )->handlers.call<void>( "drawCapsule", p1, p2, radius, (uint32_t)color, alpha );
}
void jsDrawBox( b3Vec3 extents, b3WorldTransform xf, b3HexColor color, void* ctx )
{
	static_cast<JsDebugDraw*>( ctx )->handlers.call<void>( "drawBox", extents, xf, (uint32_t)color );
}
void jsDrawBounds( b3AABB aabb, b3HexColor color, void* ctx )
{
	static_cast<JsDebugDraw*>( ctx )->handlers.call<void>( "drawBounds", aabb, (uint32_t)color );
}
void jsDrawTransform( b3WorldTransform xf, void* ctx )
{
	static_cast<JsDebugDraw*>( ctx )->handlers.call<void>( "drawTransform", xf );
}

// Run b3World_Draw, dispatching primitives to methods on the JS `handlers`
// object. Only handler methods that are present get wired; flags on the same
// object (drawJoints/drawBounds/drawContacts/drawMass) select what is emitted.
void worldDraw( b3WorldId worldId, val handlers )
{
	JsDebugDraw jd{ handlers };
	b3DebugDraw dd = b3DefaultDebugDraw();
	dd.context = &jd;
	dd.drawingBounds = b3AABB{ b3Vec3{ -1e30f, -1e30f, -1e30f }, b3Vec3{ 1e30f, 1e30f, 1e30f } };

	auto has = [&]( const char* k ) { return handlers.hasOwnProperty( k ) && !handlers[k].isUndefined(); };
	auto flag = [&]( const char* k, bool dflt ) { return has( k ) ? handlers[k].as<bool>() : dflt; };

	// Only wire trampolines the caller supplied; leave the rest NULL.
	dd.DrawSegmentFcn = has( "drawSegment" ) ? jsDrawSegment : nullptr;
	dd.DrawPointFcn = has( "drawPoint" ) ? jsDrawPoint : nullptr;
	dd.DrawSphereFcn = has( "drawSphere" ) ? jsDrawSphere : nullptr;
	dd.DrawCapsuleFcn = has( "drawCapsule" ) ? jsDrawCapsule : nullptr;
	dd.DrawBoxFcn = has( "drawBox" ) ? jsDrawBox : nullptr;
	dd.DrawBoundsFcn = has( "drawBounds" ) ? jsDrawBounds : nullptr;
	dd.DrawTransformFcn = has( "drawTransform" ) ? jsDrawTransform : nullptr;
	// Shape outlines require the world-level createDebugShape cache (deferred),
	// so never let box3d call a NULL DrawShapeFcn.
	dd.DrawShapeFcn = nullptr;
	dd.DrawStringFcn = nullptr;
	dd.drawShapes = false;

	dd.drawJoints = flag( "drawJoints", dd.drawJoints );
	dd.drawBounds = flag( "drawBounds", dd.drawBounds );
	dd.drawContacts = flag( "drawContacts", dd.drawContacts );
	dd.drawMass = flag( "drawMass", dd.drawMass );

	b3World_Draw( worldId, &dd, B3_DEFAULT_MASK_BITS );
}
} // namespace

EMSCRIPTEN_BINDINGS( box3d )
{
	// =====================================================================
	// Section 0 — base / version
	// =====================================================================
	value_object<b3Version>( "Version" )
		.field( "major", &b3Version::major )
		.field( "minor", &b3Version::minor )
		.field( "revision", &b3Version::revision );

	function( "b3GetVersion", &b3GetVersion );
	function( "b3IsDoublePrecision", &b3IsDoublePrecision );
	function( "b3GetByteCount", &b3GetByteCount );

	// =====================================================================
	// Section 1 — enums
	// =====================================================================
	enum_<b3BodyType>( "b3BodyType" )
		.value( "b3_staticBody", b3_staticBody )
		.value( "b3_kinematicBody", b3_kinematicBody )
		.value( "b3_dynamicBody", b3_dynamicBody );

	enum_<b3ShapeType>( "b3ShapeType" )
		.value( "b3_capsuleShape", b3_capsuleShape )
		.value( "b3_compoundShape", b3_compoundShape )
		.value( "b3_heightShape", b3_heightShape )
		.value( "b3_hullShape", b3_hullShape )
		.value( "b3_meshShape", b3_meshShape )
		.value( "b3_sphereShape", b3_sphereShape );

	enum_<b3JointType>( "b3JointType" )
		.value( "b3_parallelJoint", b3_parallelJoint )
		.value( "b3_distanceJoint", b3_distanceJoint )
		.value( "b3_filterJoint", b3_filterJoint )
		.value( "b3_motorJoint", b3_motorJoint )
		.value( "b3_prismaticJoint", b3_prismaticJoint )
		.value( "b3_revoluteJoint", b3_revoluteJoint )
		.value( "b3_sphericalJoint", b3_sphericalJoint )
		.value( "b3_weldJoint", b3_weldJoint )
		.value( "b3_wheelJoint", b3_wheelJoint );

	// =====================================================================
	// Section 2 — math value_objects
	// (float mode: b3Pos == b3Vec3, b3WorldTransform == b3Transform)
	// =====================================================================
	value_object<b3Vec3>( "b3Vec3" )
		.field( "x", &b3Vec3::x )
		.field( "y", &b3Vec3::y )
		.field( "z", &b3Vec3::z );

	value_object<b3Quat>( "b3Quat" )
		.field( "v", &b3Quat::v )
		.field( "s", &b3Quat::s );

	value_object<b3Transform>( "b3Transform" )
		.field( "p", &b3Transform::p )
		.field( "q", &b3Transform::q );

	value_object<b3AABB>( "b3AABB" )
		.field( "lowerBound", &b3AABB::lowerBound )
		.field( "upperBound", &b3AABB::upperBound );

	value_object<b3Plane>( "b3Plane" )
		.field( "normal", &b3Plane::normal )
		.field( "offset", &b3Plane::offset );

	// =====================================================================
	// Section 3 — id handle value_objects (opaque, passed by value)
	// =====================================================================
	value_object<b3WorldId>( "b3WorldId" )
		.field( "index1", &b3WorldId::index1 )
		.field( "generation", &b3WorldId::generation );

	value_object<b3BodyId>( "b3BodyId" )
		.field( "index1", &b3BodyId::index1 )
		.field( "world0", &b3BodyId::world0 )
		.field( "generation", &b3BodyId::generation );

	value_object<b3ShapeId>( "b3ShapeId" )
		.field( "index1", &b3ShapeId::index1 )
		.field( "world0", &b3ShapeId::world0 )
		.field( "generation", &b3ShapeId::generation );

	value_object<b3JointId>( "b3JointId" )
		.field( "index1", &b3JointId::index1 )
		.field( "world0", &b3JointId::world0 )
		.field( "generation", &b3JointId::generation );

	value_object<b3ContactId>( "b3ContactId" )
		.field( "index1", &b3ContactId::index1 )
		.field( "world0", &b3ContactId::world0 )
		.field( "padding", &b3ContactId::padding )
		.field( "generation", &b3ContactId::generation );

	// =====================================================================
	// Section 4a — geometry value_objects
	// =====================================================================
	value_object<b3Sphere>( "b3Sphere" )
		.field( "center", &b3Sphere::center )
		.field( "radius", &b3Sphere::radius );

	value_object<b3Capsule>( "b3Capsule" )
		.field( "center1", &b3Capsule::center1 )
		.field( "center2", &b3Capsule::center2 )
		.field( "radius", &b3Capsule::radius );

	// =====================================================================
	// Section 4b — supporting structs for the defs
	// =====================================================================
	value_object<b3MotionLocks>( "b3MotionLocks" )
		.field( "linearX", &b3MotionLocks::linearX )
		.field( "linearY", &b3MotionLocks::linearY )
		.field( "linearZ", &b3MotionLocks::linearZ )
		.field( "angularX", &b3MotionLocks::angularX )
		.field( "angularY", &b3MotionLocks::angularY )
		.field( "angularZ", &b3MotionLocks::angularZ );

	value_object<b3Filter>( "b3Filter" )
		.field( "categoryBits", &b3Filter::categoryBits )
		.field( "maskBits", &b3Filter::maskBits )
		.field( "groupIndex", &b3Filter::groupIndex );

	value_object<b3SurfaceMaterial>( "b3SurfaceMaterial" )
		.field( "friction", &b3SurfaceMaterial::friction )
		.field( "restitution", &b3SurfaceMaterial::restitution )
		.field( "rollingResistance", &b3SurfaceMaterial::rollingResistance )
		.field( "tangentVelocity", &b3SurfaceMaterial::tangentVelocity )
		.field( "userMaterialId", &b3SurfaceMaterial::userMaterialId )
		.field( "customColor", &b3SurfaceMaterial::customColor );

	value_object<b3Capacity>( "b3Capacity" )
		.field( "staticShapeCount", &b3Capacity::staticShapeCount )
		.field( "dynamicShapeCount", &b3Capacity::dynamicShapeCount )
		.field( "staticBodyCount", &b3Capacity::staticBodyCount )
		.field( "dynamicBodyCount", &b3Capacity::dynamicBodyCount )
		.field( "contactCount", &b3Capacity::contactCount );

	// =====================================================================
	// Section 4c — def structs.
	// Pointer/callback/userData fields are intentionally NOT registered: they
	// round-trip to null (the correct default). internalValue IS registered so
	// the validation magic set by b3Default*Def() survives the JS round-trip.
	// =====================================================================
	value_object<b3WorldDef>( "b3WorldDef" )
		.field( "gravity", &b3WorldDef::gravity )
		.field( "restitutionThreshold", &b3WorldDef::restitutionThreshold )
		.field( "hitEventThreshold", &b3WorldDef::hitEventThreshold )
		.field( "contactHertz", &b3WorldDef::contactHertz )
		.field( "contactDampingRatio", &b3WorldDef::contactDampingRatio )
		.field( "contactSpeed", &b3WorldDef::contactSpeed )
		.field( "maximumLinearSpeed", &b3WorldDef::maximumLinearSpeed )
		.field( "enableSleep", &b3WorldDef::enableSleep )
		.field( "enableContinuous", &b3WorldDef::enableContinuous )
		.field( "workerCount", &b3WorldDef::workerCount )
		.field( "capacity", &b3WorldDef::capacity )
		.field( "internalValue", &b3WorldDef::internalValue );

	value_object<b3BodyDef>( "b3BodyDef" )
		.field( "type", &b3BodyDef::type )
		.field( "position", &b3BodyDef::position )
		.field( "rotation", &b3BodyDef::rotation )
		.field( "linearVelocity", &b3BodyDef::linearVelocity )
		.field( "angularVelocity", &b3BodyDef::angularVelocity )
		.field( "linearDamping", &b3BodyDef::linearDamping )
		.field( "angularDamping", &b3BodyDef::angularDamping )
		.field( "gravityScale", &b3BodyDef::gravityScale )
		.field( "sleepThreshold", &b3BodyDef::sleepThreshold )
		.field( "motionLocks", &b3BodyDef::motionLocks )
		.field( "enableSleep", &b3BodyDef::enableSleep )
		.field( "isAwake", &b3BodyDef::isAwake )
		.field( "isBullet", &b3BodyDef::isBullet )
		.field( "isEnabled", &b3BodyDef::isEnabled )
		.field( "allowFastRotation", &b3BodyDef::allowFastRotation )
		.field( "enableContactRecycling", &b3BodyDef::enableContactRecycling )
		.field( "internalValue", &b3BodyDef::internalValue );

	value_object<b3ShapeDef>( "b3ShapeDef" )
		.field( "baseMaterial", &b3ShapeDef::baseMaterial )
		.field( "density", &b3ShapeDef::density )
		.field( "explosionScale", &b3ShapeDef::explosionScale )
		.field( "filter", &b3ShapeDef::filter )
		.field( "enableCustomFiltering", &b3ShapeDef::enableCustomFiltering )
		.field( "isSensor", &b3ShapeDef::isSensor )
		.field( "enableSensorEvents", &b3ShapeDef::enableSensorEvents )
		.field( "enableContactEvents", &b3ShapeDef::enableContactEvents )
		.field( "enableHitEvents", &b3ShapeDef::enableHitEvents )
		.field( "enablePreSolveEvents", &b3ShapeDef::enablePreSolveEvents )
		.field( "invokeContactCreation", &b3ShapeDef::invokeContactCreation )
		.field( "updateBodyMass", &b3ShapeDef::updateBodyMass )
		.field( "internalValue", &b3ShapeDef::internalValue );

	// default initializers (return fully-valid structs, incl. internalValue)
	function( "b3DefaultWorldDef", &b3DefaultWorldDef );
	function( "b3DefaultBodyDef", &b3DefaultBodyDef );
	function( "b3DefaultShapeDef", &b3DefaultShapeDef );
	function( "b3DefaultFilter", &b3DefaultFilter );
	function( "b3DefaultSurfaceMaterial", &b3DefaultSurfaceMaterial );

	// =====================================================================
	// Section 5 — world / body / shape lifecycle
	// =====================================================================

	// world
	function( "b3CreateWorld", +[]( b3WorldDef def ) { return b3CreateWorld( &def ); } );
	function( "b3DestroyWorld", &b3DestroyWorld );
	function( "b3World_IsValid", &b3World_IsValid );
	function( "b3World_Step", &b3World_Step );
	function( "b3World_SetGravity", &b3World_SetGravity );
	function( "b3World_GetGravity", &b3World_GetGravity );

	// =====================================================================
	// Section 5a2 — world tuning / counts / misc (direct binds)
	// =====================================================================
	function( "b3GetWorldCount", &b3GetWorldCount );
	function( "b3GetMaxWorldCount", &b3GetMaxWorldCount );
	function( "b3World_GetBounds", &b3World_GetBounds );
	function( "b3World_EnableSleeping", &b3World_EnableSleeping );
	function( "b3World_IsSleepingEnabled", &b3World_IsSleepingEnabled );
	function( "b3World_EnableContinuous", &b3World_EnableContinuous );
	function( "b3World_IsContinuousEnabled", &b3World_IsContinuousEnabled );
	function( "b3World_SetRestitutionThreshold", &b3World_SetRestitutionThreshold );
	function( "b3World_GetRestitutionThreshold", &b3World_GetRestitutionThreshold );
	function( "b3World_SetHitEventThreshold", &b3World_SetHitEventThreshold );
	function( "b3World_GetHitEventThreshold", &b3World_GetHitEventThreshold );
	function( "b3World_SetContactTuning", &b3World_SetContactTuning );
	function( "b3World_SetContactRecycleDistance", &b3World_SetContactRecycleDistance );
	function( "b3World_GetContactRecycleDistance", &b3World_GetContactRecycleDistance );
	function( "b3World_SetMaximumLinearSpeed", &b3World_SetMaximumLinearSpeed );
	function( "b3World_GetMaximumLinearSpeed", &b3World_GetMaximumLinearSpeed );
	function( "b3World_EnableWarmStarting", &b3World_EnableWarmStarting );
	function( "b3World_IsWarmStartingEnabled", &b3World_IsWarmStartingEnabled );
	function( "b3World_GetAwakeBodyCount", &b3World_GetAwakeBodyCount );
	function( "b3World_SetWorkerCount", &b3World_SetWorkerCount );
	function( "b3World_GetWorkerCount", &b3World_GetWorkerCount );
	function( "b3World_RebuildStaticTree", &b3World_RebuildStaticTree );
	function( "b3World_EnableSpeculative", &b3World_EnableSpeculative );
	function( "b3World_GetMaxCapacity", &b3World_GetMaxCapacity );
	function( "b3World_DumpShapeBounds", &b3World_DumpShapeBounds );

	// body
	function( "b3CreateBody", +[]( b3WorldId worldId, b3BodyDef def ) { return b3CreateBody( worldId, &def ); } );
	function( "b3DestroyBody", &b3DestroyBody );
	function( "b3Body_IsValid", &b3Body_IsValid );
	function( "b3Body_GetType", &b3Body_GetType );
	function( "b3Body_GetPosition", &b3Body_GetPosition );
	function( "b3Body_GetRotation", &b3Body_GetRotation );
	function( "b3Body_GetTransform", &b3Body_GetTransform );
	function( "b3Body_SetTransform", &b3Body_SetTransform );
	function( "b3Body_GetLinearVelocity", &b3Body_GetLinearVelocity );
	function( "b3Body_GetAngularVelocity", &b3Body_GetAngularVelocity );

	// shapes
	function( "b3CreateSphereShape",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3Sphere sphere ) { return b3CreateSphereShape( bodyId, &def, &sphere ); } );
	function( "b3CreateCapsuleShape",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3Capsule capsule ) { return b3CreateCapsuleShape( bodyId, &def, &capsule ); } );
	function( "b3Shape_IsValid", &b3Shape_IsValid );

	// Binding-side helper: build a box hull in C++ memory and create a hull
	// shape from it. b3BoxHull embeds a b3HullData with internal offsets that
	// cannot survive a JS value_object copy, so this must stay on the C++ side.
	function( "b3CreateBoxShape",
		+[]( b3BodyId bodyId, b3ShapeDef def, float hx, float hy, float hz )
		{
			b3BoxHull hull = b3MakeBoxHull( hx, hy, hz );
			return b3CreateHullShape( bodyId, &def, &hull.base );
		} );

	// Convex hulls are reusable *data*: compute the hull once (expensive) and
	// instance it into many shapes (cheap), mirroring box3d. b3HullData is an
	// opaque handle owned by JS — free it with b3DestroyHull when done.
	class_<b3HullData>( "b3HullData" );

	// b3CreateHull( Float32Array [x,y,z, ...] ). b3Vec3 is three packed floats,
	// so the float buffer aliases b3Vec3[] with no second copy.
	function( "b3CreateHull", +[]( val points ) -> b3HullData*
	{
		std::vector<float> f = convertJSArrayToNumberVector<float>( points );
		int count = (int)( f.size() / 3 );
		return b3CreateHull( reinterpret_cast<const b3Vec3*>( f.data() ), count, count );
	}, allow_raw_pointers() );
	function( "b3CreateCylinder", &b3CreateCylinder, allow_raw_pointers() );
	function( "b3CreateCone", &b3CreateCone, allow_raw_pointers() );
	function( "b3CreateRock", &b3CreateRock, allow_raw_pointers() );
	function( "b3CloneAndTransformHull", &b3CloneAndTransformHull, allow_raw_pointers() );
	function( "b3DestroyHull", &b3DestroyHull, allow_raw_pointers() );
	function( "b3CreateHullShape",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3HullData* hull ) { return b3CreateHullShape( bodyId, &def, hull ); },
		allow_raw_pointers() );
	// Hull vertices (local space) as a flat, zero-copy Float32Array — works on
	// any hull handle (e.g. to build render geometry).
	function( "b3GetHullVertices", +[]( const b3HullData* hull ) -> val
	{
		if ( hull == nullptr ) return val::global( "Float32Array" ).new_( 0 );
		return val( typed_memory_view( (size_t)hull->vertexCount * 3, reinterpret_cast<const float*>( b3GetHullPoints( hull ) ) ) );
	}, allow_raw_pointers() );

	// Triangle meshes are reusable data too (opaque handle, freed with b3DestroyMesh).
	// b3CreateMesh( Float32Array positions [x,y,z,...], Int32Array indices ).
	class_<b3MeshData>( "b3MeshData" );
	function( "b3CreateMesh", +[]( val positions, val indices ) -> b3MeshData*
	{
		std::vector<float> vf = convertJSArrayToNumberVector<float>( positions );
		std::vector<int32_t> vi = convertJSArrayToNumberVector<int32_t>( indices );
		b3MeshDef def = {};
		def.vertices = reinterpret_cast<b3Vec3*>( vf.data() );
		def.vertexCount = (int)( vf.size() / 3 );
		def.indices = vi.data();
		def.triangleCount = (int)( vi.size() / 3 );
		def.weldVertices = true;
		return b3CreateMesh( &def, nullptr, 0 );
	}, allow_raw_pointers() );
	function( "b3DestroyMesh", &b3DestroyMesh, allow_raw_pointers() );
	function( "b3CreateMeshShape",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3MeshData* mesh, b3Vec3 scale ) { return b3CreateMeshShape( bodyId, &def, mesh, scale ); },
		allow_raw_pointers() );

	// Compound shapes (opaque handle, freed with b3DestroyCompound). Built from a
	// JS spec: { spheres:[{sphere,material?}], capsules:[{capsule,material?}],
	//            hulls:[{hull,transform,material?}] }. Position/orientation lives
	// in each child's geometry (sphere.center, capsule.center1/2) or hull.transform.
	class_<b3CompoundData>( "b3CompoundData" );
	function( "b3CreateCompound", +[]( val spec ) -> b3CompoundData*
	{
		const b3SurfaceMaterial defMat = b3DefaultSurfaceMaterial();
		auto mat = [&]( val child ) -> b3SurfaceMaterial
		{
			val m = child["material"];
			return m.isUndefined() ? defMat : m.as<b3SurfaceMaterial>();
		};
		auto arrOf = [&]( const char* key ) -> val
		{
			val a = spec[key];
			return a.isUndefined() ? val::array() : a;
		};

		std::vector<b3CompoundSphereDef> spheres;
		val s = arrOf( "spheres" );
		for ( unsigned i = 0, n = s["length"].as<unsigned>(); i < n; ++i ) { val c = s[i]; spheres.push_back( { c["sphere"].as<b3Sphere>(), mat( c ) } ); }

		std::vector<b3CompoundCapsuleDef> capsules;
		val cap = arrOf( "capsules" );
		for ( unsigned i = 0, n = cap["length"].as<unsigned>(); i < n; ++i ) { val c = cap[i]; capsules.push_back( { c["capsule"].as<b3Capsule>(), mat( c ) } ); }

		std::vector<b3CompoundHullDef> hulls;
		val h = arrOf( "hulls" );
		for ( unsigned i = 0, n = h["length"].as<unsigned>(); i < n; ++i ) { val c = h[i]; hulls.push_back( { c["hull"].as<b3HullData*>( allow_raw_pointers() ), c["transform"].as<b3Transform>(), mat( c ) } ); }

		b3CompoundDef def = {};
		def.spheres = spheres.data();
		def.sphereCount = (int)spheres.size();
		def.capsules = capsules.data();
		def.capsuleCount = (int)capsules.size();
		def.hulls = hulls.data();
		def.hullCount = (int)hulls.size();
		return b3CreateCompound( &def );
	}, allow_raw_pointers() );
	function( "b3DestroyCompound", &b3DestroyCompound, allow_raw_pointers() );
	function( "b3CreateCompoundShape",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3CompoundData* compound ) { return b3CreateCompoundShape( bodyId, &def, compound ); },
		allow_raw_pointers() );

	// Height fields (terrain; static bodies only). `heights` is a countX*countZ
	// Float32Array of grid y-values; `scale` spaces the grid out in world units.
	class_<b3HeightFieldData>( "b3HeightFieldData" );
	function( "b3CreateHeightField", +[]( val heights, int countX, int countZ, b3Vec3 scale ) -> b3HeightFieldData*
	{
		std::vector<float> h = convertJSArrayToNumberVector<float>( heights );
		float mn = h.empty() ? 0.0f : h[0], mx = mn;
		for ( float v : h ) { mn = v < mn ? v : mn; mx = v > mx ? v : mx; }
		b3HeightFieldDef def = {};
		def.heights = h.data();
		def.scale = scale;
		def.countX = countX;
		def.countZ = countZ;
		def.globalMinimumHeight = mn;
		def.globalMaximumHeight = mx;
		return b3CreateHeightField( &def );
	}, allow_raw_pointers() );
	function( "b3DestroyHeightField", &b3DestroyHeightField, allow_raw_pointers() );
	function( "b3CreateHeightFieldShape",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3HeightFieldData* hf ) { return b3CreateHeightFieldShape( bodyId, &def, hf ); },
		allow_raw_pointers() );

	// --- mover queries: sweep/collide a capsule for character controllers ---
	value_object<b3PlaneResult>( "b3PlaneResult" )
		.field( "plane", &b3PlaneResult::plane )
		.field( "point", &b3PlaneResult::point );
	// CastMover: cb(shapeId)->bool filter; returns the clip fraction [0,1].
	function( "b3World_CastMover",
		+[]( b3WorldId worldId, b3Vec3 origin, b3Capsule mover, b3Vec3 translation, b3QueryFilter filter, val cb ) -> float
		{
			return b3World_CastMover( worldId, origin, &mover, translation, filter,
				[]( b3ShapeId shapeId, void* ctx ) -> bool
				{ val r = ( *static_cast<val*>( ctx ) )( shapeId ); return r.isUndefined() ? true : r.as<bool>(); },
				&cb );
		} );
	// CollideMover: cb(shapeId, planes[]) -> bool. planes are {plane, point} for
	// collide-and-slide resolution.
	function( "b3World_CollideMover", +[]( b3WorldId worldId, b3Vec3 origin, b3Capsule mover, b3QueryFilter filter, val cb )
	{
		b3World_CollideMover( worldId, origin, &mover, filter,
			[]( b3ShapeId shapeId, const b3PlaneResult* planes, int planeCount, void* ctx ) -> bool
			{
				val arr = val::array();
				for ( int i = 0; i < planeCount; ++i ) arr.call<void>( "push", val( planes[i] ) );
				val r = ( *static_cast<val*>( ctx ) )( shapeId, arr );
				return r.isUndefined() ? true : r.as<bool>();
			},
			&cb );
	} );

	// --- world statistics (counters). Fixed-array fields (colorCounts/
	// manifoldCounts) are omitted; the scalar counts are what tooling wants. ---
	value_object<b3Counters>( "b3Counters" )
		.field( "bodyCount", &b3Counters::bodyCount )
		.field( "shapeCount", &b3Counters::shapeCount )
		.field( "contactCount", &b3Counters::contactCount )
		.field( "jointCount", &b3Counters::jointCount )
		.field( "islandCount", &b3Counters::islandCount )
		.field( "stackUsed", &b3Counters::stackUsed )
		.field( "byteCount", &b3Counters::byteCount )
		.field( "taskCount", &b3Counters::taskCount )
		.field( "awakeContactCount", &b3Counters::awakeContactCount )
		.field( "treeHeight", &b3Counters::treeHeight )
		.field( "staticTreeHeight", &b3Counters::staticTreeHeight );
	function( "b3World_GetCounters", &b3World_GetCounters );

	// --- persistent world callbacks. These fire during b3World_Step for the
	// world's lifetime, so the JS function is heap-held (one small leak per set
	// call, which is once per world in practice). ---
	// Custom filter: cb(shapeIdA, shapeIdB) -> bool (false disables the pair).
	// Requires enableCustomFiltering on at least one of the two shapes.
	function( "b3World_SetCustomFilterCallback", +[]( b3WorldId worldId, val cb )
	{
		val* held = new val( cb );
		b3World_SetCustomFilterCallback( worldId,
			[]( b3ShapeId a, b3ShapeId b, void* ctx ) -> bool
			{ val r = ( *static_cast<val*>( ctx ) )( a, b ); return r.isUndefined() ? true : r.as<bool>(); },
			held );
	} );
	// Pre-solve: cb(shapeIdA, shapeIdB, point, normal) -> bool (false drops the
	// contact this step — e.g. one-way platforms). Runs on worker threads in MT.
	function( "b3World_SetPreSolveCallback", +[]( b3WorldId worldId, val cb )
	{
		val* held = new val( cb );
		b3World_SetPreSolveCallback( worldId,
			[]( b3ShapeId a, b3ShapeId b, b3Pos point, b3Vec3 normal, void* ctx ) -> bool
			{ val r = ( *static_cast<val*>( ctx ) )( a, b, point, normal ); return r.isUndefined() ? true : r.as<bool>(); },
			held );
	} );

	// =====================================================================
	// Section 10 — low-level collision (collision.h): GJK distance, convex
	// shape cast, and time of impact. Shapes are passed as point-cloud proxies
	// (Float32Array of local points + radius), matching b3ShapeProxy.
	// =====================================================================
	enum_<b3TOIState>( "b3TOIState" )
		.value( "b3_toiStateUnknown", b3_toiStateUnknown )
		.value( "b3_toiStateFailed", b3_toiStateFailed )
		.value( "b3_toiStateOverlapped", b3_toiStateOverlapped )
		.value( "b3_toiStateHit", b3_toiStateHit )
		.value( "b3_toiStateSeparated", b3_toiStateSeparated );

	value_object<b3DistanceOutput>( "b3DistanceOutput" )
		.field( "pointA", &b3DistanceOutput::pointA )
		.field( "pointB", &b3DistanceOutput::pointB )
		.field( "normal", &b3DistanceOutput::normal )
		.field( "distance", &b3DistanceOutput::distance )
		.field( "iterations", &b3DistanceOutput::iterations )
		.field( "simplexCount", &b3DistanceOutput::simplexCount );

	// b3CastOutput === b3WorldCastOutput in float mode (already registered).

	value_object<b3Sweep>( "b3Sweep" )
		.field( "localCenter", &b3Sweep::localCenter )
		.field( "c1", &b3Sweep::c1 )
		.field( "c2", &b3Sweep::c2 )
		.field( "q1", &b3Sweep::q1 )
		.field( "q2", &b3Sweep::q2 );

	value_object<b3TOIOutput>( "b3TOIOutput" )
		.field( "state", &b3TOIOutput::state )
		.field( "point", &b3TOIOutput::point )
		.field( "normal", &b3TOIOutput::normal )
		.field( "fraction", &b3TOIOutput::fraction )
		.field( "distance", &b3TOIOutput::distance )
		.field( "distanceIterations", &b3TOIOutput::distanceIterations )
		.field( "pushBackIterations", &b3TOIOutput::pushBackIterations )
		.field( "rootIterations", &b3TOIOutput::rootIterations )
		.field( "usedFallback", &b3TOIOutput::usedFallback );

	// GJK closest points/distance between two convex point clouds. transformB is
	// shape B's pose in shape A's frame.
	function( "b3ShapeDistance",
		+[]( val pointsA, float radiusA, val pointsB, float radiusB, b3Transform transformB, bool useRadii ) -> b3DistanceOutput
		{
			std::vector<float> fa = convertJSArrayToNumberVector<float>( pointsA );
			std::vector<float> fb = convertJSArrayToNumberVector<float>( pointsB );
			b3DistanceInput input = {};
			input.proxyA = { reinterpret_cast<const b3Vec3*>( fa.data() ), (int)( fa.size() / 3 ), radiusA };
			input.proxyB = { reinterpret_cast<const b3Vec3*>( fb.data() ), (int)( fb.size() / 3 ), radiusB };
			input.transform = transformB;
			input.useRadii = useRadii;
			b3SimplexCache cache = {};
			return b3ShapeDistance( &input, &cache, nullptr, 0 );
		} );

	// Convex cast of shape B (swept by translationB) against shape A.
	function( "b3ShapeCast",
		+[]( val pointsA, float radiusA, val pointsB, float radiusB, b3Transform transformB, b3Vec3 translationB, float maxFraction, bool canEncroach ) -> b3CastOutput
		{
			std::vector<float> fa = convertJSArrayToNumberVector<float>( pointsA );
			std::vector<float> fb = convertJSArrayToNumberVector<float>( pointsB );
			b3ShapeCastPairInput input = {};
			input.proxyA = { reinterpret_cast<const b3Vec3*>( fa.data() ), (int)( fa.size() / 3 ), radiusA };
			input.proxyB = { reinterpret_cast<const b3Vec3*>( fb.data() ), (int)( fb.size() / 3 ), radiusB };
			input.transform = transformB;
			input.translationB = translationB;
			input.maxFraction = maxFraction;
			input.canEncroach = canEncroach;
			return b3ShapeCast( &input );
		} );

	// Time of impact between two swept convex shapes.
	function( "b3TimeOfImpact",
		+[]( val pointsA, float radiusA, val pointsB, float radiusB, b3Sweep sweepA, b3Sweep sweepB, float maxFraction ) -> b3TOIOutput
		{
			std::vector<float> fa = convertJSArrayToNumberVector<float>( pointsA );
			std::vector<float> fb = convertJSArrayToNumberVector<float>( pointsB );
			b3TOIInput input = {};
			input.proxyA = { reinterpret_cast<const b3Vec3*>( fa.data() ), (int)( fa.size() / 3 ), radiusA };
			input.proxyB = { reinterpret_cast<const b3Vec3*>( fb.data() ), (int)( fb.size() / 3 ), radiusB };
			input.sweepA = sweepA;
			input.sweepB = sweepB;
			input.maxFraction = maxFraction;
			return b3TimeOfImpact( &input );
		} );

	// Compute mass-data / AABB of a primitive shape without attaching it to a body.
	function( "b3ComputeSphereMass", +[]( b3Sphere s, float density ) { return b3ComputeSphereMass( &s, density ); } );
	function( "b3ComputeCapsuleMass", +[]( b3Capsule c, float density ) { return b3ComputeCapsuleMass( &c, density ); } );
	function( "b3ComputeHullMass", +[]( b3HullData* h, float density ) { return b3ComputeHullMass( h, density ); }, allow_raw_pointers() );
	function( "b3ComputeSphereAABB", +[]( b3Sphere s, b3Transform t ) { return b3ComputeSphereAABB( &s, t ); } );
	function( "b3ComputeCapsuleAABB", +[]( b3Capsule c, b3Transform t ) { return b3ComputeCapsuleAABB( &c, t ); } );
	function( "b3ComputeHullAABB", +[]( b3HullData* h, b3Transform t ) { return b3ComputeHullAABB( h, t ); }, allow_raw_pointers() );

	// world timing profile (per-step milliseconds)
	value_object<b3Profile>( "b3Profile" )
		.field( "step", &b3Profile::step )
		.field( "pairs", &b3Profile::pairs )
		.field( "collide", &b3Profile::collide )
		.field( "solve", &b3Profile::solve )
		.field( "solverSetup", &b3Profile::solverSetup )
		.field( "constraints", &b3Profile::constraints )
		.field( "prepareConstraints", &b3Profile::prepareConstraints )
		.field( "integrateVelocities", &b3Profile::integrateVelocities )
		.field( "warmStart", &b3Profile::warmStart )
		.field( "solveImpulses", &b3Profile::solveImpulses )
		.field( "integratePositions", &b3Profile::integratePositions )
		.field( "relaxImpulses", &b3Profile::relaxImpulses )
		.field( "applyRestitution", &b3Profile::applyRestitution )
		.field( "storeImpulses", &b3Profile::storeImpulses )
		.field( "splitIslands", &b3Profile::splitIslands )
		.field( "transforms", &b3Profile::transforms )
		.field( "sensorHits", &b3Profile::sensorHits )
		.field( "jointEvents", &b3Profile::jointEvents )
		.field( "hitEvents", &b3Profile::hitEvents )
		.field( "refit", &b3Profile::refit )
		.field( "bullets", &b3Profile::bullets )
		.field( "sleepIslands", &b3Profile::sleepIslands )
		.field( "sensors", &b3Profile::sensors );
	function( "b3World_GetProfile", &b3World_GetProfile );

	// --- live contact / sensor data getters ---
	// Contacts as a JS array: { shapeIdA, shapeIdB, manifolds: [{ normal,
	// points: [{ anchorA, anchorB, separation }] }] }. Anchors are offsets from
	// each body's centre of mass, in world orientation.
	function( "b3Body_GetContactData", +[]( b3BodyId bodyId ) -> val
	{
		std::vector<b3ContactData> data( (size_t)b3Body_GetContactCapacity( bodyId ) );
		int n = data.empty() ? 0 : b3Body_GetContactData( bodyId, data.data(), (int)data.size() );
		return contactsToArray( data.data(), n );
	} );
	function( "b3Shape_GetContactData", +[]( b3ShapeId shapeId ) -> val
	{
		std::vector<b3ContactData> data( (size_t)b3Shape_GetContactCapacity( shapeId ) );
		int n = data.empty() ? 0 : b3Shape_GetContactData( shapeId, data.data(), (int)data.size() );
		return contactsToArray( data.data(), n );
	} );
	// sensor overlaps: JS array of visitor shape ids currently inside this sensor.
	function( "b3Shape_GetSensorData", +[]( b3ShapeId shapeId ) -> val
	{
		std::vector<b3ShapeId> ids( (size_t)b3Shape_GetSensorCapacity( shapeId ) );
		int n = ids.empty() ? 0 : b3Shape_GetSensorData( shapeId, ids.data(), (int)ids.size() );
		val arr = val::array();
		for ( int i = 0; i < n; ++i ) arr.call<void>( "push", val( ids[i] ) );
		return arr;
	} );

	// Explosion (radial impulse).
	value_object<b3ExplosionDef>( "b3ExplosionDef" )
		.field( "maskBits", &b3ExplosionDef::maskBits )
		.field( "position", &b3ExplosionDef::position )
		.field( "radius", &b3ExplosionDef::radius )
		.field( "falloff", &b3ExplosionDef::falloff )
		.field( "impulsePerArea", &b3ExplosionDef::impulsePerArea );
	function( "b3DefaultExplosionDef", &b3DefaultExplosionDef );
	function( "b3World_Explode", +[]( b3WorldId worldId, b3ExplosionDef def ) { b3World_Explode( worldId, &def ); } );

	// Proxy-based queries. A proxy is a convex point cloud + radius (sphere =
	// [center] r; box = 8 corners r=0). OverlapShape: cb(shapeId)->bool.
	// CastShape (SHAPECAST): cb(shapeId, point, normal, fraction)->number.
	function( "b3World_OverlapShape",
		+[]( b3WorldId worldId, b3Vec3 origin, val points, float radius, b3QueryFilter filter, val cb )
		{
			std::vector<float> f = convertJSArrayToNumberVector<float>( points );
			b3ShapeProxy proxy{ reinterpret_cast<const b3Vec3*>( f.data() ), (int)( f.size() / 3 ), radius };
			b3World_OverlapShape( worldId, origin, &proxy, filter,
				[]( b3ShapeId shapeId, void* ctx ) -> bool
				{
					val r = ( *static_cast<val*>( ctx ) )( shapeId );
					return r.isUndefined() ? true : r.as<bool>();
				},
				&cb );
		} );
	function( "b3World_CastShape",
		+[]( b3WorldId worldId, b3Vec3 origin, val points, float radius, b3Vec3 translation, b3QueryFilter filter, val cb )
		{
			std::vector<float> f = convertJSArrayToNumberVector<float>( points );
			b3ShapeProxy proxy{ reinterpret_cast<const b3Vec3*>( f.data() ), (int)( f.size() / 3 ), radius };
			b3World_CastShape( worldId, origin, &proxy, translation, filter,
				[]( b3ShapeId shapeId, b3Pos point, b3Vec3 normal, float fraction, uint64_t, int, int, void* ctx ) -> float
				{
					val r = ( *static_cast<val*>( ctx ) )( shapeId, point, normal, fraction );
					return r.isUndefined() ? 1.0f : r.as<float>();
				},
				&cb );
		} );

	register_vector<b3ShapeId>( "b3ShapeIdVector" );
	register_vector<b3JointId>( "b3JointIdVector" );

	// =====================================================================
	// Section 5b — full body API
	// =====================================================================
	function( "b3Body_SetType", &b3Body_SetType );
	function( "b3Body_SetName", +[]( b3BodyId bodyId, std::string name ) { b3Body_SetName( bodyId, name.c_str() ); } );
	function( "b3Body_GetName", +[]( b3BodyId bodyId ) { const char* n = b3Body_GetName( bodyId ); return std::string( n ? n : "" ); } );

	function( "b3Body_GetLocalPoint", &b3Body_GetLocalPoint );
	function( "b3Body_GetWorldPoint", &b3Body_GetWorldPoint );
	function( "b3Body_GetLocalVector", &b3Body_GetLocalVector );
	function( "b3Body_GetWorldVector", &b3Body_GetWorldVector );

	function( "b3Body_SetLinearVelocity", &b3Body_SetLinearVelocity );
	function( "b3Body_SetAngularVelocity", &b3Body_SetAngularVelocity );
	function( "b3Body_SetTargetTransform", &b3Body_SetTargetTransform );
	function( "b3Body_GetLocalPointVelocity", &b3Body_GetLocalPointVelocity );
	function( "b3Body_GetWorldPointVelocity", &b3Body_GetWorldPointVelocity );

	function( "b3Body_ApplyForce", &b3Body_ApplyForce );
	function( "b3Body_ApplyForceToCenter", &b3Body_ApplyForceToCenter );
	function( "b3Body_ApplyTorque", &b3Body_ApplyTorque );
	function( "b3Body_ApplyLinearImpulse", &b3Body_ApplyLinearImpulse );
	function( "b3Body_ApplyLinearImpulseToCenter", &b3Body_ApplyLinearImpulseToCenter );
	function( "b3Body_ApplyAngularImpulse", &b3Body_ApplyAngularImpulse );

	function( "b3Body_GetMass", &b3Body_GetMass );
	function( "b3Body_GetInverseMass", &b3Body_GetInverseMass );
	function( "b3Body_GetLocalCenterOfMass", &b3Body_GetLocalCenterOfMass );
	function( "b3Body_GetWorldCenterOfMass", &b3Body_GetWorldCenterOfMass );
	function( "b3Body_ApplyMassFromShapes", &b3Body_ApplyMassFromShapes );

	function( "b3Body_SetLinearDamping", &b3Body_SetLinearDamping );
	function( "b3Body_GetLinearDamping", &b3Body_GetLinearDamping );
	function( "b3Body_SetAngularDamping", &b3Body_SetAngularDamping );
	function( "b3Body_GetAngularDamping", &b3Body_GetAngularDamping );
	function( "b3Body_SetGravityScale", &b3Body_SetGravityScale );
	function( "b3Body_GetGravityScale", &b3Body_GetGravityScale );

	function( "b3Body_IsAwake", &b3Body_IsAwake );
	function( "b3Body_SetAwake", &b3Body_SetAwake );
	function( "b3Body_EnableSleep", &b3Body_EnableSleep );
	function( "b3Body_IsSleepEnabled", &b3Body_IsSleepEnabled );
	function( "b3Body_SetSleepThreshold", &b3Body_SetSleepThreshold );
	function( "b3Body_GetSleepThreshold", &b3Body_GetSleepThreshold );

	function( "b3Body_IsEnabled", &b3Body_IsEnabled );
	function( "b3Body_Disable", &b3Body_Disable );
	function( "b3Body_Enable", &b3Body_Enable );
	function( "b3Body_SetMotionLocks", &b3Body_SetMotionLocks );
	function( "b3Body_GetMotionLocks", &b3Body_GetMotionLocks );
	function( "b3Body_SetBullet", &b3Body_SetBullet );
	function( "b3Body_IsBullet", &b3Body_IsBullet );
	function( "b3Body_EnableContactRecycling", &b3Body_EnableContactRecycling );
	function( "b3Body_IsContactRecyclingEnabled", &b3Body_IsContactRecyclingEnabled );
	function( "b3Body_EnableHitEvents", &b3Body_EnableHitEvents );

	function( "b3Body_GetWorld", &b3Body_GetWorld );
	function( "b3Body_GetShapeCount", &b3Body_GetShapeCount );
	function( "b3Body_GetShapes", +[]( b3BodyId bodyId )
	{
		std::vector<b3ShapeId> out( (size_t)b3Body_GetShapeCount( bodyId ) );
		if ( !out.empty() ) b3Body_GetShapes( bodyId, out.data(), (int)out.size() );
		return out;
	} );
	function( "b3Body_GetJointCount", &b3Body_GetJointCount );
	function( "b3Body_GetJoints", +[]( b3BodyId bodyId )
	{
		std::vector<b3JointId> out( (size_t)b3Body_GetJointCount( bodyId ) );
		if ( !out.empty() ) b3Body_GetJoints( bodyId, out.data(), (int)out.size() );
		return out;
	} );
	function( "b3Body_ComputeAABB", &b3Body_ComputeAABB );

	// =====================================================================
	// Section 5c — full shape API
	// =====================================================================
	function( "b3Shape_GetType", &b3Shape_GetType );
	function( "b3Shape_GetBody", &b3Shape_GetBody );
	function( "b3Shape_GetWorld", &b3Shape_GetWorld );
	function( "b3Shape_IsSensor", &b3Shape_IsSensor );

	function( "b3Shape_SetDensity", &b3Shape_SetDensity );
	function( "b3Shape_GetDensity", &b3Shape_GetDensity );
	function( "b3Shape_SetFriction", &b3Shape_SetFriction );
	function( "b3Shape_GetFriction", &b3Shape_GetFriction );
	function( "b3Shape_SetRestitution", &b3Shape_SetRestitution );
	function( "b3Shape_GetRestitution", &b3Shape_GetRestitution );
	function( "b3Shape_SetSurfaceMaterial", &b3Shape_SetSurfaceMaterial );
	function( "b3Shape_GetSurfaceMaterial", &b3Shape_GetSurfaceMaterial );
	function( "b3Shape_GetFilter", &b3Shape_GetFilter );
	function( "b3Shape_SetFilter", &b3Shape_SetFilter );

	function( "b3Shape_EnableSensorEvents", &b3Shape_EnableSensorEvents );
	function( "b3Shape_AreSensorEventsEnabled", &b3Shape_AreSensorEventsEnabled );
	function( "b3Shape_EnableContactEvents", &b3Shape_EnableContactEvents );
	function( "b3Shape_AreContactEventsEnabled", &b3Shape_AreContactEventsEnabled );
	function( "b3Shape_EnablePreSolveEvents", &b3Shape_EnablePreSolveEvents );
	function( "b3Shape_ArePreSolveEventsEnabled", &b3Shape_ArePreSolveEventsEnabled );
	function( "b3Shape_EnableHitEvents", &b3Shape_EnableHitEvents );
	function( "b3Shape_AreHitEventsEnabled", &b3Shape_AreHitEventsEnabled );

	function( "b3Shape_GetSphere", &b3Shape_GetSphere );
	function( "b3Shape_GetCapsule", &b3Shape_GetCapsule );
	// Introspection helper: convex hull vertices as a flat, zero-copy Float32Array
	// [x0,y0,z0, x1,y1,z1, ...] in shape-local space (b3Vec3 is 3 contiguous
	// floats). One boundary crossing, no per-vertex marshaling. The view aliases
	// box3d memory — copy it (e.g. into geometry) before the shape changes.
	function( "b3Shape_GetHullVertices", +[]( b3ShapeId shapeId ) -> val
	{
		const b3HullData* hull = b3Shape_GetHull( shapeId );
		if ( hull == nullptr ) return val::global( "Float32Array" ).new_( 0 );
		const b3Vec3* pts = b3GetHullPoints( hull );
		return val( typed_memory_view( (size_t)hull->vertexCount * 3, reinterpret_cast<const float*>( pts ) ) );
	} );
	function( "b3Shape_SetSphere", +[]( b3ShapeId shapeId, b3Sphere sphere ) { b3Shape_SetSphere( shapeId, &sphere ); } );
	function( "b3Shape_SetCapsule", +[]( b3ShapeId shapeId, b3Capsule capsule ) { b3Shape_SetCapsule( shapeId, &capsule ); } );

	function( "b3Shape_GetAABB", &b3Shape_GetAABB );
	function( "b3Shape_GetClosestPoint", &b3Shape_GetClosestPoint );
	function( "b3Shape_ApplyWind", &b3Shape_ApplyWind );
	function( "b3DestroyShape", &b3DestroyShape );

	// =====================================================================
	// Section 5d — joints: base + 9 def value_objects, defaults, create,
	//              and the common b3Joint_* API. Per-joint-type accessors
	//              (b3RevoluteJoint_*, b3WheelJoint_*, ...) land next.
	// =====================================================================
	value_object<b3JointDef>( "b3JointDef" )
		.field( "bodyIdA", &b3JointDef::bodyIdA )
		.field( "bodyIdB", &b3JointDef::bodyIdB )
		.field( "localFrameA", &b3JointDef::localFrameA )
		.field( "localFrameB", &b3JointDef::localFrameB )
		.field( "forceThreshold", &b3JointDef::forceThreshold )
		.field( "torqueThreshold", &b3JointDef::torqueThreshold )
		.field( "constraintHertz", &b3JointDef::constraintHertz )
		.field( "constraintDampingRatio", &b3JointDef::constraintDampingRatio )
		.field( "drawScale", &b3JointDef::drawScale )
		.field( "collideConnected", &b3JointDef::collideConnected )
		.field( "internalValue", &b3JointDef::internalValue );

	value_object<b3DistanceJointDef>( "b3DistanceJointDef" )
		.field( "base", &b3DistanceJointDef::base )
		.field( "length", &b3DistanceJointDef::length )
		.field( "enableSpring", &b3DistanceJointDef::enableSpring )
		.field( "lowerSpringForce", &b3DistanceJointDef::lowerSpringForce )
		.field( "upperSpringForce", &b3DistanceJointDef::upperSpringForce )
		.field( "hertz", &b3DistanceJointDef::hertz )
		.field( "dampingRatio", &b3DistanceJointDef::dampingRatio )
		.field( "enableLimit", &b3DistanceJointDef::enableLimit )
		.field( "minLength", &b3DistanceJointDef::minLength )
		.field( "maxLength", &b3DistanceJointDef::maxLength )
		.field( "enableMotor", &b3DistanceJointDef::enableMotor )
		.field( "maxMotorForce", &b3DistanceJointDef::maxMotorForce )
		.field( "motorSpeed", &b3DistanceJointDef::motorSpeed );

	value_object<b3RevoluteJointDef>( "b3RevoluteJointDef" )
		.field( "base", &b3RevoluteJointDef::base )
		.field( "targetAngle", &b3RevoluteJointDef::targetAngle )
		.field( "enableSpring", &b3RevoluteJointDef::enableSpring )
		.field( "hertz", &b3RevoluteJointDef::hertz )
		.field( "dampingRatio", &b3RevoluteJointDef::dampingRatio )
		.field( "enableLimit", &b3RevoluteJointDef::enableLimit )
		.field( "lowerAngle", &b3RevoluteJointDef::lowerAngle )
		.field( "upperAngle", &b3RevoluteJointDef::upperAngle )
		.field( "enableMotor", &b3RevoluteJointDef::enableMotor )
		.field( "maxMotorTorque", &b3RevoluteJointDef::maxMotorTorque )
		.field( "motorSpeed", &b3RevoluteJointDef::motorSpeed );

	value_object<b3PrismaticJointDef>( "b3PrismaticJointDef" )
		.field( "base", &b3PrismaticJointDef::base )
		.field( "enableSpring", &b3PrismaticJointDef::enableSpring )
		.field( "hertz", &b3PrismaticJointDef::hertz )
		.field( "dampingRatio", &b3PrismaticJointDef::dampingRatio )
		.field( "targetTranslation", &b3PrismaticJointDef::targetTranslation )
		.field( "enableLimit", &b3PrismaticJointDef::enableLimit )
		.field( "lowerTranslation", &b3PrismaticJointDef::lowerTranslation )
		.field( "upperTranslation", &b3PrismaticJointDef::upperTranslation )
		.field( "enableMotor", &b3PrismaticJointDef::enableMotor )
		.field( "maxMotorForce", &b3PrismaticJointDef::maxMotorForce )
		.field( "motorSpeed", &b3PrismaticJointDef::motorSpeed );

	value_object<b3WheelJointDef>( "b3WheelJointDef" )
		.field( "base", &b3WheelJointDef::base )
		.field( "enableSuspensionSpring", &b3WheelJointDef::enableSuspensionSpring )
		.field( "suspensionHertz", &b3WheelJointDef::suspensionHertz )
		.field( "suspensionDampingRatio", &b3WheelJointDef::suspensionDampingRatio )
		.field( "enableSuspensionLimit", &b3WheelJointDef::enableSuspensionLimit )
		.field( "lowerSuspensionLimit", &b3WheelJointDef::lowerSuspensionLimit )
		.field( "upperSuspensionLimit", &b3WheelJointDef::upperSuspensionLimit )
		.field( "enableSpinMotor", &b3WheelJointDef::enableSpinMotor )
		.field( "maxSpinTorque", &b3WheelJointDef::maxSpinTorque )
		.field( "spinSpeed", &b3WheelJointDef::spinSpeed )
		.field( "enableSteering", &b3WheelJointDef::enableSteering )
		.field( "steeringHertz", &b3WheelJointDef::steeringHertz )
		.field( "steeringDampingRatio", &b3WheelJointDef::steeringDampingRatio )
		.field( "targetSteeringAngle", &b3WheelJointDef::targetSteeringAngle )
		.field( "maxSteeringTorque", &b3WheelJointDef::maxSteeringTorque )
		.field( "enableSteeringLimit", &b3WheelJointDef::enableSteeringLimit )
		.field( "lowerSteeringLimit", &b3WheelJointDef::lowerSteeringLimit )
		.field( "upperSteeringLimit", &b3WheelJointDef::upperSteeringLimit );

	value_object<b3WeldJointDef>( "b3WeldJointDef" )
		.field( "base", &b3WeldJointDef::base )
		.field( "linearHertz", &b3WeldJointDef::linearHertz )
		.field( "angularHertz", &b3WeldJointDef::angularHertz )
		.field( "linearDampingRatio", &b3WeldJointDef::linearDampingRatio )
		.field( "angularDampingRatio", &b3WeldJointDef::angularDampingRatio );

	value_object<b3SphericalJointDef>( "b3SphericalJointDef" )
		.field( "base", &b3SphericalJointDef::base )
		.field( "enableSpring", &b3SphericalJointDef::enableSpring )
		.field( "hertz", &b3SphericalJointDef::hertz )
		.field( "dampingRatio", &b3SphericalJointDef::dampingRatio )
		.field( "targetRotation", &b3SphericalJointDef::targetRotation )
		.field( "enableConeLimit", &b3SphericalJointDef::enableConeLimit )
		.field( "coneAngle", &b3SphericalJointDef::coneAngle )
		.field( "enableTwistLimit", &b3SphericalJointDef::enableTwistLimit )
		.field( "lowerTwistAngle", &b3SphericalJointDef::lowerTwistAngle )
		.field( "upperTwistAngle", &b3SphericalJointDef::upperTwistAngle )
		.field( "enableMotor", &b3SphericalJointDef::enableMotor )
		.field( "maxMotorTorque", &b3SphericalJointDef::maxMotorTorque )
		.field( "motorVelocity", &b3SphericalJointDef::motorVelocity );

	value_object<b3MotorJointDef>( "b3MotorJointDef" )
		.field( "base", &b3MotorJointDef::base )
		.field( "linearVelocity", &b3MotorJointDef::linearVelocity )
		.field( "maxVelocityForce", &b3MotorJointDef::maxVelocityForce )
		.field( "angularVelocity", &b3MotorJointDef::angularVelocity )
		.field( "maxVelocityTorque", &b3MotorJointDef::maxVelocityTorque )
		.field( "linearHertz", &b3MotorJointDef::linearHertz )
		.field( "linearDampingRatio", &b3MotorJointDef::linearDampingRatio )
		.field( "maxSpringForce", &b3MotorJointDef::maxSpringForce )
		.field( "angularHertz", &b3MotorJointDef::angularHertz )
		.field( "angularDampingRatio", &b3MotorJointDef::angularDampingRatio )
		.field( "maxSpringTorque", &b3MotorJointDef::maxSpringTorque );

	value_object<b3ParallelJointDef>( "b3ParallelJointDef" )
		.field( "base", &b3ParallelJointDef::base )
		.field( "hertz", &b3ParallelJointDef::hertz )
		.field( "dampingRatio", &b3ParallelJointDef::dampingRatio )
		.field( "maxTorque", &b3ParallelJointDef::maxTorque );

	value_object<b3FilterJointDef>( "b3FilterJointDef" )
		.field( "base", &b3FilterJointDef::base );

	function( "b3DefaultDistanceJointDef", &b3DefaultDistanceJointDef );
	function( "b3DefaultRevoluteJointDef", &b3DefaultRevoluteJointDef );
	function( "b3DefaultPrismaticJointDef", &b3DefaultPrismaticJointDef );
	function( "b3DefaultWheelJointDef", &b3DefaultWheelJointDef );
	function( "b3DefaultWeldJointDef", &b3DefaultWeldJointDef );
	function( "b3DefaultSphericalJointDef", &b3DefaultSphericalJointDef );
	function( "b3DefaultMotorJointDef", &b3DefaultMotorJointDef );
	function( "b3DefaultParallelJointDef", &b3DefaultParallelJointDef );
	function( "b3DefaultFilterJointDef", &b3DefaultFilterJointDef );

	function( "b3CreateDistanceJoint", +[]( b3WorldId w, b3DistanceJointDef d ) { return b3CreateDistanceJoint( w, &d ); } );
	function( "b3CreateRevoluteJoint", +[]( b3WorldId w, b3RevoluteJointDef d ) { return b3CreateRevoluteJoint( w, &d ); } );
	function( "b3CreatePrismaticJoint", +[]( b3WorldId w, b3PrismaticJointDef d ) { return b3CreatePrismaticJoint( w, &d ); } );
	function( "b3CreateWheelJoint", +[]( b3WorldId w, b3WheelJointDef d ) { return b3CreateWheelJoint( w, &d ); } );
	function( "b3CreateWeldJoint", +[]( b3WorldId w, b3WeldJointDef d ) { return b3CreateWeldJoint( w, &d ); } );
	function( "b3CreateSphericalJoint", +[]( b3WorldId w, b3SphericalJointDef d ) { return b3CreateSphericalJoint( w, &d ); } );
	function( "b3CreateMotorJoint", +[]( b3WorldId w, b3MotorJointDef d ) { return b3CreateMotorJoint( w, &d ); } );
	function( "b3CreateParallelJoint", +[]( b3WorldId w, b3ParallelJointDef d ) { return b3CreateParallelJoint( w, &d ); } );
	function( "b3CreateFilterJoint", +[]( b3WorldId w, b3FilterJointDef d ) { return b3CreateFilterJoint( w, &d ); } );

	function( "b3DestroyJoint", &b3DestroyJoint );
	function( "b3Joint_IsValid", &b3Joint_IsValid );
	function( "b3Joint_GetType", &b3Joint_GetType );
	function( "b3Joint_GetBodyA", &b3Joint_GetBodyA );
	function( "b3Joint_GetBodyB", &b3Joint_GetBodyB );
	function( "b3Joint_GetWorld", &b3Joint_GetWorld );
	function( "b3Joint_SetLocalFrameA", &b3Joint_SetLocalFrameA );
	function( "b3Joint_GetLocalFrameA", &b3Joint_GetLocalFrameA );
	function( "b3Joint_SetLocalFrameB", &b3Joint_SetLocalFrameB );
	function( "b3Joint_GetLocalFrameB", &b3Joint_GetLocalFrameB );
	function( "b3Joint_SetCollideConnected", &b3Joint_SetCollideConnected );
	function( "b3Joint_GetCollideConnected", &b3Joint_GetCollideConnected );
	function( "b3Joint_WakeBodies", &b3Joint_WakeBodies );
	function( "b3Joint_GetConstraintForce", &b3Joint_GetConstraintForce );
	function( "b3Joint_GetConstraintTorque", &b3Joint_GetConstraintTorque );
	function( "b3Joint_GetLinearSeparation", &b3Joint_GetLinearSeparation );
	function( "b3Joint_GetAngularSeparation", &b3Joint_GetAngularSeparation );
	function( "b3Joint_SetConstraintTuning", &b3Joint_SetConstraintTuning );
	function( "b3Joint_SetForceThreshold", &b3Joint_SetForceThreshold );
	function( "b3Joint_GetForceThreshold", &b3Joint_GetForceThreshold );
	function( "b3Joint_SetTorqueThreshold", &b3Joint_SetTorqueThreshold );
	function( "b3Joint_GetTorqueThreshold", &b3Joint_GetTorqueThreshold );

	// =====================================================================
	// =====================================================================
	// Section 5e — per-joint-type accessors (all direct binds)
	// =====================================================================
	// parallel joint
	function( "b3ParallelJoint_SetSpringHertz", &b3ParallelJoint_SetSpringHertz );
	function( "b3ParallelJoint_SetSpringDampingRatio", &b3ParallelJoint_SetSpringDampingRatio );
	function( "b3ParallelJoint_GetSpringHertz", &b3ParallelJoint_GetSpringHertz );
	function( "b3ParallelJoint_GetSpringDampingRatio", &b3ParallelJoint_GetSpringDampingRatio );
	function( "b3ParallelJoint_SetMaxTorque", &b3ParallelJoint_SetMaxTorque );
	function( "b3ParallelJoint_GetMaxTorque", &b3ParallelJoint_GetMaxTorque );

	// distance joint
	function( "b3DistanceJoint_SetLength", &b3DistanceJoint_SetLength );
	function( "b3DistanceJoint_GetLength", &b3DistanceJoint_GetLength );
	function( "b3DistanceJoint_EnableSpring", &b3DistanceJoint_EnableSpring );
	function( "b3DistanceJoint_IsSpringEnabled", &b3DistanceJoint_IsSpringEnabled );
	function( "b3DistanceJoint_SetSpringForceRange", &b3DistanceJoint_SetSpringForceRange );
	function( "b3DistanceJoint_GetSpringForceRange", +[]( b3JointId jointId )
	{
		float lowerForce = 0.0f, upperForce = 0.0f;
		b3DistanceJoint_GetSpringForceRange( jointId, &lowerForce, &upperForce );
		val out = val::object();
		out.set( "lowerForce", lowerForce );
		out.set( "upperForce", upperForce );
		return out;
	} );
	function( "b3DistanceJoint_SetSpringHertz", &b3DistanceJoint_SetSpringHertz );
	function( "b3DistanceJoint_SetSpringDampingRatio", &b3DistanceJoint_SetSpringDampingRatio );
	function( "b3DistanceJoint_GetSpringHertz", &b3DistanceJoint_GetSpringHertz );
	function( "b3DistanceJoint_GetSpringDampingRatio", &b3DistanceJoint_GetSpringDampingRatio );
	function( "b3DistanceJoint_EnableLimit", &b3DistanceJoint_EnableLimit );
	function( "b3DistanceJoint_IsLimitEnabled", &b3DistanceJoint_IsLimitEnabled );
	function( "b3DistanceJoint_SetLengthRange", &b3DistanceJoint_SetLengthRange );
	function( "b3DistanceJoint_GetMinLength", &b3DistanceJoint_GetMinLength );
	function( "b3DistanceJoint_GetMaxLength", &b3DistanceJoint_GetMaxLength );
	function( "b3DistanceJoint_GetCurrentLength", &b3DistanceJoint_GetCurrentLength );
	function( "b3DistanceJoint_EnableMotor", &b3DistanceJoint_EnableMotor );
	function( "b3DistanceJoint_IsMotorEnabled", &b3DistanceJoint_IsMotorEnabled );
	function( "b3DistanceJoint_SetMotorSpeed", &b3DistanceJoint_SetMotorSpeed );
	function( "b3DistanceJoint_GetMotorSpeed", &b3DistanceJoint_GetMotorSpeed );
	function( "b3DistanceJoint_SetMaxMotorForce", &b3DistanceJoint_SetMaxMotorForce );
	function( "b3DistanceJoint_GetMaxMotorForce", &b3DistanceJoint_GetMaxMotorForce );
	function( "b3DistanceJoint_GetMotorForce", &b3DistanceJoint_GetMotorForce );

	// motor joint
	function( "b3MotorJoint_SetLinearVelocity", &b3MotorJoint_SetLinearVelocity );
	function( "b3MotorJoint_GetLinearVelocity", &b3MotorJoint_GetLinearVelocity );
	function( "b3MotorJoint_SetAngularVelocity", &b3MotorJoint_SetAngularVelocity );
	function( "b3MotorJoint_GetAngularVelocity", &b3MotorJoint_GetAngularVelocity );
	function( "b3MotorJoint_SetMaxVelocityForce", &b3MotorJoint_SetMaxVelocityForce );
	function( "b3MotorJoint_GetMaxVelocityForce", &b3MotorJoint_GetMaxVelocityForce );
	function( "b3MotorJoint_SetMaxVelocityTorque", &b3MotorJoint_SetMaxVelocityTorque );
	function( "b3MotorJoint_GetMaxVelocityTorque", &b3MotorJoint_GetMaxVelocityTorque );
	function( "b3MotorJoint_SetLinearHertz", &b3MotorJoint_SetLinearHertz );
	function( "b3MotorJoint_GetLinearHertz", &b3MotorJoint_GetLinearHertz );
	function( "b3MotorJoint_SetLinearDampingRatio", &b3MotorJoint_SetLinearDampingRatio );
	function( "b3MotorJoint_GetLinearDampingRatio", &b3MotorJoint_GetLinearDampingRatio );
	function( "b3MotorJoint_SetAngularHertz", &b3MotorJoint_SetAngularHertz );
	function( "b3MotorJoint_GetAngularHertz", &b3MotorJoint_GetAngularHertz );
	function( "b3MotorJoint_SetAngularDampingRatio", &b3MotorJoint_SetAngularDampingRatio );
	function( "b3MotorJoint_GetAngularDampingRatio", &b3MotorJoint_GetAngularDampingRatio );
	function( "b3MotorJoint_SetMaxSpringForce", &b3MotorJoint_SetMaxSpringForce );
	function( "b3MotorJoint_GetMaxSpringForce", &b3MotorJoint_GetMaxSpringForce );
	function( "b3MotorJoint_SetMaxSpringTorque", &b3MotorJoint_SetMaxSpringTorque );
	function( "b3MotorJoint_GetMaxSpringTorque", &b3MotorJoint_GetMaxSpringTorque );

	// prismatic joint
	function( "b3PrismaticJoint_EnableSpring", &b3PrismaticJoint_EnableSpring );
	function( "b3PrismaticJoint_IsSpringEnabled", &b3PrismaticJoint_IsSpringEnabled );
	function( "b3PrismaticJoint_SetSpringHertz", &b3PrismaticJoint_SetSpringHertz );
	function( "b3PrismaticJoint_GetSpringHertz", &b3PrismaticJoint_GetSpringHertz );
	function( "b3PrismaticJoint_SetSpringDampingRatio", &b3PrismaticJoint_SetSpringDampingRatio );
	function( "b3PrismaticJoint_GetSpringDampingRatio", &b3PrismaticJoint_GetSpringDampingRatio );
	function( "b3PrismaticJoint_SetTargetTranslation", &b3PrismaticJoint_SetTargetTranslation );
	function( "b3PrismaticJoint_GetTargetTranslation", &b3PrismaticJoint_GetTargetTranslation );
	function( "b3PrismaticJoint_EnableLimit", &b3PrismaticJoint_EnableLimit );
	function( "b3PrismaticJoint_IsLimitEnabled", &b3PrismaticJoint_IsLimitEnabled );
	function( "b3PrismaticJoint_GetLowerLimit", &b3PrismaticJoint_GetLowerLimit );
	function( "b3PrismaticJoint_GetUpperLimit", &b3PrismaticJoint_GetUpperLimit );
	function( "b3PrismaticJoint_SetLimits", &b3PrismaticJoint_SetLimits );
	function( "b3PrismaticJoint_EnableMotor", &b3PrismaticJoint_EnableMotor );
	function( "b3PrismaticJoint_IsMotorEnabled", &b3PrismaticJoint_IsMotorEnabled );
	function( "b3PrismaticJoint_SetMotorSpeed", &b3PrismaticJoint_SetMotorSpeed );
	function( "b3PrismaticJoint_GetMotorSpeed", &b3PrismaticJoint_GetMotorSpeed );
	function( "b3PrismaticJoint_SetMaxMotorForce", &b3PrismaticJoint_SetMaxMotorForce );
	function( "b3PrismaticJoint_GetMaxMotorForce", &b3PrismaticJoint_GetMaxMotorForce );
	function( "b3PrismaticJoint_GetMotorForce", &b3PrismaticJoint_GetMotorForce );
	function( "b3PrismaticJoint_GetTranslation", &b3PrismaticJoint_GetTranslation );
	function( "b3PrismaticJoint_GetSpeed", &b3PrismaticJoint_GetSpeed );

	// revolute joint
	function( "b3RevoluteJoint_EnableSpring", &b3RevoluteJoint_EnableSpring );
	function( "b3RevoluteJoint_IsSpringEnabled", &b3RevoluteJoint_IsSpringEnabled );
	function( "b3RevoluteJoint_SetSpringHertz", &b3RevoluteJoint_SetSpringHertz );
	function( "b3RevoluteJoint_GetSpringHertz", &b3RevoluteJoint_GetSpringHertz );
	function( "b3RevoluteJoint_SetSpringDampingRatio", &b3RevoluteJoint_SetSpringDampingRatio );
	function( "b3RevoluteJoint_GetSpringDampingRatio", &b3RevoluteJoint_GetSpringDampingRatio );
	function( "b3RevoluteJoint_SetTargetAngle", &b3RevoluteJoint_SetTargetAngle );
	function( "b3RevoluteJoint_GetTargetAngle", &b3RevoluteJoint_GetTargetAngle );
	function( "b3RevoluteJoint_GetAngle", &b3RevoluteJoint_GetAngle );
	function( "b3RevoluteJoint_EnableLimit", &b3RevoluteJoint_EnableLimit );
	function( "b3RevoluteJoint_IsLimitEnabled", &b3RevoluteJoint_IsLimitEnabled );
	function( "b3RevoluteJoint_GetLowerLimit", &b3RevoluteJoint_GetLowerLimit );
	function( "b3RevoluteJoint_GetUpperLimit", &b3RevoluteJoint_GetUpperLimit );
	function( "b3RevoluteJoint_SetLimits", &b3RevoluteJoint_SetLimits );
	function( "b3RevoluteJoint_EnableMotor", &b3RevoluteJoint_EnableMotor );
	function( "b3RevoluteJoint_IsMotorEnabled", &b3RevoluteJoint_IsMotorEnabled );
	function( "b3RevoluteJoint_SetMotorSpeed", &b3RevoluteJoint_SetMotorSpeed );
	function( "b3RevoluteJoint_GetMotorSpeed", &b3RevoluteJoint_GetMotorSpeed );
	function( "b3RevoluteJoint_GetMotorTorque", &b3RevoluteJoint_GetMotorTorque );
	function( "b3RevoluteJoint_SetMaxMotorTorque", &b3RevoluteJoint_SetMaxMotorTorque );
	function( "b3RevoluteJoint_GetMaxMotorTorque", &b3RevoluteJoint_GetMaxMotorTorque );

	// spherical joint
	function( "b3SphericalJoint_EnableConeLimit", &b3SphericalJoint_EnableConeLimit );
	function( "b3SphericalJoint_IsConeLimitEnabled", &b3SphericalJoint_IsConeLimitEnabled );
	function( "b3SphericalJoint_GetConeLimit", &b3SphericalJoint_GetConeLimit );
	function( "b3SphericalJoint_SetConeLimit", &b3SphericalJoint_SetConeLimit );
	function( "b3SphericalJoint_GetConeAngle", &b3SphericalJoint_GetConeAngle );
	function( "b3SphericalJoint_EnableTwistLimit", &b3SphericalJoint_EnableTwistLimit );
	function( "b3SphericalJoint_IsTwistLimitEnabled", &b3SphericalJoint_IsTwistLimitEnabled );
	function( "b3SphericalJoint_GetLowerTwistLimit", &b3SphericalJoint_GetLowerTwistLimit );
	function( "b3SphericalJoint_GetUpperTwistLimit", &b3SphericalJoint_GetUpperTwistLimit );
	function( "b3SphericalJoint_SetTwistLimits", &b3SphericalJoint_SetTwistLimits );
	function( "b3SphericalJoint_GetTwistAngle", &b3SphericalJoint_GetTwistAngle );
	function( "b3SphericalJoint_EnableSpring", &b3SphericalJoint_EnableSpring );
	function( "b3SphericalJoint_IsSpringEnabled", &b3SphericalJoint_IsSpringEnabled );
	function( "b3SphericalJoint_SetSpringHertz", &b3SphericalJoint_SetSpringHertz );
	function( "b3SphericalJoint_GetSpringHertz", &b3SphericalJoint_GetSpringHertz );
	function( "b3SphericalJoint_SetSpringDampingRatio", &b3SphericalJoint_SetSpringDampingRatio );
	function( "b3SphericalJoint_GetSpringDampingRatio", &b3SphericalJoint_GetSpringDampingRatio );
	function( "b3SphericalJoint_SetTargetRotation", &b3SphericalJoint_SetTargetRotation );
	function( "b3SphericalJoint_GetTargetRotation", &b3SphericalJoint_GetTargetRotation );
	function( "b3SphericalJoint_EnableMotor", &b3SphericalJoint_EnableMotor );
	function( "b3SphericalJoint_IsMotorEnabled", &b3SphericalJoint_IsMotorEnabled );
	function( "b3SphericalJoint_SetMotorVelocity", &b3SphericalJoint_SetMotorVelocity );
	function( "b3SphericalJoint_GetMotorVelocity", &b3SphericalJoint_GetMotorVelocity );
	function( "b3SphericalJoint_GetMotorTorque", &b3SphericalJoint_GetMotorTorque );
	function( "b3SphericalJoint_SetMaxMotorTorque", &b3SphericalJoint_SetMaxMotorTorque );
	function( "b3SphericalJoint_GetMaxMotorTorque", &b3SphericalJoint_GetMaxMotorTorque );

	// weld joint
	function( "b3WeldJoint_SetLinearHertz", &b3WeldJoint_SetLinearHertz );
	function( "b3WeldJoint_GetLinearHertz", &b3WeldJoint_GetLinearHertz );
	function( "b3WeldJoint_SetLinearDampingRatio", &b3WeldJoint_SetLinearDampingRatio );
	function( "b3WeldJoint_GetLinearDampingRatio", &b3WeldJoint_GetLinearDampingRatio );
	function( "b3WeldJoint_SetAngularHertz", &b3WeldJoint_SetAngularHertz );
	function( "b3WeldJoint_GetAngularHertz", &b3WeldJoint_GetAngularHertz );
	function( "b3WeldJoint_SetAngularDampingRatio", &b3WeldJoint_SetAngularDampingRatio );
	function( "b3WeldJoint_GetAngularDampingRatio", &b3WeldJoint_GetAngularDampingRatio );

	// wheel joint
	function( "b3WheelJoint_EnableSuspension", &b3WheelJoint_EnableSuspension );
	function( "b3WheelJoint_IsSuspensionEnabled", &b3WheelJoint_IsSuspensionEnabled );
	function( "b3WheelJoint_SetSuspensionHertz", &b3WheelJoint_SetSuspensionHertz );
	function( "b3WheelJoint_GetSuspensionHertz", &b3WheelJoint_GetSuspensionHertz );
	function( "b3WheelJoint_SetSuspensionDampingRatio", &b3WheelJoint_SetSuspensionDampingRatio );
	function( "b3WheelJoint_GetSuspensionDampingRatio", &b3WheelJoint_GetSuspensionDampingRatio );
	function( "b3WheelJoint_EnableSuspensionLimit", &b3WheelJoint_EnableSuspensionLimit );
	function( "b3WheelJoint_IsSuspensionLimitEnabled", &b3WheelJoint_IsSuspensionLimitEnabled );
	function( "b3WheelJoint_GetLowerSuspensionLimit", &b3WheelJoint_GetLowerSuspensionLimit );
	function( "b3WheelJoint_GetUpperSuspensionLimit", &b3WheelJoint_GetUpperSuspensionLimit );
	function( "b3WheelJoint_SetSuspensionLimits", &b3WheelJoint_SetSuspensionLimits );
	function( "b3WheelJoint_EnableSpinMotor", &b3WheelJoint_EnableSpinMotor );
	function( "b3WheelJoint_IsSpinMotorEnabled", &b3WheelJoint_IsSpinMotorEnabled );
	function( "b3WheelJoint_SetSpinMotorSpeed", &b3WheelJoint_SetSpinMotorSpeed );
	function( "b3WheelJoint_GetSpinMotorSpeed", &b3WheelJoint_GetSpinMotorSpeed );
	function( "b3WheelJoint_SetMaxSpinTorque", &b3WheelJoint_SetMaxSpinTorque );
	function( "b3WheelJoint_GetMaxSpinTorque", &b3WheelJoint_GetMaxSpinTorque );
	function( "b3WheelJoint_GetSpinSpeed", &b3WheelJoint_GetSpinSpeed );
	function( "b3WheelJoint_GetSpinTorque", &b3WheelJoint_GetSpinTorque );
	function( "b3WheelJoint_EnableSteering", &b3WheelJoint_EnableSteering );
	function( "b3WheelJoint_IsSteeringEnabled", &b3WheelJoint_IsSteeringEnabled );
	function( "b3WheelJoint_SetSteeringHertz", &b3WheelJoint_SetSteeringHertz );
	function( "b3WheelJoint_GetSteeringHertz", &b3WheelJoint_GetSteeringHertz );
	function( "b3WheelJoint_SetSteeringDampingRatio", &b3WheelJoint_SetSteeringDampingRatio );
	function( "b3WheelJoint_GetSteeringDampingRatio", &b3WheelJoint_GetSteeringDampingRatio );
	function( "b3WheelJoint_SetMaxSteeringTorque", &b3WheelJoint_SetMaxSteeringTorque );
	function( "b3WheelJoint_GetMaxSteeringTorque", &b3WheelJoint_GetMaxSteeringTorque );
	function( "b3WheelJoint_EnableSteeringLimit", &b3WheelJoint_EnableSteeringLimit );
	function( "b3WheelJoint_IsSteeringLimitEnabled", &b3WheelJoint_IsSteeringLimitEnabled );
	function( "b3WheelJoint_GetLowerSteeringLimit", &b3WheelJoint_GetLowerSteeringLimit );
	function( "b3WheelJoint_GetUpperSteeringLimit", &b3WheelJoint_GetUpperSteeringLimit );
	function( "b3WheelJoint_SetSteeringLimits", &b3WheelJoint_SetSteeringLimits );
	function( "b3WheelJoint_SetTargetSteeringAngle", &b3WheelJoint_SetTargetSteeringAngle );
	function( "b3WheelJoint_GetTargetSteeringAngle", &b3WheelJoint_GetTargetSteeringAngle );
	function( "b3WheelJoint_GetSteeringAngle", &b3WheelJoint_GetSteeringAngle );
	function( "b3WheelJoint_GetSteeringTorque", &b3WheelJoint_GetSteeringTorque );
	// Section 6  — collision.h               (M3) ... TODO
	// Section 7  — math helpers              (M3) ... TODO
	// =====================================================================

	// =====================================================================
	// Section 5f — query / mass structs + the non-callback functions using them
	// =====================================================================
	value_object<b3Matrix3>( "b3Matrix3" )
		.field( "cx", &b3Matrix3::cx )
		.field( "cy", &b3Matrix3::cy )
		.field( "cz", &b3Matrix3::cz );

	value_object<b3MassData>( "b3MassData" )
		.field( "mass", &b3MassData::mass )
		.field( "center", &b3MassData::center )
		.field( "inertia", &b3MassData::inertia );

	value_object<b3QueryFilter>( "b3QueryFilter" )
		.field( "categoryBits", &b3QueryFilter::categoryBits )
		.field( "maskBits", &b3QueryFilter::maskBits )
		.field( "id", &b3QueryFilter::id );

	value_object<b3RayResult>( "b3RayResult" )
		.field( "shapeId", &b3RayResult::shapeId )
		.field( "point", &b3RayResult::point )
		.field( "normal", &b3RayResult::normal )
		.field( "userMaterialId", &b3RayResult::userMaterialId )
		.field( "fraction", &b3RayResult::fraction )
		.field( "triangleIndex", &b3RayResult::triangleIndex )
		.field( "childIndex", &b3RayResult::childIndex )
		.field( "nodeVisits", &b3RayResult::nodeVisits )
		.field( "leafVisits", &b3RayResult::leafVisits )
		.field( "hit", &b3RayResult::hit );

	value_object<b3WorldCastOutput>( "b3WorldCastOutput" )
		.field( "normal", &b3WorldCastOutput::normal )
		.field( "point", &b3WorldCastOutput::point )
		.field( "fraction", &b3WorldCastOutput::fraction )
		.field( "iterations", &b3WorldCastOutput::iterations )
		.field( "triangleIndex", &b3WorldCastOutput::triangleIndex )
		.field( "childIndex", &b3WorldCastOutput::childIndex )
		.field( "materialIndex", &b3WorldCastOutput::materialIndex )
		.field( "hit", &b3WorldCastOutput::hit );

	function( "b3DefaultQueryFilter", &b3DefaultQueryFilter );

	function( "b3World_CastRayClosest", &b3World_CastRayClosest );
	function( "b3Body_GetMassData", &b3Body_GetMassData );
	function( "b3Body_SetMassData", &b3Body_SetMassData );
	function( "b3Body_GetLocalRotationalInertia", &b3Body_GetLocalRotationalInertia );
	function( "b3Body_GetWorldInverseRotationalInertia", &b3Body_GetWorldInverseRotationalInertia );
	function( "b3Shape_ComputeMassData", &b3Shape_ComputeMassData );
	function( "b3Shape_RayCast", &b3Shape_RayCast );

	// Callback-driven spatial queries. The JS callback is invoked once per
	// result; &cb stays valid for the synchronous duration of the query.
	// OverlapAABB: cb(shapeId) -> bool (return false to stop).
	function( "b3World_OverlapAABB", +[]( b3WorldId worldId, b3AABB aabb, b3QueryFilter filter, val cb )
	{
		b3World_OverlapAABB( worldId, aabb, filter,
			[]( b3ShapeId shapeId, void* ctx ) -> bool
			{
				val r = ( *static_cast<val*>( ctx ) )( shapeId );
				return r.isUndefined() ? true : r.as<bool>();
			},
			&cb );
	} );
	// CastRay: cb(shapeId, point, normal, fraction) -> number. Return the new
	// clip fraction (0 stops, 1 continues, -1 skips this shape), per box3d.
	function( "b3World_CastRay", +[]( b3WorldId worldId, b3Vec3 origin, b3Vec3 translation, b3QueryFilter filter, val cb )
	{
		b3World_CastRay( worldId, origin, translation, filter,
			[]( b3ShapeId shapeId, b3Pos point, b3Vec3 normal, float fraction, uint64_t, int, int, void* ctx ) -> float
			{
				val r = ( *static_cast<val*>( ctx ) )( shapeId, point, normal, fraction );
				return r.isUndefined() ? 1.0f : r.as<float>();
			},
			&cb );
	} );

	// =====================================================================
	// Section 8 — events. Leaf event structs as value_objects (void* userData
	// omitted); the four world getters return native JS arrays mirroring the C
	// container structs.
	// =====================================================================
	value_object<b3BodyMoveEvent>( "b3BodyMoveEvent" )
		.field( "transform", &b3BodyMoveEvent::transform )
		.field( "bodyId", &b3BodyMoveEvent::bodyId )
		.field( "fellAsleep", &b3BodyMoveEvent::fellAsleep );

	value_object<b3SensorBeginTouchEvent>( "b3SensorBeginTouchEvent" )
		.field( "sensorShapeId", &b3SensorBeginTouchEvent::sensorShapeId )
		.field( "visitorShapeId", &b3SensorBeginTouchEvent::visitorShapeId );

	value_object<b3SensorEndTouchEvent>( "b3SensorEndTouchEvent" )
		.field( "sensorShapeId", &b3SensorEndTouchEvent::sensorShapeId )
		.field( "visitorShapeId", &b3SensorEndTouchEvent::visitorShapeId );

	value_object<b3ContactBeginTouchEvent>( "b3ContactBeginTouchEvent" )
		.field( "shapeIdA", &b3ContactBeginTouchEvent::shapeIdA )
		.field( "shapeIdB", &b3ContactBeginTouchEvent::shapeIdB )
		.field( "contactId", &b3ContactBeginTouchEvent::contactId );

	value_object<b3ContactEndTouchEvent>( "b3ContactEndTouchEvent" )
		.field( "shapeIdA", &b3ContactEndTouchEvent::shapeIdA )
		.field( "shapeIdB", &b3ContactEndTouchEvent::shapeIdB )
		.field( "contactId", &b3ContactEndTouchEvent::contactId );

	value_object<b3ContactHitEvent>( "b3ContactHitEvent" )
		.field( "shapeIdA", &b3ContactHitEvent::shapeIdA )
		.field( "shapeIdB", &b3ContactHitEvent::shapeIdB )
		.field( "contactId", &b3ContactHitEvent::contactId )
		.field( "point", &b3ContactHitEvent::point )
		.field( "normal", &b3ContactHitEvent::normal )
		.field( "approachSpeed", &b3ContactHitEvent::approachSpeed )
		.field( "userMaterialIdA", &b3ContactHitEvent::userMaterialIdA )
		.field( "userMaterialIdB", &b3ContactHitEvent::userMaterialIdB );

	value_object<b3JointEvent>( "b3JointEvent" )
		.field( "jointId", &b3JointEvent::jointId );

	function( "b3World_GetBodyEvents", +[]( b3WorldId worldId )
	{
		b3BodyEvents e = b3World_GetBodyEvents( worldId );
		val o = val::object();
		o.set( "moveEvents", eventsToArray( e.moveEvents, e.moveCount ) );
		return o;
	} );
	function( "b3World_GetSensorEvents", +[]( b3WorldId worldId )
	{
		b3SensorEvents e = b3World_GetSensorEvents( worldId );
		val o = val::object();
		o.set( "beginEvents", eventsToArray( e.beginEvents, e.beginCount ) );
		o.set( "endEvents", eventsToArray( e.endEvents, e.endCount ) );
		return o;
	} );
	function( "b3World_GetContactEvents", +[]( b3WorldId worldId )
	{
		b3ContactEvents e = b3World_GetContactEvents( worldId );
		val o = val::object();
		o.set( "beginEvents", eventsToArray( e.beginEvents, e.beginCount ) );
		o.set( "endEvents", eventsToArray( e.endEvents, e.endCount ) );
		o.set( "hitEvents", eventsToArray( e.hitEvents, e.hitCount ) );
		return o;
	} );
	function( "b3World_GetJointEvents", +[]( b3WorldId worldId )
	{
		b3JointEvents e = b3World_GetJointEvents( worldId );
		val o = val::object();
		o.set( "jointEvents", eventsToArray( e.jointEvents, e.count ) );
		return o;
	} );

	// =====================================================================
	// Section 7 — math helpers (pointer-free subset)
	// =====================================================================
	function( "b3Distance", &b3Distance );
	function( "b3DistanceSquared", &b3DistanceSquared );
	function( "b3Cross", &b3Cross );
	function( "b3RotateVector", &b3RotateVector );
	function( "b3InvRotateVector", &b3InvRotateVector );
	function( "b3TransformPoint", &b3TransformPoint );
	function( "b3MulTransforms", &b3MulTransforms );
	function( "b3AABB_Union", &b3AABB_Union );

	// =====================================================================
	// Section 8c — dynamic tree (the broadphase AABB tree). b3DynamicTree owns
	// heap memory, so it's an opaque handle created/destroyed through wrappers
	// (never copied to JS by value). Category/mask/userData are exposed as 32-bit
	// numbers for ergonomics; Query/RayCast take a JS callback like the world
	// queries do.
	// =====================================================================
	class_<b3DynamicTree>( "b3DynamicTree" );

	function( "b3CreateDynamicTree", +[]( int proxyCapacity ) -> b3DynamicTree*
	{
		b3DynamicTree* tree = new b3DynamicTree();
		*tree = b3DynamicTree_Create( proxyCapacity );
		return tree;
	}, allow_raw_pointers() );

	function( "b3DestroyDynamicTree", +[]( b3DynamicTree* tree )
	{
		b3DynamicTree_Destroy( tree );
		delete tree;
	}, allow_raw_pointers() );

	function( "b3DynamicTree_CreateProxy", +[]( b3DynamicTree* tree, b3AABB aabb, unsigned categoryBits, unsigned userData ) -> int
	{
		return b3DynamicTree_CreateProxy( tree, aabb, (uint64_t)categoryBits, (uint64_t)userData );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_DestroyProxy", +[]( b3DynamicTree* tree, int proxyId )
	{
		b3DynamicTree_DestroyProxy( tree, proxyId );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_MoveProxy", +[]( b3DynamicTree* tree, int proxyId, b3AABB aabb )
	{
		b3DynamicTree_MoveProxy( tree, proxyId, aabb );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_EnlargeProxy", +[]( b3DynamicTree* tree, int proxyId, b3AABB aabb )
	{
		b3DynamicTree_EnlargeProxy( tree, proxyId, aabb );
	}, allow_raw_pointers() );

	// Query: cb(proxyId, userData) -> bool (false to stop). Returns nodeVisits/leafVisits.
	function( "b3DynamicTree_Query", +[]( b3DynamicTree* tree, b3AABB aabb, unsigned maskBits, val cb ) -> b3TreeStats
	{
		return b3DynamicTree_Query( tree, aabb, (uint64_t)maskBits, false,
			[]( int proxyId, uint64_t userData, void* ctx ) -> bool
			{
				val r = ( *static_cast<val*>( ctx ) )( proxyId, (unsigned)userData );
				return r.isUndefined() ? true : r.as<bool>();
			},
			&cb );
	}, allow_raw_pointers() );

	// RayCast: cb(proxyId, userData) -> number (new max fraction; 0 stops). Returns stats.
	function( "b3DynamicTree_RayCast", +[]( b3DynamicTree* tree, b3Vec3 origin, b3Vec3 translation, float maxFraction, unsigned maskBits, val cb ) -> b3TreeStats
	{
		b3RayCastInput input{ origin, translation, maxFraction };
		return b3DynamicTree_RayCast( tree, &input, (uint64_t)maskBits, false,
			[]( const b3RayCastInput*, int proxyId, uint64_t userData, void* ctx ) -> float
			{
				val r = ( *static_cast<val*>( ctx ) )( proxyId, (unsigned)userData );
				return r.isUndefined() ? 1.0f : r.as<float>();
			},
			&cb );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_Rebuild", +[]( b3DynamicTree* tree, bool fullBuild ) -> int
	{
		return b3DynamicTree_Rebuild( tree, fullBuild );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_GetHeight", +[]( b3DynamicTree* tree ) -> int { return b3DynamicTree_GetHeight( tree ); }, allow_raw_pointers() );
	function( "b3DynamicTree_GetAreaRatio", +[]( b3DynamicTree* tree ) -> float { return b3DynamicTree_GetAreaRatio( tree ); }, allow_raw_pointers() );
	function( "b3DynamicTree_GetProxyCount", +[]( b3DynamicTree* tree ) -> int { return b3DynamicTree_GetProxyCount( tree ); }, allow_raw_pointers() );
	function( "b3DynamicTree_GetRootBounds", +[]( b3DynamicTree* tree ) -> b3AABB { return b3DynamicTree_GetRootBounds( tree ); }, allow_raw_pointers() );

	value_object<b3TreeStats>( "b3TreeStats" )
		.field( "nodeVisits", &b3TreeStats::nodeVisits )
		.field( "leafVisits", &b3TreeStats::leafVisits );

	// =====================================================================
	// Section 9 — debug draw (faithful). b3World_Draw takes a JS handler object
	// whose methods receive primitives: drawSegment(p1,p2,color),
	// drawPoint(p,size,color), drawSphere(p,radius,color,alpha),
	// drawCapsule(p1,p2,radius,color,alpha), drawBox(extents,transform,color),
	// drawBounds(aabb,color), drawTransform(transform). Colors are 0xRRGGBB
	// numbers. Flags on the same object: drawJoints/drawBounds/drawContacts/
	// drawMass. Per-primitive JS calls -> for inspection, not the hot path.
	// =====================================================================
	function( "b3World_Draw", &worldDraw );
}
