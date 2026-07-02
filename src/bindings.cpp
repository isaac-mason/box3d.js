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

// Convert a b3LocalManifold (produced by the b3Collide* functions) to a JS
// object { normal, points: [{ point, separation }] } in shape A's local frame.
inline val localManifoldToVal( const b3LocalManifold& m )
{
	val o = val::object();
	o.set( "normal", val( m.normal ) );
	val pts = val::array();
	for ( int i = 0; i < m.pointCount; ++i )
	{
		val p = val::object();
		p.set( "point", val( m.points[i].point ) );
		p.set( "separation", m.points[i].separation );
		pts.call<void>( "push", p );
	}
	o.set( "points", pts );
	return o;
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
	value_object<b3Version>( "Version" )
		.field( "major", &b3Version::major )
		.field( "minor", &b3Version::minor )
		.field( "revision", &b3Version::revision );

	function( "b3GetVersion()", &b3GetVersion );
	function( "b3IsDoublePrecision()", &b3IsDoublePrecision );
	function( "b3GetByteCount()", &b3GetByteCount );

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

	value_object<b3Sphere>( "b3Sphere" )
		.field( "center", &b3Sphere::center )
		.field( "radius", &b3Sphere::radius );

	value_object<b3Capsule>( "b3Capsule" )
		.field( "center1", &b3Capsule::center1 )
		.field( "center2", &b3Capsule::center2 )
		.field( "radius", &b3Capsule::radius );

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

	// Pointer/callback/userData fields are not registered — they round-trip to null (the correct default).
	// internalValue IS registered so b3Default*Def() validation magic survives the JS round-trip.
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

	function( "b3DefaultWorldDef()", &b3DefaultWorldDef );
	function( "b3DefaultBodyDef()", &b3DefaultBodyDef );
	function( "b3DefaultShapeDef()", &b3DefaultShapeDef );
	function( "b3DefaultFilter()", &b3DefaultFilter );
	function( "b3DefaultSurfaceMaterial()", &b3DefaultSurfaceMaterial );

	function( "b3CreateWorld(worldDef)", +[]( b3WorldDef def ) { return b3CreateWorld( &def ); } );
	function( "b3DestroyWorld(worldId)", &b3DestroyWorld );
	function( "b3World_IsValid(worldId)", &b3World_IsValid );
	function( "b3World_Step(worldId, timeStep, subStepCount)", &b3World_Step );
	function( "b3World_SetGravity(worldId, gravity)", &b3World_SetGravity );
	function( "b3World_GetGravity(worldId)", &b3World_GetGravity );

	function( "b3GetWorldCount()", &b3GetWorldCount );
	function( "b3GetMaxWorldCount()", &b3GetMaxWorldCount );
	function( "b3World_GetBounds(worldId)", &b3World_GetBounds );
	function( "b3World_EnableSleeping(worldId, flag)", &b3World_EnableSleeping );
	function( "b3World_IsSleepingEnabled(worldId)", &b3World_IsSleepingEnabled );
	function( "b3World_EnableContinuous(worldId, flag)", &b3World_EnableContinuous );
	function( "b3World_IsContinuousEnabled(worldId)", &b3World_IsContinuousEnabled );
	function( "b3World_SetRestitutionThreshold(worldId, value)", &b3World_SetRestitutionThreshold );
	function( "b3World_GetRestitutionThreshold(worldId)", &b3World_GetRestitutionThreshold );
	function( "b3World_SetHitEventThreshold(worldId, value)", &b3World_SetHitEventThreshold );
	function( "b3World_GetHitEventThreshold(worldId)", &b3World_GetHitEventThreshold );
	function( "b3World_SetContactTuning(worldId, hertz, dampingRatio, contactSpeed)", &b3World_SetContactTuning );
	function( "b3World_SetContactRecycleDistance(worldId, recycleDistance)", &b3World_SetContactRecycleDistance );
	function( "b3World_GetContactRecycleDistance(worldId)", &b3World_GetContactRecycleDistance );
	function( "b3World_SetMaximumLinearSpeed(worldId, maximumLinearSpeed)", &b3World_SetMaximumLinearSpeed );
	function( "b3World_GetMaximumLinearSpeed(worldId)", &b3World_GetMaximumLinearSpeed );
	function( "b3World_EnableWarmStarting(worldId, flag)", &b3World_EnableWarmStarting );
	function( "b3World_IsWarmStartingEnabled(worldId)", &b3World_IsWarmStartingEnabled );
	function( "b3World_GetAwakeBodyCount(worldId)", &b3World_GetAwakeBodyCount );
	function( "b3World_SetWorkerCount(worldId, count)", &b3World_SetWorkerCount );
	function( "b3World_GetWorkerCount(worldId)", &b3World_GetWorkerCount );
	function( "b3World_RebuildStaticTree(worldId)", &b3World_RebuildStaticTree );
	function( "b3World_EnableSpeculative(worldId, flag)", &b3World_EnableSpeculative );
	function( "b3World_GetMaxCapacity(worldId)", &b3World_GetMaxCapacity );
	function( "b3World_DumpShapeBounds(worldId, type)", &b3World_DumpShapeBounds );

	function( "b3CreateBody(worldId, bodyDef)", +[]( b3WorldId worldId, b3BodyDef def ) { return b3CreateBody( worldId, &def ); } );
	function( "b3DestroyBody(bodyId)", &b3DestroyBody );
	function( "b3Body_IsValid(id)", &b3Body_IsValid );
	function( "b3Body_GetType(bodyId)", &b3Body_GetType );
	function( "b3Body_GetPosition(bodyId)", &b3Body_GetPosition );
	function( "b3Body_GetRotation(bodyId)", &b3Body_GetRotation );
	function( "b3Body_GetTransform(bodyId)", &b3Body_GetTransform );
	function( "b3Body_SetTransform(bodyId, position, rotation)", &b3Body_SetTransform );
	function( "b3Body_GetLinearVelocity(bodyId)", &b3Body_GetLinearVelocity );
	function( "b3Body_GetAngularVelocity(bodyId)", &b3Body_GetAngularVelocity );

	function( "b3CreateSphereShape(bodyId, shapeDef, sphere)",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3Sphere sphere ) { return b3CreateSphereShape( bodyId, &def, &sphere ); } );
	function( "b3CreateCapsuleShape(bodyId, shapeDef, capsule)",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3Capsule capsule ) { return b3CreateCapsuleShape( bodyId, &def, &capsule ); } );
	function( "b3Shape_IsValid(id)", &b3Shape_IsValid );

	// Binding-side helper: build a box hull in C++ memory and create a hull
	// shape from it. b3BoxHull embeds a b3HullData with internal offsets that
	// cannot survive a JS value_object copy, so this must stay on the C++ side.
	function( "b3CreateBoxShape(bodyId, shapeDef, hx, hy, hz)",
		+[]( b3BodyId bodyId, b3ShapeDef def, float hx, float hy, float hz )
		{
			b3BoxHull hull = b3MakeBoxHull( hx, hy, hz );
			return b3CreateHullShape( bodyId, &def, &hull.base );
		} );

	class_<b3HullData>( "b3HullData" );
	function( "b3CreateHull(points)", +[]( val points ) -> b3HullData*
	{
		std::vector<float> f = convertJSArrayToNumberVector<float>( points );
		int count = (int)( f.size() / 3 );
		return b3CreateHull( reinterpret_cast<const b3Vec3*>( f.data() ), count, count );
	}, allow_raw_pointers() );
	function( "b3CreateCylinder(height, radius, yOffset, sides)", &b3CreateCylinder, allow_raw_pointers() );
	function( "b3CreateCone(height, radius1, radius2, slices)", &b3CreateCone, allow_raw_pointers() );
	function( "b3CreateRock(radius)", &b3CreateRock, allow_raw_pointers() );
	function( "b3CloneAndTransformHull(original, transform, scale)", &b3CloneAndTransformHull, allow_raw_pointers() );
	function( "b3DestroyHull(hull)", &b3DestroyHull, allow_raw_pointers() );
	function( "b3CreateHullShape(bodyId, shapeDef, hull)",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3HullData* hull ) { return b3CreateHullShape( bodyId, &def, hull ); },
		allow_raw_pointers() );
	function( "b3GetHullVertices(hull)", +[]( const b3HullData* hull ) -> val
	{
		if ( hull == nullptr ) return val::global( "Float32Array" ).new_( 0 );
		return val( typed_memory_view( (size_t)hull->vertexCount * 3, reinterpret_cast<const float*>( b3GetHullPoints( hull ) ) ) );
	}, allow_raw_pointers() );

	class_<b3MeshData>( "b3MeshData" );
	function( "b3CreateMesh(positions, indices)", +[]( val positions, val indices ) -> b3MeshData*
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
	function( "b3DestroyMesh(mesh)", &b3DestroyMesh, allow_raw_pointers() );
	function( "b3CreateMeshShape(bodyId, shapeDef, mesh, scale)",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3MeshData* mesh, b3Vec3 scale ) { return b3CreateMeshShape( bodyId, &def, mesh, scale ); },
		allow_raw_pointers() );

	function( "b3CreateGridMesh(xCount, zCount, cellWidth, materialCount, identifyEdges)", +[]( int xCount, int zCount, float cellWidth, int materialCount, bool identifyEdges )
		{ return b3CreateGridMesh( xCount, zCount, cellWidth, materialCount, identifyEdges ); }, allow_raw_pointers() );
	function( "b3CreateWaveMesh(xCount, zCount, cellWidth, amplitude, rowFrequency, columnFrequency)", +[]( int xCount, int zCount, float cellWidth, float amplitude, float rowFrequency, float columnFrequency )
		{ return b3CreateWaveMesh( xCount, zCount, cellWidth, amplitude, rowFrequency, columnFrequency ); }, allow_raw_pointers() );
	function( "b3CreateTorusMesh(radialResolution, tubularResolution, radius, thickness)", +[]( int radialResolution, int tubularResolution, float radius, float thickness )
		{ return b3CreateTorusMesh( radialResolution, tubularResolution, radius, thickness ); }, allow_raw_pointers() );
	function( "b3CreateBoxMesh(center, extent, identifyEdges)", +[]( b3Vec3 center, b3Vec3 extent, bool identifyEdges )
		{ return b3CreateBoxMesh( center, extent, identifyEdges ); }, allow_raw_pointers() );
	function( "b3CreateHollowBoxMesh(center, extent)", +[]( b3Vec3 center, b3Vec3 extent )
		{ return b3CreateHollowBoxMesh( center, extent ); }, allow_raw_pointers() );
	function( "b3CreatePlatformMesh(center, height, topWidth, bottomWidth)", +[]( b3Vec3 center, float height, float topWidth, float bottomWidth )
		{ return b3CreatePlatformMesh( center, height, topWidth, bottomWidth ); }, allow_raw_pointers() );

	function( "b3GetMeshVertices(mesh)", +[]( b3MeshData* mesh ) -> val
	{
		const b3Vec3* v = b3GetMeshVertices( mesh );
		int n = mesh->vertexCount;
		val view = val( typed_memory_view( (size_t)( n * 3 ), reinterpret_cast<const float*>( v ) ) );
		return view.call<val>( "slice" );
	}, allow_raw_pointers() );
	function( "b3GetMeshIndices(mesh)", +[]( b3MeshData* mesh ) -> val
	{
		const b3MeshTriangle* t = b3GetMeshTriangles( mesh );
		int n = mesh->triangleCount;
		val view = val( typed_memory_view( (size_t)( n * 3 ), reinterpret_cast<const int32_t*>( t ) ) );
		return val::global( "Uint32Array" ).new_( view );
	}, allow_raw_pointers() );
	// per-triangle material indices as Uint8Array (empty if the mesh has none)
	function( "b3GetMeshMaterialIndices(mesh)", +[]( b3MeshData* mesh ) -> val
	{
		const uint8_t* mi = b3GetMeshMaterialIndices( mesh );
		int n = mesh->triangleCount;
		if ( mi == nullptr ) return val::global( "Uint8Array" ).new_( 0 );
		val view = val( typed_memory_view( (size_t)n, mi ) );
		return view.call<val>( "slice" );
	}, allow_raw_pointers() );

	class_<b3CompoundData>( "b3CompoundData" );
	function( "b3CreateCompound(spec)", +[]( val spec ) -> b3CompoundData*
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
	function( "b3DestroyCompound(compound)", &b3DestroyCompound, allow_raw_pointers() );
	function( "b3CreateCompoundShape(bodyId, shapeDef, compound)",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3CompoundData* compound ) { return b3CreateCompoundShape( bodyId, &def, compound ); },
		allow_raw_pointers() );

	class_<b3HeightFieldData>( "b3HeightFieldData" );
	function( "b3CreateHeightField(heights, countX, countZ, scale)", +[]( val heights, int countX, int countZ, b3Vec3 scale ) -> b3HeightFieldData*
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
	function( "b3DestroyHeightField(heightField)", &b3DestroyHeightField, allow_raw_pointers() );
	function( "b3CreateHeightFieldShape(bodyId, shapeDef, heightField)",
		+[]( b3BodyId bodyId, b3ShapeDef def, b3HeightFieldData* hf ) { return b3CreateHeightFieldShape( bodyId, &def, hf ); },
		allow_raw_pointers() );
	function( "b3CreateGrid(rowCount, columnCount, scale, makeHoles)", +[]( int rowCount, int columnCount, b3Vec3 scale, bool makeHoles )
		{ return b3CreateGrid( rowCount, columnCount, scale, makeHoles ); }, allow_raw_pointers() );
	function( "b3CreateWave(rowCount, columnCount, scale, rowFrequency, columnFrequency, makeHoles)", +[]( int rowCount, int columnCount, b3Vec3 scale, float rowFrequency, float columnFrequency, bool makeHoles )
		{ return b3CreateWave( rowCount, columnCount, scale, rowFrequency, columnFrequency, makeHoles ); }, allow_raw_pointers() );
	function( "b3CreateTransformedHullShape(bodyId, shapeDef, hull, transform, scale)", +[]( b3BodyId bodyId, b3ShapeDef def, b3HullData* hull, b3Transform transform, b3Vec3 scale )
		{ return b3CreateTransformedHullShape( bodyId, &def, hull, transform, scale ); }, allow_raw_pointers() );

	value_object<b3PlaneResult>( "b3PlaneResult" )
		.field( "plane", &b3PlaneResult::plane )
		.field( "point", &b3PlaneResult::point );
	function( "b3World_CastMover(worldId, origin, mover, translation, filter, callback)",
		+[]( b3WorldId worldId, b3Vec3 origin, b3Capsule mover, b3Vec3 translation, b3QueryFilter filter, val cb ) -> float
		{
			return b3World_CastMover( worldId, origin, &mover, translation, filter,
				[]( b3ShapeId shapeId, void* ctx ) -> bool
				{ val r = ( *static_cast<val*>( ctx ) )( shapeId ); return r.isUndefined() ? true : r.as<bool>(); },
				&cb );
		} );
	function( "b3World_CollideMover(worldId, origin, mover, filter, callback)", +[]( b3WorldId worldId, b3Vec3 origin, b3Capsule mover, b3QueryFilter filter, val cb )
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

	value_object<b3CollisionPlane>( "b3CollisionPlane" )
		.field( "plane", &b3CollisionPlane::plane )
		.field( "pushLimit", &b3CollisionPlane::pushLimit )
		.field( "push", &b3CollisionPlane::push )
		.field( "clipVelocity", &b3CollisionPlane::clipVelocity );
	value_object<b3PlaneSolverResult>( "b3PlaneSolverResult" )
		.field( "delta", &b3PlaneSolverResult::delta )
		.field( "iterationCount", &b3PlaneSolverResult::iterationCount );

	function( "b3SolvePlanes(targetDelta, planes)", +[]( b3Vec3 targetDelta, val jsPlanes ) -> b3PlaneSolverResult
	{
		int n = jsPlanes["length"].as<int>();
		std::vector<b3CollisionPlane> planes;
		planes.reserve( n );
		for ( int i = 0; i < n; ++i ) planes.push_back( jsPlanes[i].as<b3CollisionPlane>() );
		return b3SolvePlanes( targetDelta, planes.data(), n );
	} );

	function( "b3ClipVector(vector, planes)", +[]( b3Vec3 vector, val jsPlanes ) -> b3Vec3
	{
		int n = jsPlanes["length"].as<int>();
		std::vector<b3CollisionPlane> planes;
		planes.reserve( n );
		for ( int i = 0; i < n; ++i ) planes.push_back( jsPlanes[i].as<b3CollisionPlane>() );
		return b3ClipVector( vector, planes.data(), n );
	} );

	// colorCounts/manifoldCounts fixed-array fields are omitted; scalar counts only.
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
	function( "b3World_GetCounters(worldId)", &b3World_GetCounters );

	// Persistent callbacks: the JS function is heap-held for the world's lifetime (one small leak per set call).
	function( "b3World_SetCustomFilterCallback(worldId, callback)", +[]( b3WorldId worldId, val cb )
	{
		val* held = new val( cb );
		b3World_SetCustomFilterCallback( worldId,
			[]( b3ShapeId a, b3ShapeId b, void* ctx ) -> bool
			{ val r = ( *static_cast<val*>( ctx ) )( a, b ); return r.isUndefined() ? true : r.as<bool>(); },
			held );
	} );
	// Pre-solve callback runs on worker threads in the MT build.
	function( "b3World_SetPreSolveCallback(worldId, callback)", +[]( b3WorldId worldId, val cb )
	{
		val* held = new val( cb );
		b3World_SetPreSolveCallback( worldId,
			[]( b3ShapeId a, b3ShapeId b, b3Pos point, b3Vec3 normal, void* ctx ) -> bool
			{ val r = ( *static_cast<val*>( ctx ) )( a, b, point, normal ); return r.isUndefined() ? true : r.as<bool>(); },
			held );
	} );

	// Shapes passed as point-cloud proxies (Float32Array of local points + radius), matching b3ShapeProxy.
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
	function( "b3ShapeDistance(pointsA, radiusA, pointsB, radiusB, transformB, useRadii)",
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
	function( "b3ShapeCast(pointsA, radiusA, pointsB, radiusB, transformB, translationB, maxFraction, canEncroach)",
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
	function( "b3TimeOfImpact(pointsA, radiusA, pointsB, radiusB, sweepA, sweepB, maxFraction)",
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

	// --- manifold generation (b3Collide*). Collide two shapes, with shape B
	// given relative to A via transformBtoA, returning { normal, points:[{point,
	// separation}] } in shape A's local frame. Up to 4 points. ---
	function( "b3InvMulTransforms(a, b)", &b3InvMulTransforms );
	function( "b3CollideSpheres(sphereA, sphereB, transformB)", +[]( b3Sphere a, b3Sphere b, b3Transform xf ) -> val
	{
		b3LocalManifoldPoint pts[4] = {}; b3LocalManifold m = {}; m.points = pts;
		b3CollideSpheres( &m, 4, &a, &b, xf );
		return localManifoldToVal( m );
	} );
	function( "b3CollideCapsuleAndSphere(capsuleA, sphereB, transformB)", +[]( b3Capsule a, b3Sphere b, b3Transform xf ) -> val
	{
		b3LocalManifoldPoint pts[4] = {}; b3LocalManifold m = {}; m.points = pts;
		b3CollideCapsuleAndSphere( &m, 4, &a, &b, xf );
		return localManifoldToVal( m );
	} );
	function( "b3CollideHullAndSphere(hullA, sphereB, transformB)", +[]( b3HullData* a, b3Sphere b, b3Transform xf ) -> val
	{
		b3SimplexCache cache = {}; b3LocalManifoldPoint pts[4] = {}; b3LocalManifold m = {}; m.points = pts;
		b3CollideHullAndSphere( &m, 4, a, &b, xf, &cache );
		return localManifoldToVal( m );
	}, allow_raw_pointers() );
	function( "b3CollideCapsules(capsuleA, capsuleB, transformB)", +[]( b3Capsule a, b3Capsule b, b3Transform xf ) -> val
	{
		b3LocalManifoldPoint pts[4] = {}; b3LocalManifold m = {}; m.points = pts;
		b3CollideCapsules( &m, 4, &a, &b, xf );
		return localManifoldToVal( m );
	} );
	function( "b3CollideHullAndCapsule(hullA, capsuleB, transformB)", +[]( b3HullData* a, b3Capsule b, b3Transform xf ) -> val
	{
		b3SimplexCache cache = {}; b3LocalManifoldPoint pts[4] = {}; b3LocalManifold m = {}; m.points = pts;
		b3CollideHullAndCapsule( &m, 4, a, &b, xf, &cache );
		return localManifoldToVal( m );
	}, allow_raw_pointers() );
	function( "b3CollideHulls(hullA, hullB, transformB)", +[]( b3HullData* a, b3HullData* b, b3Transform xf ) -> val
	{
		b3SATCache cache = {}; b3LocalManifoldPoint pts[4] = {}; b3LocalManifold m = {}; m.points = pts;
		b3CollideHulls( &m, 4, a, b, xf, &cache );
		return localManifoldToVal( m );
	}, allow_raw_pointers() );
	function( "b3CollideCapsuleAndTriangle(capsuleA, v1, v2, v3)", +[]( b3Capsule a, b3Vec3 v1, b3Vec3 v2, b3Vec3 v3 ) -> val
	{
		b3Vec3 tri[3] = { v1, v2, v3 }; b3SimplexCache cache = {}; b3LocalManifoldPoint pts[4] = {}; b3LocalManifold m = {}; m.points = pts;
		b3CollideCapsuleAndTriangle( &m, 4, &a, tri, &cache );
		return localManifoldToVal( m );
	} );
	function( "b3CollideHullAndTriangle(hullA, v1, v2, v3, triangleFlags)", +[]( b3HullData* a, b3Vec3 v1, b3Vec3 v2, b3Vec3 v3, int triangleFlags ) -> val
	{
		b3SATCache cache = {}; b3LocalManifoldPoint pts[4] = {}; b3LocalManifold m = {}; m.points = pts;
		b3CollideHullAndTriangle( &m, 4, a, v1, v2, v3, triangleFlags, &cache );
		return localManifoldToVal( m );
	}, allow_raw_pointers() );
	function( "b3CollideSphereAndTriangle(sphereA, v1, v2, v3)", +[]( b3Sphere a, b3Vec3 v1, b3Vec3 v2, b3Vec3 v3 ) -> val
	{
		b3Vec3 tri[3] = { v1, v2, v3 }; b3LocalManifoldPoint pts[4] = {}; b3LocalManifold m = {}; m.points = pts;
		b3CollideSphereAndTriangle( &m, 4, &a, tri );
		return localManifoldToVal( m );
	} );

	// Compute mass-data / AABB of a primitive shape without attaching it to a body.
	function( "b3ComputeSphereMass(sphere, density)", +[]( b3Sphere s, float density ) { return b3ComputeSphereMass( &s, density ); } );
	function( "b3ComputeCapsuleMass(capsule, density)", +[]( b3Capsule c, float density ) { return b3ComputeCapsuleMass( &c, density ); } );
	function( "b3ComputeHullMass(hull, density)", +[]( b3HullData* h, float density ) { return b3ComputeHullMass( h, density ); }, allow_raw_pointers() );
	function( "b3ComputeSphereAABB(sphere, transform)", +[]( b3Sphere s, b3Transform t ) { return b3ComputeSphereAABB( &s, t ); } );
	function( "b3ComputeCapsuleAABB(capsule, transform)", +[]( b3Capsule c, b3Transform t ) { return b3ComputeCapsuleAABB( &c, t ); } );
	function( "b3ComputeHullAABB(hull, transform)", +[]( b3HullData* h, b3Transform t ) { return b3ComputeHullAABB( h, t ); }, allow_raw_pointers() );

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
	function( "b3World_GetProfile(worldId)", &b3World_GetProfile );

	// --- live contact / sensor data getters ---
	// Contacts as a JS array: { shapeIdA, shapeIdB, manifolds: [{ normal,
	// points: [{ anchorA, anchorB, separation }] }] }. Anchors are offsets from
	// each body's centre of mass, in world orientation.
	function( "b3Body_GetContactData(bodyId)", +[]( b3BodyId bodyId ) -> val
	{
		std::vector<b3ContactData> data( (size_t)b3Body_GetContactCapacity( bodyId ) );
		int n = data.empty() ? 0 : b3Body_GetContactData( bodyId, data.data(), (int)data.size() );
		return contactsToArray( data.data(), n );
	} );
	function( "b3Shape_GetContactData(shapeId)", +[]( b3ShapeId shapeId ) -> val
	{
		std::vector<b3ContactData> data( (size_t)b3Shape_GetContactCapacity( shapeId ) );
		int n = data.empty() ? 0 : b3Shape_GetContactData( shapeId, data.data(), (int)data.size() );
		return contactsToArray( data.data(), n );
	} );
	// sensor overlaps: JS array of visitor shape ids currently inside this sensor.
	function( "b3Shape_GetSensorData(shapeId)", +[]( b3ShapeId shapeId ) -> val
	{
		std::vector<b3ShapeId> ids( (size_t)b3Shape_GetSensorCapacity( shapeId ) );
		int n = ids.empty() ? 0 : b3Shape_GetSensorData( shapeId, ids.data(), (int)ids.size() );
		val arr = val::array();
		for ( int i = 0; i < n; ++i ) arr.call<void>( "push", val( ids[i] ) );
		return arr;
	} );

	value_object<b3ExplosionDef>( "b3ExplosionDef" )
		.field( "maskBits", &b3ExplosionDef::maskBits )
		.field( "position", &b3ExplosionDef::position )
		.field( "radius", &b3ExplosionDef::radius )
		.field( "falloff", &b3ExplosionDef::falloff )
		.field( "impulsePerArea", &b3ExplosionDef::impulsePerArea );
	function( "b3DefaultExplosionDef()", &b3DefaultExplosionDef );
	function( "b3World_Explode(worldId, explosionDef)", +[]( b3WorldId worldId, b3ExplosionDef def ) { b3World_Explode( worldId, &def ); } );

	function( "b3World_OverlapShape(worldId, origin, points, radius, filter, callback)",
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
	function( "b3World_CastShape(worldId, origin, points, radius, translation, filter, callback)",
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

	value_object<b3BodyCastResult>( "b3BodyCastResult" )
		.field( "shapeId", &b3BodyCastResult::shapeId )
		.field( "point", &b3BodyCastResult::point )
		.field( "normal", &b3BodyCastResult::normal )
		.field( "fraction", &b3BodyCastResult::fraction )
		.field( "triangleIndex", &b3BodyCastResult::triangleIndex )
		.field( "iterations", &b3BodyCastResult::iterations )
		.field( "hit", &b3BodyCastResult::hit );
	function( "b3Body_CastRay(bodyId, origin, translation, filter, maxFraction, bodyTransform)", +[]( b3BodyId bodyId, b3Vec3 origin, b3Vec3 translation, b3QueryFilter filter, float maxFraction, b3Transform bodyTransform ) -> b3BodyCastResult
	{ return b3Body_CastRay( bodyId, origin, translation, filter, maxFraction, bodyTransform ); } );
	function( "b3Body_CastShape(bodyId, origin, points, radius, translation, filter, maxFraction, canEncroach, bodyTransform)", +[]( b3BodyId bodyId, b3Vec3 origin, val points, float radius, b3Vec3 translation, b3QueryFilter filter, float maxFraction, bool canEncroach, b3Transform bodyTransform ) -> b3BodyCastResult
	{
		std::vector<float> f = convertJSArrayToNumberVector<float>( points );
		b3ShapeProxy proxy{ reinterpret_cast<const b3Vec3*>( f.data() ), (int)( f.size() / 3 ), radius };
		return b3Body_CastShape( bodyId, origin, &proxy, translation, filter, maxFraction, canEncroach, bodyTransform );
	} );
	function( "b3Body_OverlapShape(bodyId, origin, points, radius, filter, bodyTransform)", +[]( b3BodyId bodyId, b3Vec3 origin, val points, float radius, b3QueryFilter filter, b3Transform bodyTransform ) -> bool
	{
		std::vector<float> f = convertJSArrayToNumberVector<float>( points );
		b3ShapeProxy proxy{ reinterpret_cast<const b3Vec3*>( f.data() ), (int)( f.size() / 3 ), radius };
		return b3Body_OverlapShape( bodyId, origin, &proxy, filter, bodyTransform );
	} );

	register_vector<b3ShapeId>( "b3ShapeIdVector" );
	register_vector<b3JointId>( "b3JointIdVector" );

	function( "b3Body_SetType(bodyId, type)", &b3Body_SetType );
	function( "b3Body_SetName(bodyId, name)", +[]( b3BodyId bodyId, std::string name ) { b3Body_SetName( bodyId, name.c_str() ); } );
	function( "b3Body_GetName(bodyId)", +[]( b3BodyId bodyId ) { const char* n = b3Body_GetName( bodyId ); return std::string( n ? n : "" ); } );

	function( "b3Body_GetLocalPoint(bodyId, worldPoint)", &b3Body_GetLocalPoint );
	function( "b3Body_GetWorldPoint(bodyId, localPoint)", &b3Body_GetWorldPoint );
	function( "b3Body_GetLocalVector(bodyId, worldVector)", &b3Body_GetLocalVector );
	function( "b3Body_GetWorldVector(bodyId, localVector)", &b3Body_GetWorldVector );

	function( "b3Body_SetLinearVelocity(bodyId, linearVelocity)", &b3Body_SetLinearVelocity );
	function( "b3Body_SetAngularVelocity(bodyId, angularVelocity)", &b3Body_SetAngularVelocity );
	function( "b3Body_SetTargetTransform(bodyId, target, timeStep, wake)", &b3Body_SetTargetTransform );
	function( "b3Body_GetLocalPointVelocity(bodyId, localPoint)", &b3Body_GetLocalPointVelocity );
	function( "b3Body_GetWorldPointVelocity(bodyId, worldPoint)", &b3Body_GetWorldPointVelocity );

	function( "b3Body_ApplyForce(bodyId, force, point, wake)", &b3Body_ApplyForce );
	function( "b3Body_ApplyForceToCenter(bodyId, force, wake)", &b3Body_ApplyForceToCenter );
	function( "b3Body_ApplyTorque(bodyId, torque, wake)", &b3Body_ApplyTorque );
	function( "b3Body_ApplyLinearImpulse(bodyId, impulse, point, wake)", &b3Body_ApplyLinearImpulse );
	function( "b3Body_ApplyLinearImpulseToCenter(bodyId, impulse, wake)", &b3Body_ApplyLinearImpulseToCenter );
	function( "b3Body_ApplyAngularImpulse(bodyId, impulse, wake)", &b3Body_ApplyAngularImpulse );

	function( "b3Body_GetMass(bodyId)", &b3Body_GetMass );
	function( "b3Body_GetInverseMass(bodyId)", &b3Body_GetInverseMass );
	function( "b3Body_GetLocalCenterOfMass(bodyId)", &b3Body_GetLocalCenterOfMass );
	function( "b3Body_GetWorldCenterOfMass(bodyId)", &b3Body_GetWorldCenterOfMass );
	function( "b3Body_ApplyMassFromShapes(bodyId)", &b3Body_ApplyMassFromShapes );

	function( "b3Body_SetLinearDamping(bodyId, linearDamping)", &b3Body_SetLinearDamping );
	function( "b3Body_GetLinearDamping(bodyId)", &b3Body_GetLinearDamping );
	function( "b3Body_SetAngularDamping(bodyId, angularDamping)", &b3Body_SetAngularDamping );
	function( "b3Body_GetAngularDamping(bodyId)", &b3Body_GetAngularDamping );
	function( "b3Body_SetGravityScale(bodyId, gravityScale)", &b3Body_SetGravityScale );
	function( "b3Body_GetGravityScale(bodyId)", &b3Body_GetGravityScale );

	function( "b3Body_IsAwake(bodyId)", &b3Body_IsAwake );
	function( "b3Body_SetAwake(bodyId, awake)", &b3Body_SetAwake );
	function( "b3Body_EnableSleep(bodyId, enableSleep)", &b3Body_EnableSleep );
	function( "b3Body_IsSleepEnabled(bodyId)", &b3Body_IsSleepEnabled );
	function( "b3Body_SetSleepThreshold(bodyId, sleepThreshold)", &b3Body_SetSleepThreshold );
	function( "b3Body_GetSleepThreshold(bodyId)", &b3Body_GetSleepThreshold );

	function( "b3Body_IsEnabled(bodyId)", &b3Body_IsEnabled );
	function( "b3Body_Disable(bodyId)", &b3Body_Disable );
	function( "b3Body_Enable(bodyId)", &b3Body_Enable );
	function( "b3Body_SetMotionLocks(bodyId, locks)", &b3Body_SetMotionLocks );
	function( "b3Body_GetMotionLocks(bodyId)", &b3Body_GetMotionLocks );
	function( "b3Body_SetBullet(bodyId, flag)", &b3Body_SetBullet );
	function( "b3Body_IsBullet(bodyId)", &b3Body_IsBullet );
	function( "b3Body_EnableContactRecycling(bodyId, flag)", &b3Body_EnableContactRecycling );
	function( "b3Body_IsContactRecyclingEnabled(bodyId)", &b3Body_IsContactRecyclingEnabled );
	function( "b3Body_EnableHitEvents(bodyId, enableHitEvents)", &b3Body_EnableHitEvents );

	function( "b3Body_GetWorld(bodyId)", &b3Body_GetWorld );
	function( "b3Body_GetShapeCount(bodyId)", &b3Body_GetShapeCount );
	function( "b3Body_GetShapes(bodyId)", +[]( b3BodyId bodyId )
	{
		std::vector<b3ShapeId> out( (size_t)b3Body_GetShapeCount( bodyId ) );
		if ( !out.empty() ) b3Body_GetShapes( bodyId, out.data(), (int)out.size() );
		return out;
	} );
	function( "b3Body_GetJointCount(bodyId)", &b3Body_GetJointCount );
	function( "b3Body_GetJoints(bodyId)", +[]( b3BodyId bodyId )
	{
		std::vector<b3JointId> out( (size_t)b3Body_GetJointCount( bodyId ) );
		if ( !out.empty() ) b3Body_GetJoints( bodyId, out.data(), (int)out.size() );
		return out;
	} );
	function( "b3Body_ComputeAABB(bodyId)", &b3Body_ComputeAABB );

	function( "b3Shape_GetType(shapeId)", &b3Shape_GetType );
	function( "b3Shape_GetBody(shapeId)", &b3Shape_GetBody );
	function( "b3Shape_GetWorld(shapeId)", &b3Shape_GetWorld );
	function( "b3Shape_IsSensor(shapeId)", &b3Shape_IsSensor );

	function( "b3Shape_SetDensity(shapeId, density, updateBodyMass)", &b3Shape_SetDensity );
	function( "b3Shape_GetDensity(shapeId)", &b3Shape_GetDensity );
	function( "b3Shape_SetFriction(shapeId, friction)", &b3Shape_SetFriction );
	function( "b3Shape_GetFriction(shapeId)", &b3Shape_GetFriction );
	function( "b3Shape_SetRestitution(shapeId, restitution)", &b3Shape_SetRestitution );
	function( "b3Shape_GetRestitution(shapeId)", &b3Shape_GetRestitution );
	function( "b3Shape_SetSurfaceMaterial(shapeId, surfaceMaterial)", &b3Shape_SetSurfaceMaterial );
	function( "b3Shape_GetSurfaceMaterial(shapeId)", &b3Shape_GetSurfaceMaterial );
	function( "b3Shape_GetFilter(shapeId)", &b3Shape_GetFilter );
	function( "b3Shape_SetFilter(shapeId, filter, invokeContacts)", &b3Shape_SetFilter );

	function( "b3Shape_EnableSensorEvents(shapeId, flag)", &b3Shape_EnableSensorEvents );
	function( "b3Shape_AreSensorEventsEnabled(shapeId)", &b3Shape_AreSensorEventsEnabled );
	function( "b3Shape_EnableContactEvents(shapeId, flag)", &b3Shape_EnableContactEvents );
	function( "b3Shape_AreContactEventsEnabled(shapeId)", &b3Shape_AreContactEventsEnabled );
	function( "b3Shape_EnablePreSolveEvents(shapeId, flag)", &b3Shape_EnablePreSolveEvents );
	function( "b3Shape_ArePreSolveEventsEnabled(shapeId)", &b3Shape_ArePreSolveEventsEnabled );
	function( "b3Shape_EnableHitEvents(shapeId, flag)", &b3Shape_EnableHitEvents );
	function( "b3Shape_AreHitEventsEnabled(shapeId)", &b3Shape_AreHitEventsEnabled );

	function( "b3Shape_GetSphere(shapeId)", &b3Shape_GetSphere );
	function( "b3Shape_GetCapsule(shapeId)", &b3Shape_GetCapsule );
	// The returned view aliases box3d memory — copy it before the shape changes.
	function( "b3Shape_GetHullVertices(shapeId)", +[]( b3ShapeId shapeId ) -> val
	{
		const b3HullData* hull = b3Shape_GetHull( shapeId );
		if ( hull == nullptr ) return val::global( "Float32Array" ).new_( 0 );
		const b3Vec3* pts = b3GetHullPoints( hull );
		return val( typed_memory_view( (size_t)hull->vertexCount * 3, reinterpret_cast<const float*>( pts ) ) );
	} );
	function( "b3Shape_SetSphere(shapeId, sphere)", +[]( b3ShapeId shapeId, b3Sphere sphere ) { b3Shape_SetSphere( shapeId, &sphere ); } );
	function( "b3Shape_SetCapsule(shapeId, capsule)", +[]( b3ShapeId shapeId, b3Capsule capsule ) { b3Shape_SetCapsule( shapeId, &capsule ); } );

	function( "b3Shape_GetAABB(shapeId)", &b3Shape_GetAABB );
	function( "b3Shape_GetClosestPoint(shapeId, target)", &b3Shape_GetClosestPoint );
	function( "b3Shape_ApplyWind(shapeId, wind, drag, lift, maxSpeed, wake)", &b3Shape_ApplyWind );
	function( "b3DestroyShape(shapeId, updateBodyMass)", &b3DestroyShape );

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

	function( "b3DefaultDistanceJointDef()", &b3DefaultDistanceJointDef );
	function( "b3DefaultRevoluteJointDef()", &b3DefaultRevoluteJointDef );
	function( "b3DefaultPrismaticJointDef()", &b3DefaultPrismaticJointDef );
	function( "b3DefaultWheelJointDef()", &b3DefaultWheelJointDef );
	function( "b3DefaultWeldJointDef()", &b3DefaultWeldJointDef );
	function( "b3DefaultSphericalJointDef()", &b3DefaultSphericalJointDef );
	function( "b3DefaultMotorJointDef()", &b3DefaultMotorJointDef );
	function( "b3DefaultParallelJointDef()", &b3DefaultParallelJointDef );
	function( "b3DefaultFilterJointDef()", &b3DefaultFilterJointDef );

	function( "b3CreateDistanceJoint(worldId, def)", +[]( b3WorldId w, b3DistanceJointDef d ) { return b3CreateDistanceJoint( w, &d ); } );
	function( "b3CreateRevoluteJoint(worldId, def)", +[]( b3WorldId w, b3RevoluteJointDef d ) { return b3CreateRevoluteJoint( w, &d ); } );
	function( "b3CreatePrismaticJoint(worldId, def)", +[]( b3WorldId w, b3PrismaticJointDef d ) { return b3CreatePrismaticJoint( w, &d ); } );
	function( "b3CreateWheelJoint(worldId, def)", +[]( b3WorldId w, b3WheelJointDef d ) { return b3CreateWheelJoint( w, &d ); } );
	function( "b3CreateWeldJoint(worldId, def)", +[]( b3WorldId w, b3WeldJointDef d ) { return b3CreateWeldJoint( w, &d ); } );
	function( "b3CreateSphericalJoint(worldId, def)", +[]( b3WorldId w, b3SphericalJointDef d ) { return b3CreateSphericalJoint( w, &d ); } );
	function( "b3CreateMotorJoint(worldId, def)", +[]( b3WorldId w, b3MotorJointDef d ) { return b3CreateMotorJoint( w, &d ); } );
	function( "b3CreateParallelJoint(worldId, def)", +[]( b3WorldId w, b3ParallelJointDef d ) { return b3CreateParallelJoint( w, &d ); } );
	function( "b3CreateFilterJoint(worldId, def)", +[]( b3WorldId w, b3FilterJointDef d ) { return b3CreateFilterJoint( w, &d ); } );

	function( "b3DestroyJoint(jointId, wakeAttached)", &b3DestroyJoint );
	function( "b3Joint_IsValid(id)", &b3Joint_IsValid );
	function( "b3Joint_GetType(jointId)", &b3Joint_GetType );
	function( "b3Joint_GetBodyA(jointId)", &b3Joint_GetBodyA );
	function( "b3Joint_GetBodyB(jointId)", &b3Joint_GetBodyB );
	function( "b3Joint_GetWorld(jointId)", &b3Joint_GetWorld );
	function( "b3Joint_SetLocalFrameA(jointId, localFrame)", &b3Joint_SetLocalFrameA );
	function( "b3Joint_GetLocalFrameA(jointId)", &b3Joint_GetLocalFrameA );
	function( "b3Joint_SetLocalFrameB(jointId, localFrame)", &b3Joint_SetLocalFrameB );
	function( "b3Joint_GetLocalFrameB(jointId)", &b3Joint_GetLocalFrameB );
	function( "b3Joint_SetCollideConnected(jointId, shouldCollide)", &b3Joint_SetCollideConnected );
	function( "b3Joint_GetCollideConnected(jointId)", &b3Joint_GetCollideConnected );
	function( "b3Joint_WakeBodies(jointId)", &b3Joint_WakeBodies );
	function( "b3Joint_GetConstraintForce(jointId)", &b3Joint_GetConstraintForce );
	function( "b3Joint_GetConstraintTorque(jointId)", &b3Joint_GetConstraintTorque );
	function( "b3Joint_GetLinearSeparation(jointId)", &b3Joint_GetLinearSeparation );
	function( "b3Joint_GetAngularSeparation(jointId)", &b3Joint_GetAngularSeparation );
	function( "b3Joint_SetConstraintTuning(jointId, hertz, dampingRatio)", &b3Joint_SetConstraintTuning );
	function( "b3Joint_SetForceThreshold(jointId, threshold)", &b3Joint_SetForceThreshold );
	function( "b3Joint_GetForceThreshold(jointId)", &b3Joint_GetForceThreshold );
	function( "b3Joint_SetTorqueThreshold(jointId, threshold)", &b3Joint_SetTorqueThreshold );
	function( "b3Joint_GetTorqueThreshold(jointId)", &b3Joint_GetTorqueThreshold );

	// parallel joint
	function( "b3ParallelJoint_SetSpringHertz(jointId, hertz)", &b3ParallelJoint_SetSpringHertz );
	function( "b3ParallelJoint_SetSpringDampingRatio(jointId, dampingRatio)", &b3ParallelJoint_SetSpringDampingRatio );
	function( "b3ParallelJoint_GetSpringHertz(jointId)", &b3ParallelJoint_GetSpringHertz );
	function( "b3ParallelJoint_GetSpringDampingRatio(jointId)", &b3ParallelJoint_GetSpringDampingRatio );
	function( "b3ParallelJoint_SetMaxTorque(jointId, force)", &b3ParallelJoint_SetMaxTorque );
	function( "b3ParallelJoint_GetMaxTorque(jointId)", &b3ParallelJoint_GetMaxTorque );

	// distance joint
	function( "b3DistanceJoint_SetLength(jointId, length)", &b3DistanceJoint_SetLength );
	function( "b3DistanceJoint_GetLength(jointId)", &b3DistanceJoint_GetLength );
	function( "b3DistanceJoint_EnableSpring(jointId, enableSpring)", &b3DistanceJoint_EnableSpring );
	function( "b3DistanceJoint_IsSpringEnabled(jointId)", &b3DistanceJoint_IsSpringEnabled );
	function( "b3DistanceJoint_SetSpringForceRange(jointId, lowerForce, upperForce)", &b3DistanceJoint_SetSpringForceRange );
	function( "b3DistanceJoint_GetSpringForceRange(jointId)", +[]( b3JointId jointId )
	{
		float lowerForce = 0.0f, upperForce = 0.0f;
		b3DistanceJoint_GetSpringForceRange( jointId, &lowerForce, &upperForce );
		val out = val::object();
		out.set( "lowerForce", lowerForce );
		out.set( "upperForce", upperForce );
		return out;
	} );
	function( "b3DistanceJoint_SetSpringHertz(jointId, hertz)", &b3DistanceJoint_SetSpringHertz );
	function( "b3DistanceJoint_SetSpringDampingRatio(jointId, dampingRatio)", &b3DistanceJoint_SetSpringDampingRatio );
	function( "b3DistanceJoint_GetSpringHertz(jointId)", &b3DistanceJoint_GetSpringHertz );
	function( "b3DistanceJoint_GetSpringDampingRatio(jointId)", &b3DistanceJoint_GetSpringDampingRatio );
	function( "b3DistanceJoint_EnableLimit(jointId, enableLimit)", &b3DistanceJoint_EnableLimit );
	function( "b3DistanceJoint_IsLimitEnabled(jointId)", &b3DistanceJoint_IsLimitEnabled );
	function( "b3DistanceJoint_SetLengthRange(jointId, minLength, maxLength)", &b3DistanceJoint_SetLengthRange );
	function( "b3DistanceJoint_GetMinLength(jointId)", &b3DistanceJoint_GetMinLength );
	function( "b3DistanceJoint_GetMaxLength(jointId)", &b3DistanceJoint_GetMaxLength );
	function( "b3DistanceJoint_GetCurrentLength(jointId)", &b3DistanceJoint_GetCurrentLength );
	function( "b3DistanceJoint_EnableMotor(jointId, enableMotor)", &b3DistanceJoint_EnableMotor );
	function( "b3DistanceJoint_IsMotorEnabled(jointId)", &b3DistanceJoint_IsMotorEnabled );
	function( "b3DistanceJoint_SetMotorSpeed(jointId, motorSpeed)", &b3DistanceJoint_SetMotorSpeed );
	function( "b3DistanceJoint_GetMotorSpeed(jointId)", &b3DistanceJoint_GetMotorSpeed );
	function( "b3DistanceJoint_SetMaxMotorForce(jointId, force)", &b3DistanceJoint_SetMaxMotorForce );
	function( "b3DistanceJoint_GetMaxMotorForce(jointId)", &b3DistanceJoint_GetMaxMotorForce );
	function( "b3DistanceJoint_GetMotorForce(jointId)", &b3DistanceJoint_GetMotorForce );

	// motor joint
	function( "b3MotorJoint_SetLinearVelocity(jointId, velocity)", &b3MotorJoint_SetLinearVelocity );
	function( "b3MotorJoint_GetLinearVelocity(jointId)", &b3MotorJoint_GetLinearVelocity );
	function( "b3MotorJoint_SetAngularVelocity(jointId, velocity)", &b3MotorJoint_SetAngularVelocity );
	function( "b3MotorJoint_GetAngularVelocity(jointId)", &b3MotorJoint_GetAngularVelocity );
	function( "b3MotorJoint_SetMaxVelocityForce(jointId, maxForce)", &b3MotorJoint_SetMaxVelocityForce );
	function( "b3MotorJoint_GetMaxVelocityForce(jointId)", &b3MotorJoint_GetMaxVelocityForce );
	function( "b3MotorJoint_SetMaxVelocityTorque(jointId, maxTorque)", &b3MotorJoint_SetMaxVelocityTorque );
	function( "b3MotorJoint_GetMaxVelocityTorque(jointId)", &b3MotorJoint_GetMaxVelocityTorque );
	function( "b3MotorJoint_SetLinearHertz(jointId, hertz)", &b3MotorJoint_SetLinearHertz );
	function( "b3MotorJoint_GetLinearHertz(jointId)", &b3MotorJoint_GetLinearHertz );
	function( "b3MotorJoint_SetLinearDampingRatio(jointId, damping)", &b3MotorJoint_SetLinearDampingRatio );
	function( "b3MotorJoint_GetLinearDampingRatio(jointId)", &b3MotorJoint_GetLinearDampingRatio );
	function( "b3MotorJoint_SetAngularHertz(jointId, hertz)", &b3MotorJoint_SetAngularHertz );
	function( "b3MotorJoint_GetAngularHertz(jointId)", &b3MotorJoint_GetAngularHertz );
	function( "b3MotorJoint_SetAngularDampingRatio(jointId, damping)", &b3MotorJoint_SetAngularDampingRatio );
	function( "b3MotorJoint_GetAngularDampingRatio(jointId)", &b3MotorJoint_GetAngularDampingRatio );
	function( "b3MotorJoint_SetMaxSpringForce(jointId, maxForce)", &b3MotorJoint_SetMaxSpringForce );
	function( "b3MotorJoint_GetMaxSpringForce(jointId)", &b3MotorJoint_GetMaxSpringForce );
	function( "b3MotorJoint_SetMaxSpringTorque(jointId, maxTorque)", &b3MotorJoint_SetMaxSpringTorque );
	function( "b3MotorJoint_GetMaxSpringTorque(jointId)", &b3MotorJoint_GetMaxSpringTorque );

	// prismatic joint
	function( "b3PrismaticJoint_EnableSpring(jointId, enableSpring)", &b3PrismaticJoint_EnableSpring );
	function( "b3PrismaticJoint_IsSpringEnabled(jointId)", &b3PrismaticJoint_IsSpringEnabled );
	function( "b3PrismaticJoint_SetSpringHertz(jointId, hertz)", &b3PrismaticJoint_SetSpringHertz );
	function( "b3PrismaticJoint_GetSpringHertz(jointId)", &b3PrismaticJoint_GetSpringHertz );
	function( "b3PrismaticJoint_SetSpringDampingRatio(jointId, dampingRatio)", &b3PrismaticJoint_SetSpringDampingRatio );
	function( "b3PrismaticJoint_GetSpringDampingRatio(jointId)", &b3PrismaticJoint_GetSpringDampingRatio );
	function( "b3PrismaticJoint_SetTargetTranslation(jointId, targetTranslation)", &b3PrismaticJoint_SetTargetTranslation );
	function( "b3PrismaticJoint_GetTargetTranslation(jointId)", &b3PrismaticJoint_GetTargetTranslation );
	function( "b3PrismaticJoint_EnableLimit(jointId, enableLimit)", &b3PrismaticJoint_EnableLimit );
	function( "b3PrismaticJoint_IsLimitEnabled(jointId)", &b3PrismaticJoint_IsLimitEnabled );
	function( "b3PrismaticJoint_GetLowerLimit(jointId)", &b3PrismaticJoint_GetLowerLimit );
	function( "b3PrismaticJoint_GetUpperLimit(jointId)", &b3PrismaticJoint_GetUpperLimit );
	function( "b3PrismaticJoint_SetLimits(jointId, lower, upper)", &b3PrismaticJoint_SetLimits );
	function( "b3PrismaticJoint_EnableMotor(jointId, enableMotor)", &b3PrismaticJoint_EnableMotor );
	function( "b3PrismaticJoint_IsMotorEnabled(jointId)", &b3PrismaticJoint_IsMotorEnabled );
	function( "b3PrismaticJoint_SetMotorSpeed(jointId, motorSpeed)", &b3PrismaticJoint_SetMotorSpeed );
	function( "b3PrismaticJoint_GetMotorSpeed(jointId)", &b3PrismaticJoint_GetMotorSpeed );
	function( "b3PrismaticJoint_SetMaxMotorForce(jointId, force)", &b3PrismaticJoint_SetMaxMotorForce );
	function( "b3PrismaticJoint_GetMaxMotorForce(jointId)", &b3PrismaticJoint_GetMaxMotorForce );
	function( "b3PrismaticJoint_GetMotorForce(jointId)", &b3PrismaticJoint_GetMotorForce );
	function( "b3PrismaticJoint_GetTranslation(jointId)", &b3PrismaticJoint_GetTranslation );
	function( "b3PrismaticJoint_GetSpeed(jointId)", &b3PrismaticJoint_GetSpeed );

	// revolute joint
	function( "b3RevoluteJoint_EnableSpring(jointId, enableSpring)", &b3RevoluteJoint_EnableSpring );
	function( "b3RevoluteJoint_IsSpringEnabled(jointId)", &b3RevoluteJoint_IsSpringEnabled );
	function( "b3RevoluteJoint_SetSpringHertz(jointId, hertz)", &b3RevoluteJoint_SetSpringHertz );
	function( "b3RevoluteJoint_GetSpringHertz(jointId)", &b3RevoluteJoint_GetSpringHertz );
	function( "b3RevoluteJoint_SetSpringDampingRatio(jointId, dampingRatio)", &b3RevoluteJoint_SetSpringDampingRatio );
	function( "b3RevoluteJoint_GetSpringDampingRatio(jointId)", &b3RevoluteJoint_GetSpringDampingRatio );
	function( "b3RevoluteJoint_SetTargetAngle(jointId, targetRadians)", &b3RevoluteJoint_SetTargetAngle );
	function( "b3RevoluteJoint_GetTargetAngle(jointId)", &b3RevoluteJoint_GetTargetAngle );
	function( "b3RevoluteJoint_GetAngle(jointId)", &b3RevoluteJoint_GetAngle );
	function( "b3RevoluteJoint_EnableLimit(jointId, enableLimit)", &b3RevoluteJoint_EnableLimit );
	function( "b3RevoluteJoint_IsLimitEnabled(jointId)", &b3RevoluteJoint_IsLimitEnabled );
	function( "b3RevoluteJoint_GetLowerLimit(jointId)", &b3RevoluteJoint_GetLowerLimit );
	function( "b3RevoluteJoint_GetUpperLimit(jointId)", &b3RevoluteJoint_GetUpperLimit );
	function( "b3RevoluteJoint_SetLimits(jointId, lowerLimitRadians, upperLimitRadians)", &b3RevoluteJoint_SetLimits );
	function( "b3RevoluteJoint_EnableMotor(jointId, enableMotor)", &b3RevoluteJoint_EnableMotor );
	function( "b3RevoluteJoint_IsMotorEnabled(jointId)", &b3RevoluteJoint_IsMotorEnabled );
	function( "b3RevoluteJoint_SetMotorSpeed(jointId, motorSpeed)", &b3RevoluteJoint_SetMotorSpeed );
	function( "b3RevoluteJoint_GetMotorSpeed(jointId)", &b3RevoluteJoint_GetMotorSpeed );
	function( "b3RevoluteJoint_GetMotorTorque(jointId)", &b3RevoluteJoint_GetMotorTorque );
	function( "b3RevoluteJoint_SetMaxMotorTorque(jointId, torque)", &b3RevoluteJoint_SetMaxMotorTorque );
	function( "b3RevoluteJoint_GetMaxMotorTorque(jointId)", &b3RevoluteJoint_GetMaxMotorTorque );

	// spherical joint
	function( "b3SphericalJoint_EnableConeLimit(jointId, enableConeLimit)", &b3SphericalJoint_EnableConeLimit );
	function( "b3SphericalJoint_IsConeLimitEnabled(jointId)", &b3SphericalJoint_IsConeLimitEnabled );
	function( "b3SphericalJoint_GetConeLimit(jointId)", &b3SphericalJoint_GetConeLimit );
	function( "b3SphericalJoint_SetConeLimit(jointId, coneAngle)", &b3SphericalJoint_SetConeLimit );
	function( "b3SphericalJoint_GetConeAngle(jointId)", &b3SphericalJoint_GetConeAngle );
	function( "b3SphericalJoint_EnableTwistLimit(jointId, enableTwistLimit)", &b3SphericalJoint_EnableTwistLimit );
	function( "b3SphericalJoint_IsTwistLimitEnabled(jointId)", &b3SphericalJoint_IsTwistLimitEnabled );
	function( "b3SphericalJoint_GetLowerTwistLimit(jointId)", &b3SphericalJoint_GetLowerTwistLimit );
	function( "b3SphericalJoint_GetUpperTwistLimit(jointId)", &b3SphericalJoint_GetUpperTwistLimit );
	function( "b3SphericalJoint_SetTwistLimits(jointId, lowerLimitRadians, upperLimitRadians)", &b3SphericalJoint_SetTwistLimits );
	function( "b3SphericalJoint_GetTwistAngle(jointId)", &b3SphericalJoint_GetTwistAngle );
	function( "b3SphericalJoint_EnableSpring(jointId, enableSpring)", &b3SphericalJoint_EnableSpring );
	function( "b3SphericalJoint_IsSpringEnabled(jointId)", &b3SphericalJoint_IsSpringEnabled );
	function( "b3SphericalJoint_SetSpringHertz(jointId, hertz)", &b3SphericalJoint_SetSpringHertz );
	function( "b3SphericalJoint_GetSpringHertz(jointId)", &b3SphericalJoint_GetSpringHertz );
	function( "b3SphericalJoint_SetSpringDampingRatio(jointId, dampingRatio)", &b3SphericalJoint_SetSpringDampingRatio );
	function( "b3SphericalJoint_GetSpringDampingRatio(jointId)", &b3SphericalJoint_GetSpringDampingRatio );
	function( "b3SphericalJoint_SetTargetRotation(jointId, targetRotation)", &b3SphericalJoint_SetTargetRotation );
	function( "b3SphericalJoint_GetTargetRotation(jointId)", &b3SphericalJoint_GetTargetRotation );
	function( "b3SphericalJoint_EnableMotor(jointId, enableMotor)", &b3SphericalJoint_EnableMotor );
	function( "b3SphericalJoint_IsMotorEnabled(jointId)", &b3SphericalJoint_IsMotorEnabled );
	function( "b3SphericalJoint_SetMotorVelocity(jointId, velocity)", &b3SphericalJoint_SetMotorVelocity );
	function( "b3SphericalJoint_GetMotorVelocity(jointId)", &b3SphericalJoint_GetMotorVelocity );
	function( "b3SphericalJoint_GetMotorTorque(jointId)", &b3SphericalJoint_GetMotorTorque );
	function( "b3SphericalJoint_SetMaxMotorTorque(jointId, torque)", &b3SphericalJoint_SetMaxMotorTorque );
	function( "b3SphericalJoint_GetMaxMotorTorque(jointId)", &b3SphericalJoint_GetMaxMotorTorque );

	// weld joint
	function( "b3WeldJoint_SetLinearHertz(jointId, hertz)", &b3WeldJoint_SetLinearHertz );
	function( "b3WeldJoint_GetLinearHertz(jointId)", &b3WeldJoint_GetLinearHertz );
	function( "b3WeldJoint_SetLinearDampingRatio(jointId, dampingRatio)", &b3WeldJoint_SetLinearDampingRatio );
	function( "b3WeldJoint_GetLinearDampingRatio(jointId)", &b3WeldJoint_GetLinearDampingRatio );
	function( "b3WeldJoint_SetAngularHertz(jointId, hertz)", &b3WeldJoint_SetAngularHertz );
	function( "b3WeldJoint_GetAngularHertz(jointId)", &b3WeldJoint_GetAngularHertz );
	function( "b3WeldJoint_SetAngularDampingRatio(jointId, dampingRatio)", &b3WeldJoint_SetAngularDampingRatio );
	function( "b3WeldJoint_GetAngularDampingRatio(jointId)", &b3WeldJoint_GetAngularDampingRatio );

	// wheel joint
	function( "b3WheelJoint_EnableSuspension(jointId, flag)", &b3WheelJoint_EnableSuspension );
	function( "b3WheelJoint_IsSuspensionEnabled(jointId)", &b3WheelJoint_IsSuspensionEnabled );
	function( "b3WheelJoint_SetSuspensionHertz(jointId, hertz)", &b3WheelJoint_SetSuspensionHertz );
	function( "b3WheelJoint_GetSuspensionHertz(jointId)", &b3WheelJoint_GetSuspensionHertz );
	function( "b3WheelJoint_SetSuspensionDampingRatio(jointId, dampingRatio)", &b3WheelJoint_SetSuspensionDampingRatio );
	function( "b3WheelJoint_GetSuspensionDampingRatio(jointId)", &b3WheelJoint_GetSuspensionDampingRatio );
	function( "b3WheelJoint_EnableSuspensionLimit(jointId, flag)", &b3WheelJoint_EnableSuspensionLimit );
	function( "b3WheelJoint_IsSuspensionLimitEnabled(jointId)", &b3WheelJoint_IsSuspensionLimitEnabled );
	function( "b3WheelJoint_GetLowerSuspensionLimit(jointId)", &b3WheelJoint_GetLowerSuspensionLimit );
	function( "b3WheelJoint_GetUpperSuspensionLimit(jointId)", &b3WheelJoint_GetUpperSuspensionLimit );
	function( "b3WheelJoint_SetSuspensionLimits(jointId, lower, upper)", &b3WheelJoint_SetSuspensionLimits );
	function( "b3WheelJoint_EnableSpinMotor(jointId, flag)", &b3WheelJoint_EnableSpinMotor );
	function( "b3WheelJoint_IsSpinMotorEnabled(jointId)", &b3WheelJoint_IsSpinMotorEnabled );
	function( "b3WheelJoint_SetSpinMotorSpeed(jointId, motorSpeed)", &b3WheelJoint_SetSpinMotorSpeed );
	function( "b3WheelJoint_GetSpinMotorSpeed(jointId)", &b3WheelJoint_GetSpinMotorSpeed );
	function( "b3WheelJoint_SetMaxSpinTorque(jointId, torque)", &b3WheelJoint_SetMaxSpinTorque );
	function( "b3WheelJoint_GetMaxSpinTorque(jointId)", &b3WheelJoint_GetMaxSpinTorque );
	function( "b3WheelJoint_GetSpinSpeed(jointId)", &b3WheelJoint_GetSpinSpeed );
	function( "b3WheelJoint_GetSpinTorque(jointId)", &b3WheelJoint_GetSpinTorque );
	function( "b3WheelJoint_EnableSteering(jointId, flag)", &b3WheelJoint_EnableSteering );
	function( "b3WheelJoint_IsSteeringEnabled(jointId)", &b3WheelJoint_IsSteeringEnabled );
	function( "b3WheelJoint_SetSteeringHertz(jointId, hertz)", &b3WheelJoint_SetSteeringHertz );
	function( "b3WheelJoint_GetSteeringHertz(jointId)", &b3WheelJoint_GetSteeringHertz );
	function( "b3WheelJoint_SetSteeringDampingRatio(jointId, dampingRatio)", &b3WheelJoint_SetSteeringDampingRatio );
	function( "b3WheelJoint_GetSteeringDampingRatio(jointId)", &b3WheelJoint_GetSteeringDampingRatio );
	function( "b3WheelJoint_SetMaxSteeringTorque(jointId, torque)", &b3WheelJoint_SetMaxSteeringTorque );
	function( "b3WheelJoint_GetMaxSteeringTorque(jointId)", &b3WheelJoint_GetMaxSteeringTorque );
	function( "b3WheelJoint_EnableSteeringLimit(jointId, flag)", &b3WheelJoint_EnableSteeringLimit );
	function( "b3WheelJoint_IsSteeringLimitEnabled(jointId)", &b3WheelJoint_IsSteeringLimitEnabled );
	function( "b3WheelJoint_GetLowerSteeringLimit(jointId)", &b3WheelJoint_GetLowerSteeringLimit );
	function( "b3WheelJoint_GetUpperSteeringLimit(jointId)", &b3WheelJoint_GetUpperSteeringLimit );
	function( "b3WheelJoint_SetSteeringLimits(jointId, lower, upper)", &b3WheelJoint_SetSteeringLimits );
	function( "b3WheelJoint_SetTargetSteeringAngle(jointId, targetAngle)", &b3WheelJoint_SetTargetSteeringAngle );
	function( "b3WheelJoint_GetTargetSteeringAngle(jointId)", &b3WheelJoint_GetTargetSteeringAngle );
	function( "b3WheelJoint_GetSteeringAngle(jointId)", &b3WheelJoint_GetSteeringAngle );
	function( "b3WheelJoint_GetSteeringTorque(jointId)", &b3WheelJoint_GetSteeringTorque );
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

	function( "b3DefaultQueryFilter()", &b3DefaultQueryFilter );

	function( "b3World_CastRayClosest(worldId, origin, translation, filter)", &b3World_CastRayClosest );
	function( "b3Body_GetMassData(bodyId)", &b3Body_GetMassData );
	function( "b3Body_SetMassData(bodyId, massData)", &b3Body_SetMassData );
	function( "b3Body_GetLocalRotationalInertia(bodyId)", &b3Body_GetLocalRotationalInertia );
	function( "b3Body_GetWorldInverseRotationalInertia(bodyId)", &b3Body_GetWorldInverseRotationalInertia );
	function( "b3Shape_ComputeMassData(shapeId)", &b3Shape_ComputeMassData );
	function( "b3Shape_RayCast(shapeId, origin, translation)", &b3Shape_RayCast );

	function( "b3World_OverlapAABB(worldId, aabb, filter, callback)", +[]( b3WorldId worldId, b3AABB aabb, b3QueryFilter filter, val cb )
	{
		b3World_OverlapAABB( worldId, aabb, filter,
			[]( b3ShapeId shapeId, void* ctx ) -> bool
			{
				val r = ( *static_cast<val*>( ctx ) )( shapeId );
				return r.isUndefined() ? true : r.as<bool>();
			},
			&cb );
	} );
	function( "b3World_CastRay(worldId, origin, translation, filter, callback)", +[]( b3WorldId worldId, b3Vec3 origin, b3Vec3 translation, b3QueryFilter filter, val cb )
	{
		b3World_CastRay( worldId, origin, translation, filter,
			[]( b3ShapeId shapeId, b3Pos point, b3Vec3 normal, float fraction, uint64_t, int, int, void* ctx ) -> float
			{
				val r = ( *static_cast<val*>( ctx ) )( shapeId, point, normal, fraction );
				return r.isUndefined() ? 1.0f : r.as<float>();
			},
			&cb );
	} );

	// void* userData fields omitted from event structs.
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

	function( "b3World_GetBodyEvents(worldId)", +[]( b3WorldId worldId )
	{
		b3BodyEvents e = b3World_GetBodyEvents( worldId );
		val o = val::object();
		o.set( "moveEvents", eventsToArray( e.moveEvents, e.moveCount ) );
		return o;
	} );
	function( "b3World_GetSensorEvents(worldId)", +[]( b3WorldId worldId )
	{
		b3SensorEvents e = b3World_GetSensorEvents( worldId );
		val o = val::object();
		o.set( "beginEvents", eventsToArray( e.beginEvents, e.beginCount ) );
		o.set( "endEvents", eventsToArray( e.endEvents, e.endCount ) );
		return o;
	} );
	function( "b3World_GetContactEvents(worldId)", +[]( b3WorldId worldId )
	{
		b3ContactEvents e = b3World_GetContactEvents( worldId );
		val o = val::object();
		o.set( "beginEvents", eventsToArray( e.beginEvents, e.beginCount ) );
		o.set( "endEvents", eventsToArray( e.endEvents, e.endCount ) );
		o.set( "hitEvents", eventsToArray( e.hitEvents, e.hitCount ) );
		return o;
	} );
	function( "b3World_GetJointEvents(worldId)", +[]( b3WorldId worldId )
	{
		b3JointEvents e = b3World_GetJointEvents( worldId );
		val o = val::object();
		o.set( "jointEvents", eventsToArray( e.jointEvents, e.count ) );
		return o;
	} );

	function( "b3Distance(a, b)", &b3Distance );
	function( "b3DistanceSquared(a, b)", &b3DistanceSquared );
	function( "b3Cross(a, b)", &b3Cross );
	function( "b3RotateVector(q, v)", &b3RotateVector );
	function( "b3InvRotateVector(q, v)", &b3InvRotateVector );
	function( "b3TransformPoint(transform, v)", &b3TransformPoint );
	function( "b3MulTransforms(a, b)", &b3MulTransforms );
	function( "b3AABB_Union(a, b)", &b3AABB_Union );
	function( "b3MakeQuatFromAxisAngle(axis, radians)", &b3MakeQuatFromAxisAngle );
	function( "b3ComputeQuatBetweenUnitVectors(v1, v2)", &b3ComputeQuatBetweenUnitVectors );
	function( "b3InvMulQuat(a, b)", &b3InvMulQuat );
	function( "b3OffsetPos(p, v)", &b3OffsetPos );
	function( "b3Perp(v)", &b3Perp );
	function( "b3IsNormalized(v)", &b3IsNormalized );
	function( "b3IsValidPlane(p)", &b3IsValidPlane );
	function( "b3AABB_Area(aabb)", &b3AABB_Area );
	function( "b3AABB_Center(aabb)", &b3AABB_Center );
	function( "b3AABB_Extents(aabb)", &b3AABB_Extents );
	function( "b3ClosestPointToAABB(aabb, p)", &b3ClosestPointToAABB );
	value_object<b3CosSin>( "b3CosSin" ).field( "cosine", &b3CosSin::cosine ).field( "sine", &b3CosSin::sine );
	function( "b3ComputeCosSin(radians)", &b3ComputeCosSin );
	function( "b3GetLengthAndNormalize(v)", +[]( b3Vec3 a ) -> val
	{
		float length = 0.0f;
		b3Vec3 n = b3GetLengthAndNormalize( &length, a );
		val o = val::object(); o.set( "length", length ); o.set( "normalized", val( n ) ); return o;
	} );
	function( "b3GetAxisAngle(q)", +[]( b3Quat q ) -> val
	{
		float radians = 0.0f;
		b3Vec3 axis = b3GetAxisAngle( &radians, q );
		val o = val::object(); o.set( "radians", radians ); o.set( "axis", val( axis ) ); return o;
	} );

	// b3DynamicTree owns heap memory — opaque handle, never copied to JS by value. Category/mask/userData as 32-bit numbers.
	class_<b3DynamicTree>( "b3DynamicTree" );

	function( "b3CreateDynamicTree(proxyCapacity)", +[]( int proxyCapacity ) -> b3DynamicTree*
	{
		b3DynamicTree* tree = new b3DynamicTree();
		*tree = b3DynamicTree_Create( proxyCapacity );
		return tree;
	}, allow_raw_pointers() );

	function( "b3DestroyDynamicTree(tree)", +[]( b3DynamicTree* tree )
	{
		b3DynamicTree_Destroy( tree );
		delete tree;
	}, allow_raw_pointers() );

	function( "b3DynamicTree_CreateProxy(tree, aabb, categoryBits, userData)", +[]( b3DynamicTree* tree, b3AABB aabb, unsigned categoryBits, unsigned userData ) -> int
	{
		return b3DynamicTree_CreateProxy( tree, aabb, (uint64_t)categoryBits, (uint64_t)userData );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_DestroyProxy(tree, proxyId)", +[]( b3DynamicTree* tree, int proxyId )
	{
		b3DynamicTree_DestroyProxy( tree, proxyId );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_MoveProxy(tree, proxyId, aabb)", +[]( b3DynamicTree* tree, int proxyId, b3AABB aabb )
	{
		b3DynamicTree_MoveProxy( tree, proxyId, aabb );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_EnlargeProxy(tree, proxyId, aabb)", +[]( b3DynamicTree* tree, int proxyId, b3AABB aabb )
	{
		b3DynamicTree_EnlargeProxy( tree, proxyId, aabb );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_Query(tree, aabb, maskBits, callback)", +[]( b3DynamicTree* tree, b3AABB aabb, unsigned maskBits, val cb ) -> b3TreeStats
	{
		return b3DynamicTree_Query( tree, aabb, (uint64_t)maskBits, false,
			[]( int proxyId, uint64_t userData, void* ctx ) -> bool
			{
				val r = ( *static_cast<val*>( ctx ) )( proxyId, (unsigned)userData );
				return r.isUndefined() ? true : r.as<bool>();
			},
			&cb );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_RayCast(tree, origin, translation, maxFraction, maskBits, callback)", +[]( b3DynamicTree* tree, b3Vec3 origin, b3Vec3 translation, float maxFraction, unsigned maskBits, val cb ) -> b3TreeStats
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

	function( "b3DynamicTree_Rebuild(tree, fullBuild)", +[]( b3DynamicTree* tree, bool fullBuild ) -> int
	{
		return b3DynamicTree_Rebuild( tree, fullBuild );
	}, allow_raw_pointers() );

	function( "b3DynamicTree_GetHeight(tree)", +[]( b3DynamicTree* tree ) -> int { return b3DynamicTree_GetHeight( tree ); }, allow_raw_pointers() );
	function( "b3DynamicTree_GetAreaRatio(tree)", +[]( b3DynamicTree* tree ) -> float { return b3DynamicTree_GetAreaRatio( tree ); }, allow_raw_pointers() );
	function( "b3DynamicTree_GetProxyCount(tree)", +[]( b3DynamicTree* tree ) -> int { return b3DynamicTree_GetProxyCount( tree ); }, allow_raw_pointers() );
	function( "b3DynamicTree_GetRootBounds(tree)", +[]( b3DynamicTree* tree ) -> b3AABB { return b3DynamicTree_GetRootBounds( tree ); }, allow_raw_pointers() );
	function( "b3DynamicTree_GetByteCount(tree)", +[]( b3DynamicTree* tree ) -> int { return b3DynamicTree_GetByteCount( tree ); }, allow_raw_pointers() );
	function( "b3DynamicTree_Validate(tree)", +[]( b3DynamicTree* tree ) { b3DynamicTree_Validate( tree ); }, allow_raw_pointers() );
	function( "b3DynamicTree_QueryClosest(tree, point, maskBits, callback)", +[]( b3DynamicTree* tree, b3Vec3 point, unsigned maskBits, val cb ) -> b3TreeStats
	{
		float minDistanceSqr = 3.4e38f;
		return b3DynamicTree_QueryClosest( tree, point, (uint64_t)maskBits, false,
			[]( float distanceSqrMin, int proxyId, uint64_t userData, void* ctx ) -> float
			{
				val r = ( *static_cast<val*>( ctx ) )( distanceSqrMin, proxyId, (unsigned)userData );
				return r.isUndefined() ? distanceSqrMin : r.as<float>();
			},
			&cb, &minDistanceSqr );
	}, allow_raw_pointers() );

	value_object<b3TreeStats>( "b3TreeStats" )
		.field( "nodeVisits", &b3TreeStats::nodeVisits )
		.field( "leafVisits", &b3TreeStats::leafVisits );

	// b3Recording / b3RecPlayer are opaque types — passed as uintptr_t handles. File I/O omitted (FILESYSTEM=0).
	function( "b3CreateRecording(byteCapacity)", +[]( int byteCapacity ) -> uintptr_t
	{ return reinterpret_cast<uintptr_t>( b3CreateRecording( byteCapacity ) ); } );
	function( "b3DestroyRecording(recording)", +[]( uintptr_t rec )
	{ b3DestroyRecording( reinterpret_cast<b3Recording*>( rec ) ); } );
	function( "b3World_StartRecording(worldId, recording)", +[]( b3WorldId worldId, uintptr_t rec )
	{ b3World_StartRecording( worldId, reinterpret_cast<b3Recording*>( rec ) ); } );
	function( "b3World_StopRecording(worldId)", &b3World_StopRecording );
	function( "b3Recording_GetSize(recording)", +[]( uintptr_t rec )
	{ return b3Recording_GetSize( reinterpret_cast<b3Recording*>( rec ) ); } );

	// Build a player straight from a recording (avoids marshalling the byte buffer).
	function( "b3RecPlayer_CreateFromRecording(recording, workerCount)", +[]( uintptr_t rec, int workerCount ) -> uintptr_t
	{
		b3Recording* r = reinterpret_cast<b3Recording*>( rec );
		return reinterpret_cast<uintptr_t>( b3RecPlayer_Create( b3Recording_GetData( r ), b3Recording_GetSize( r ), workerCount ) );
	} );
	function( "b3RecPlayer_Destroy(player)", +[]( uintptr_t p ) { b3RecPlayer_Destroy( reinterpret_cast<b3RecPlayer*>( p ) ); } );
	function( "b3RecPlayer_StepFrame(player)", +[]( uintptr_t p ) { return b3RecPlayer_StepFrame( reinterpret_cast<b3RecPlayer*>( p ) ); } );
	function( "b3RecPlayer_Restart(player)", +[]( uintptr_t p ) { b3RecPlayer_Restart( reinterpret_cast<b3RecPlayer*>( p ) ); } );
	function( "b3RecPlayer_SeekFrame(player, frame)", +[]( uintptr_t p, int frame ) { b3RecPlayer_SeekFrame( reinterpret_cast<b3RecPlayer*>( p ), frame ); } );
	function( "b3RecPlayer_GetWorldId(player)", +[]( uintptr_t p ) { return b3RecPlayer_GetWorldId( reinterpret_cast<b3RecPlayer*>( p ) ); } );
	function( "b3RecPlayer_GetFrame(player)", +[]( uintptr_t p ) { return b3RecPlayer_GetFrame( reinterpret_cast<b3RecPlayer*>( p ) ); } );
	function( "b3RecPlayer_GetFrameCount(player)", +[]( uintptr_t p ) { return b3RecPlayer_GetFrameCount( reinterpret_cast<b3RecPlayer*>( p ) ); } );
	function( "b3RecPlayer_IsAtEnd(player)", +[]( uintptr_t p ) { return b3RecPlayer_IsAtEnd( reinterpret_cast<b3RecPlayer*>( p ) ); } );
	function( "b3RecPlayer_GetBodyCount(player)", +[]( uintptr_t p ) { return b3RecPlayer_GetBodyCount( reinterpret_cast<b3RecPlayer*>( p ) ); } );
	function( "b3RecPlayer_GetBodyId(player, index)", +[]( uintptr_t p, int index ) { return b3RecPlayer_GetBodyId( reinterpret_cast<b3RecPlayer*>( p ), index ); } );
	function( "b3RecPlayer_HasDiverged(player)", +[]( uintptr_t p ) { return b3RecPlayer_HasDiverged( reinterpret_cast<b3RecPlayer*>( p ) ); } );
	function( "b3RecPlayer_GetDivergeFrame(player)", +[]( uintptr_t p ) { return b3RecPlayer_GetDivergeFrame( reinterpret_cast<b3RecPlayer*>( p ) ); } );
	function( "b3RecPlayer_SetWorkerCount(player, count)", +[]( uintptr_t p, int count ) { b3RecPlayer_SetWorkerCount( reinterpret_cast<b3RecPlayer*>( p ), count ); } );

	function( "b3World_Draw(worldId, handler)", &worldDraw );
}
