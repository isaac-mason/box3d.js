// box3d.js — hand-written embind bindings for box3d.
//
// Style: flat & faithful. We mirror the C API ~1:1. C structs map to embind
// value_objects; C functions bind directly. Functions that take a `const
// b3*Def*` pointer are wrapped by a tiny by-value lambda, because embind
// marshals value_objects by value, not by pointer.
//
// The file is organized into sections so it stays buildable as coverage grows.

#include <string>
#include <vector>

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
	// Section 5e — per-joint-type accessors  (next) ... TODO
	// Section 6  — collision.h               (M3) ... TODO
	// Section 7  — math helpers              (M3) ... TODO
	// Section 8  — events (pointer+count)    (M3) ... TODO  (glue.h)
	// Section 9  — callbacks & debug draw    (M4) ... TODO  (glue.h)
	// =====================================================================
}
