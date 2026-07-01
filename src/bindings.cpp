// box3d.js — hand-written embind bindings for box3d.
//
// Style: flat & faithful. We mirror the C API ~1:1. C structs map to embind
// value_objects; C functions bind directly. Functions that take a `const
// b3*Def*` pointer are wrapped by a tiny by-value lambda, because embind
// marshals value_objects by value, not by pointer.
//
// The file is organized into sections so it stays buildable as coverage grows.

#include <string>

#include <emscripten/bind.h>

#include <box3d/box3d.h>
#include <box3d/collision.h>

using namespace emscripten;

// A captureless lambda decays to a function pointer via unary +, which is what
// embind's function() wants. Wrappers below adapt pointer-taking C functions to
// by-value value_object arguments.

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

	// =====================================================================
	// Section 6 — collision.h              (M3) ... TODO
	// Section 7 — math helpers             (M3) ... TODO
	// Section 8 — events (pointer+count)   (M3) ... TODO  (glue.h)
	// Section 9 — callbacks & debug draw   (M4) ... TODO  (glue.h)
	// =====================================================================
}
