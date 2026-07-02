// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
interface WasmModule {
}

type EmbindString = ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|string;
export interface ClassHandle {
  isAliasOf(other: ClassHandle): boolean;
  delete(): void;
  deleteLater(): this;
  isDeleted(): boolean;
  // @ts-ignore - If targeting lower than ESNext, this symbol might not exist.
  [Symbol.dispose](): void;
  clone(): this;
}
export interface b3BodyTypeValue<T extends number> {
  value: T;
}
export type b3BodyType = b3BodyTypeValue<0>|b3BodyTypeValue<1>|b3BodyTypeValue<2>;

export interface b3ShapeTypeValue<T extends number> {
  value: T;
}
export type b3ShapeType = b3ShapeTypeValue<0>|b3ShapeTypeValue<1>|b3ShapeTypeValue<2>|b3ShapeTypeValue<3>|b3ShapeTypeValue<4>|b3ShapeTypeValue<5>;

export interface b3JointTypeValue<T extends number> {
  value: T;
}
export type b3JointType = b3JointTypeValue<0>|b3JointTypeValue<1>|b3JointTypeValue<2>|b3JointTypeValue<3>|b3JointTypeValue<4>|b3JointTypeValue<5>|b3JointTypeValue<6>|b3JointTypeValue<7>|b3JointTypeValue<8>;

export interface b3HullData extends ClassHandle {
}

export interface b3MeshData extends ClassHandle {
}

export interface b3CompoundData extends ClassHandle {
}

export interface b3HeightFieldData extends ClassHandle {
}

export interface b3TOIStateValue<T extends number> {
  value: T;
}
export type b3TOIState = b3TOIStateValue<0>|b3TOIStateValue<1>|b3TOIStateValue<2>|b3TOIStateValue<3>|b3TOIStateValue<4>;

export interface b3ShapeIdVector extends ClassHandle {
  push_back(_0: b3ShapeId): void;
  resize(_0: number, _1: b3ShapeId): void;
  size(): number;
  get(_0: number): b3ShapeId | undefined;
  set(_0: number, _1: b3ShapeId): boolean;
}

export interface b3JointIdVector extends ClassHandle {
  push_back(_0: b3JointId): void;
  resize(_0: number, _1: b3JointId): void;
  size(): number;
  get(_0: number): b3JointId | undefined;
  set(_0: number, _1: b3JointId): boolean;
}

export interface b3DynamicTree extends ClassHandle {
}

export type b3MotionLocks = {
  linearX: boolean,
  linearY: boolean,
  linearZ: boolean,
  angularX: boolean,
  angularY: boolean,
  angularZ: boolean
};

export type b3WorldId = {
  index1: number,
  generation: number
};

export type Version = {
  major: number,
  minor: number,
  revision: number
};

export type b3BodyId = {
  index1: number,
  world0: number,
  generation: number
};

export type b3ShapeId = {
  index1: number,
  world0: number,
  generation: number
};

export type b3SensorBeginTouchEvent = {
  sensorShapeId: b3ShapeId,
  visitorShapeId: b3ShapeId
};

export type b3SensorEndTouchEvent = {
  sensorShapeId: b3ShapeId,
  visitorShapeId: b3ShapeId
};

export type b3JointId = {
  index1: number,
  world0: number,
  generation: number
};

export type b3JointEvent = {
  jointId: b3JointId
};

export type b3Capacity = {
  staticShapeCount: number,
  dynamicShapeCount: number,
  staticBodyCount: number,
  dynamicBodyCount: number,
  contactCount: number
};

export type b3Counters = {
  bodyCount: number,
  shapeCount: number,
  contactCount: number,
  jointCount: number,
  islandCount: number,
  stackUsed: number,
  byteCount: number,
  taskCount: number,
  awakeContactCount: number,
  treeHeight: number,
  staticTreeHeight: number
};

export type b3TreeStats = {
  nodeVisits: number,
  leafVisits: number
};

export type b3ContactId = {
  index1: number,
  world0: number,
  padding: number,
  generation: number
};

export type b3ContactBeginTouchEvent = {
  shapeIdA: b3ShapeId,
  shapeIdB: b3ShapeId,
  contactId: b3ContactId
};

export type b3ContactEndTouchEvent = {
  shapeIdA: b3ShapeId,
  shapeIdB: b3ShapeId,
  contactId: b3ContactId
};

export type b3Filter = {
  categoryBits: bigint,
  maskBits: bigint,
  groupIndex: number
};

export type b3QueryFilter = {
  categoryBits: bigint,
  maskBits: bigint,
  id: bigint
};

export type b3Vec3 = {
  x: number,
  y: number,
  z: number
};

export type b3AABB = {
  lowerBound: b3Vec3,
  upperBound: b3Vec3
};

export type b3PlaneSolverResult = {
  delta: b3Vec3,
  iterationCount: number
};

export type b3Matrix3 = {
  cx: b3Vec3,
  cy: b3Vec3,
  cz: b3Vec3
};

export type b3Quat = {
  v: b3Vec3,
  s: number
};

export type b3Transform = {
  p: b3Vec3,
  q: b3Quat
};

export type b3BodyMoveEvent = {
  transform: b3Transform,
  bodyId: b3BodyId,
  fellAsleep: boolean
};

export type b3Sweep = {
  localCenter: b3Vec3,
  c1: b3Vec3,
  c2: b3Vec3,
  q1: b3Quat,
  q2: b3Quat
};

export type b3Plane = {
  normal: b3Vec3,
  offset: number
};

export type b3PlaneResult = {
  plane: b3Plane,
  point: b3Vec3
};

export type b3Sphere = {
  center: b3Vec3,
  radius: number
};

export type b3Capsule = {
  center1: b3Vec3,
  center2: b3Vec3,
  radius: number
};

export type b3SurfaceMaterial = {
  friction: number,
  restitution: number,
  rollingResistance: number,
  tangentVelocity: b3Vec3,
  userMaterialId: bigint,
  customColor: number
};

export type b3WorldDef = {
  gravity: b3Vec3,
  restitutionThreshold: number,
  hitEventThreshold: number,
  contactHertz: number,
  contactDampingRatio: number,
  contactSpeed: number,
  maximumLinearSpeed: number,
  enableSleep: boolean,
  enableContinuous: boolean,
  workerCount: number,
  capacity: b3Capacity,
  internalValue: number
};

export type b3BodyDef = {
  type: b3BodyType,
  position: b3Vec3,
  rotation: b3Quat,
  linearVelocity: b3Vec3,
  angularVelocity: b3Vec3,
  linearDamping: number,
  angularDamping: number,
  gravityScale: number,
  sleepThreshold: number,
  motionLocks: b3MotionLocks,
  enableSleep: boolean,
  isAwake: boolean,
  isBullet: boolean,
  isEnabled: boolean,
  allowFastRotation: boolean,
  enableContactRecycling: boolean,
  internalValue: number
};

export type b3ShapeDef = {
  baseMaterial: b3SurfaceMaterial,
  density: number,
  explosionScale: number,
  filter: b3Filter,
  enableCustomFiltering: boolean,
  isSensor: boolean,
  enableSensorEvents: boolean,
  enableContactEvents: boolean,
  enableHitEvents: boolean,
  enablePreSolveEvents: boolean,
  invokeContactCreation: boolean,
  updateBodyMass: boolean,
  internalValue: number
};

export type b3CollisionPlane = {
  plane: b3Plane,
  pushLimit: number,
  push: number,
  clipVelocity: boolean
};

export type b3DistanceOutput = {
  pointA: b3Vec3,
  pointB: b3Vec3,
  normal: b3Vec3,
  distance: number,
  iterations: number,
  simplexCount: number
};

export type b3TOIOutput = {
  state: b3TOIState,
  point: b3Vec3,
  normal: b3Vec3,
  fraction: number,
  distance: number,
  distanceIterations: number,
  pushBackIterations: number,
  rootIterations: number,
  usedFallback: boolean
};

export type b3Profile = {
  step: number,
  pairs: number,
  collide: number,
  solve: number,
  solverSetup: number,
  constraints: number,
  prepareConstraints: number,
  integrateVelocities: number,
  warmStart: number,
  solveImpulses: number,
  integratePositions: number,
  relaxImpulses: number,
  applyRestitution: number,
  storeImpulses: number,
  splitIslands: number,
  transforms: number,
  sensorHits: number,
  jointEvents: number,
  hitEvents: number,
  refit: number,
  bullets: number,
  sleepIslands: number,
  sensors: number
};

export type b3ExplosionDef = {
  maskBits: bigint,
  position: b3Vec3,
  radius: number,
  falloff: number,
  impulsePerArea: number
};

export type b3BodyCastResult = {
  shapeId: b3ShapeId,
  point: b3Vec3,
  normal: b3Vec3,
  fraction: number,
  triangleIndex: number,
  iterations: number,
  hit: boolean
};

export type b3JointDef = {
  bodyIdA: b3BodyId,
  bodyIdB: b3BodyId,
  localFrameA: b3Transform,
  localFrameB: b3Transform,
  forceThreshold: number,
  torqueThreshold: number,
  constraintHertz: number,
  constraintDampingRatio: number,
  drawScale: number,
  collideConnected: boolean,
  internalValue: number
};

export type b3FilterJointDef = {
  base: b3JointDef
};

export type b3DistanceJointDef = {
  base: b3JointDef,
  length: number,
  enableSpring: boolean,
  lowerSpringForce: number,
  upperSpringForce: number,
  hertz: number,
  dampingRatio: number,
  enableLimit: boolean,
  minLength: number,
  maxLength: number,
  enableMotor: boolean,
  maxMotorForce: number,
  motorSpeed: number
};

export type b3RevoluteJointDef = {
  base: b3JointDef,
  targetAngle: number,
  enableSpring: boolean,
  hertz: number,
  dampingRatio: number,
  enableLimit: boolean,
  lowerAngle: number,
  upperAngle: number,
  enableMotor: boolean,
  maxMotorTorque: number,
  motorSpeed: number
};

export type b3PrismaticJointDef = {
  base: b3JointDef,
  enableSpring: boolean,
  hertz: number,
  dampingRatio: number,
  targetTranslation: number,
  enableLimit: boolean,
  lowerTranslation: number,
  upperTranslation: number,
  enableMotor: boolean,
  maxMotorForce: number,
  motorSpeed: number
};

export type b3WheelJointDef = {
  base: b3JointDef,
  enableSuspensionSpring: boolean,
  suspensionHertz: number,
  suspensionDampingRatio: number,
  enableSuspensionLimit: boolean,
  lowerSuspensionLimit: number,
  upperSuspensionLimit: number,
  enableSpinMotor: boolean,
  maxSpinTorque: number,
  spinSpeed: number,
  enableSteering: boolean,
  steeringHertz: number,
  steeringDampingRatio: number,
  targetSteeringAngle: number,
  maxSteeringTorque: number,
  enableSteeringLimit: boolean,
  lowerSteeringLimit: number,
  upperSteeringLimit: number
};

export type b3WeldJointDef = {
  base: b3JointDef,
  linearHertz: number,
  angularHertz: number,
  linearDampingRatio: number,
  angularDampingRatio: number
};

export type b3SphericalJointDef = {
  base: b3JointDef,
  enableSpring: boolean,
  hertz: number,
  dampingRatio: number,
  targetRotation: b3Quat,
  enableConeLimit: boolean,
  coneAngle: number,
  enableTwistLimit: boolean,
  lowerTwistAngle: number,
  upperTwistAngle: number,
  enableMotor: boolean,
  maxMotorTorque: number,
  motorVelocity: b3Vec3
};

export type b3MotorJointDef = {
  base: b3JointDef,
  linearVelocity: b3Vec3,
  maxVelocityForce: number,
  angularVelocity: b3Vec3,
  maxVelocityTorque: number,
  linearHertz: number,
  linearDampingRatio: number,
  maxSpringForce: number,
  angularHertz: number,
  angularDampingRatio: number,
  maxSpringTorque: number
};

export type b3ParallelJointDef = {
  base: b3JointDef,
  hertz: number,
  dampingRatio: number,
  maxTorque: number
};

export type b3MassData = {
  mass: number,
  center: b3Vec3,
  inertia: b3Matrix3
};

export type b3RayResult = {
  shapeId: b3ShapeId,
  point: b3Vec3,
  normal: b3Vec3,
  userMaterialId: bigint,
  fraction: number,
  triangleIndex: number,
  childIndex: number,
  nodeVisits: number,
  leafVisits: number,
  hit: boolean
};

export type b3WorldCastOutput = {
  normal: b3Vec3,
  point: b3Vec3,
  fraction: number,
  iterations: number,
  triangleIndex: number,
  childIndex: number,
  materialIndex: number,
  hit: boolean
};

export type b3ContactHitEvent = {
  shapeIdA: b3ShapeId,
  shapeIdB: b3ShapeId,
  contactId: b3ContactId,
  point: b3Vec3,
  normal: b3Vec3,
  approachSpeed: number,
  userMaterialIdA: bigint,
  userMaterialIdB: bigint
};

export type b3CosSin = {
  cosine: number,
  sine: number
};

interface EmbindModule {
  b3BodyType: {b3_staticBody: b3BodyTypeValue<0>, b3_kinematicBody: b3BodyTypeValue<1>, b3_dynamicBody: b3BodyTypeValue<2>};
  b3ShapeType: {b3_capsuleShape: b3ShapeTypeValue<0>, b3_compoundShape: b3ShapeTypeValue<1>, b3_heightShape: b3ShapeTypeValue<2>, b3_hullShape: b3ShapeTypeValue<3>, b3_meshShape: b3ShapeTypeValue<4>, b3_sphereShape: b3ShapeTypeValue<5>};
  b3JointType: {b3_parallelJoint: b3JointTypeValue<0>, b3_distanceJoint: b3JointTypeValue<1>, b3_filterJoint: b3JointTypeValue<2>, b3_motorJoint: b3JointTypeValue<3>, b3_prismaticJoint: b3JointTypeValue<4>, b3_revoluteJoint: b3JointTypeValue<5>, b3_sphericalJoint: b3JointTypeValue<6>, b3_weldJoint: b3JointTypeValue<7>, b3_wheelJoint: b3JointTypeValue<8>};
  b3HullData: {};
  b3MeshData: {};
  b3CompoundData: {};
  b3HeightFieldData: {};
  b3TOIState: {b3_toiStateUnknown: b3TOIStateValue<0>, b3_toiStateFailed: b3TOIStateValue<1>, b3_toiStateOverlapped: b3TOIStateValue<2>, b3_toiStateHit: b3TOIStateValue<3>, b3_toiStateSeparated: b3TOIStateValue<4>};
  b3ShapeIdVector: {
    new(): b3ShapeIdVector;
  };
  b3JointIdVector: {
    new(): b3JointIdVector;
  };
  b3DynamicTree: {};
  b3DestroyHull(_0: b3HullData | null): void;
  b3DestroyMesh(_0: b3MeshData | null): void;
  b3DestroyCompound(_0: b3CompoundData | null): void;
  b3DestroyHeightField(_0: b3HeightFieldData | null): void;
  b3DestroyDynamicTree(_0: b3DynamicTree | null): void;
  b3DynamicTree_Validate(_0: b3DynamicTree | null): void;
  b3IsDoublePrecision(): boolean;
  b3DestroyWorld(worldId: b3WorldId): void;
  b3World_IsValid(worldId: b3WorldId): boolean;
  b3World_EnableSleeping(_0: b3WorldId, _1: boolean): void;
  b3World_IsSleepingEnabled(_0: b3WorldId): boolean;
  b3World_EnableContinuous(_0: b3WorldId, _1: boolean): void;
  b3World_IsContinuousEnabled(_0: b3WorldId): boolean;
  b3World_EnableWarmStarting(_0: b3WorldId, _1: boolean): void;
  b3World_IsWarmStartingEnabled(_0: b3WorldId): boolean;
  b3World_RebuildStaticTree(_0: b3WorldId): void;
  b3World_EnableSpeculative(_0: b3WorldId, _1: boolean): void;
  b3World_DumpShapeBounds(_0: b3WorldId, _1: b3BodyType): void;
  b3World_StopRecording(_0: b3WorldId): void;
  b3GetVersion(): Version;
  b3GetByteCount(): number;
  b3DestroyBody(_0: b3BodyId): void;
  b3Body_IsValid(_0: b3BodyId): boolean;
  b3Body_GetType(_0: b3BodyId): b3BodyType;
  b3Body_SetType(_0: b3BodyId, _1: b3BodyType): void;
  b3Body_ApplyMassFromShapes(_0: b3BodyId): void;
  b3Body_IsAwake(_0: b3BodyId): boolean;
  b3Body_SetAwake(_0: b3BodyId, _1: boolean): void;
  b3Body_EnableSleep(_0: b3BodyId, _1: boolean): void;
  b3Body_IsSleepEnabled(_0: b3BodyId): boolean;
  b3Body_IsEnabled(_0: b3BodyId): boolean;
  b3Body_Disable(_0: b3BodyId): void;
  b3Body_Enable(_0: b3BodyId): void;
  b3Body_SetMotionLocks(_0: b3BodyId, _1: b3MotionLocks): void;
  b3Body_GetMotionLocks(_0: b3BodyId): b3MotionLocks;
  b3Body_SetBullet(_0: b3BodyId, _1: boolean): void;
  b3Body_IsBullet(_0: b3BodyId): boolean;
  b3Body_EnableContactRecycling(_0: b3BodyId, _1: boolean): void;
  b3Body_IsContactRecyclingEnabled(_0: b3BodyId): boolean;
  b3Body_EnableHitEvents(_0: b3BodyId, _1: boolean): void;
  b3Body_GetWorld(_0: b3BodyId): b3WorldId;
  b3Body_GetShapes(_0: b3BodyId): b3ShapeIdVector;
  b3Body_GetJoints(_0: b3BodyId): b3JointIdVector;
  b3Shape_IsValid(_0: b3ShapeId): boolean;
  b3Shape_GetType(_0: b3ShapeId): b3ShapeType;
  b3Shape_GetBody(_0: b3ShapeId): b3BodyId;
  b3Shape_GetWorld(_0: b3ShapeId): b3WorldId;
  b3Shape_IsSensor(_0: b3ShapeId): boolean;
  b3Shape_EnableSensorEvents(_0: b3ShapeId, _1: boolean): void;
  b3Shape_AreSensorEventsEnabled(_0: b3ShapeId): boolean;
  b3Shape_EnableContactEvents(_0: b3ShapeId, _1: boolean): void;
  b3Shape_AreContactEventsEnabled(_0: b3ShapeId): boolean;
  b3Shape_EnablePreSolveEvents(_0: b3ShapeId, _1: boolean): void;
  b3Shape_ArePreSolveEventsEnabled(_0: b3ShapeId): boolean;
  b3Shape_EnableHitEvents(_0: b3ShapeId, _1: boolean): void;
  b3Shape_AreHitEventsEnabled(_0: b3ShapeId): boolean;
  b3DestroyShape(_0: b3ShapeId, _1: boolean): void;
  b3DestroyJoint(_0: b3JointId, _1: boolean): void;
  b3Joint_IsValid(_0: b3JointId): boolean;
  b3Joint_GetType(_0: b3JointId): b3JointType;
  b3Joint_GetBodyA(_0: b3JointId): b3BodyId;
  b3Joint_GetBodyB(_0: b3JointId): b3BodyId;
  b3Joint_GetWorld(_0: b3JointId): b3WorldId;
  b3Joint_SetCollideConnected(_0: b3JointId, _1: boolean): void;
  b3Joint_GetCollideConnected(_0: b3JointId): boolean;
  b3Joint_WakeBodies(_0: b3JointId): void;
  b3DistanceJoint_EnableSpring(_0: b3JointId, _1: boolean): void;
  b3DistanceJoint_IsSpringEnabled(_0: b3JointId): boolean;
  b3DistanceJoint_EnableLimit(_0: b3JointId, _1: boolean): void;
  b3DistanceJoint_IsLimitEnabled(_0: b3JointId): boolean;
  b3DistanceJoint_EnableMotor(_0: b3JointId, _1: boolean): void;
  b3DistanceJoint_IsMotorEnabled(_0: b3JointId): boolean;
  b3PrismaticJoint_EnableSpring(_0: b3JointId, _1: boolean): void;
  b3PrismaticJoint_IsSpringEnabled(_0: b3JointId): boolean;
  b3PrismaticJoint_EnableLimit(_0: b3JointId, _1: boolean): void;
  b3PrismaticJoint_IsLimitEnabled(_0: b3JointId): boolean;
  b3PrismaticJoint_EnableMotor(_0: b3JointId, _1: boolean): void;
  b3PrismaticJoint_IsMotorEnabled(_0: b3JointId): boolean;
  b3RevoluteJoint_EnableSpring(_0: b3JointId, _1: boolean): void;
  b3RevoluteJoint_IsSpringEnabled(_0: b3JointId): boolean;
  b3RevoluteJoint_EnableLimit(_0: b3JointId, _1: boolean): void;
  b3RevoluteJoint_IsLimitEnabled(_0: b3JointId): boolean;
  b3RevoluteJoint_EnableMotor(_0: b3JointId, _1: boolean): void;
  b3RevoluteJoint_IsMotorEnabled(_0: b3JointId): boolean;
  b3SphericalJoint_EnableConeLimit(_0: b3JointId, _1: boolean): void;
  b3SphericalJoint_IsConeLimitEnabled(_0: b3JointId): boolean;
  b3SphericalJoint_EnableTwistLimit(_0: b3JointId, _1: boolean): void;
  b3SphericalJoint_IsTwistLimitEnabled(_0: b3JointId): boolean;
  b3SphericalJoint_EnableSpring(_0: b3JointId, _1: boolean): void;
  b3SphericalJoint_IsSpringEnabled(_0: b3JointId): boolean;
  b3SphericalJoint_EnableMotor(_0: b3JointId, _1: boolean): void;
  b3SphericalJoint_IsMotorEnabled(_0: b3JointId): boolean;
  b3WheelJoint_EnableSuspension(_0: b3JointId, _1: boolean): void;
  b3WheelJoint_IsSuspensionEnabled(_0: b3JointId): boolean;
  b3WheelJoint_EnableSuspensionLimit(_0: b3JointId, _1: boolean): void;
  b3WheelJoint_IsSuspensionLimitEnabled(_0: b3JointId): boolean;
  b3WheelJoint_EnableSpinMotor(_0: b3JointId, _1: boolean): void;
  b3WheelJoint_IsSpinMotorEnabled(_0: b3JointId): boolean;
  b3WheelJoint_EnableSteering(_0: b3JointId, _1: boolean): void;
  b3WheelJoint_IsSteeringEnabled(_0: b3JointId): boolean;
  b3WheelJoint_EnableSteeringLimit(_0: b3JointId, _1: boolean): void;
  b3WheelJoint_IsSteeringLimitEnabled(_0: b3JointId): boolean;
  b3World_GetMaxCapacity(_0: b3WorldId): b3Capacity;
  b3GetWorldCount(): number;
  b3GetMaxWorldCount(): number;
  b3World_GetAwakeBodyCount(_0: b3WorldId): number;
  b3World_SetWorkerCount(_0: b3WorldId, _1: number): void;
  b3World_GetWorkerCount(_0: b3WorldId): number;
  b3World_GetCounters(_0: b3WorldId): b3Counters;
  b3Body_GetShapeCount(_0: b3BodyId): number;
  b3Body_GetJointCount(_0: b3BodyId): number;
  b3CreateDynamicTree(_0: number): b3DynamicTree | null;
  b3DynamicTree_DestroyProxy(_0: b3DynamicTree | null, _1: number): void;
  b3DynamicTree_Rebuild(_0: b3DynamicTree | null, _1: boolean): number;
  b3DynamicTree_GetHeight(_0: b3DynamicTree | null): number;
  b3DynamicTree_GetProxyCount(_0: b3DynamicTree | null): number;
  b3DynamicTree_GetByteCount(_0: b3DynamicTree | null): number;
  b3CreateRecording(_0: number): number;
  b3DestroyRecording(_0: number): void;
  b3World_StartRecording(_0: b3WorldId, _1: number): void;
  b3Recording_GetSize(_0: number): number;
  b3RecPlayer_CreateFromRecording(_0: number, _1: number): number;
  b3RecPlayer_Destroy(_0: number): void;
  b3RecPlayer_StepFrame(_0: number): boolean;
  b3RecPlayer_Restart(_0: number): void;
  b3RecPlayer_SeekFrame(_0: number, _1: number): void;
  b3RecPlayer_GetWorldId(_0: number): b3WorldId;
  b3RecPlayer_GetFrame(_0: number): number;
  b3RecPlayer_GetFrameCount(_0: number): number;
  b3RecPlayer_IsAtEnd(_0: number): boolean;
  b3RecPlayer_GetBodyCount(_0: number): number;
  b3RecPlayer_GetBodyId(_0: number, _1: number): b3BodyId;
  b3RecPlayer_HasDiverged(_0: number): boolean;
  b3RecPlayer_GetDivergeFrame(_0: number): number;
  b3RecPlayer_SetWorkerCount(_0: number, _1: number): void;
  b3DefaultFilter(): b3Filter;
  b3Shape_GetFilter(_0: b3ShapeId): b3Filter;
  b3Shape_SetFilter(_0: b3ShapeId, _1: b3Filter, _2: boolean): void;
  b3DefaultQueryFilter(): b3QueryFilter;
  b3World_GetBounds(_0: b3WorldId): b3AABB;
  b3Body_ComputeAABB(_0: b3BodyId): b3AABB;
  b3Shape_GetAABB(_0: b3ShapeId): b3AABB;
  b3AABB_Union(_0: b3AABB, _1: b3AABB): b3AABB;
  b3DynamicTree_CreateProxy(_0: b3DynamicTree | null, _1: b3AABB, _2: number, _3: number): number;
  b3DynamicTree_MoveProxy(_0: b3DynamicTree | null, _1: number, _2: b3AABB): void;
  b3DynamicTree_EnlargeProxy(_0: b3DynamicTree | null, _1: number, _2: b3AABB): void;
  b3DynamicTree_GetRootBounds(_0: b3DynamicTree | null): b3AABB;
  b3World_SetGravity(_0: b3WorldId, _1: b3Vec3): void;
  b3World_GetGravity(_0: b3WorldId): b3Vec3;
  b3Body_GetPosition(_0: b3BodyId): b3Vec3;
  b3Body_GetLinearVelocity(_0: b3BodyId): b3Vec3;
  b3Body_GetAngularVelocity(_0: b3BodyId): b3Vec3;
  b3CreateBoxMesh(_0: b3Vec3, _1: b3Vec3, _2: boolean): b3MeshData | null;
  b3CreateHollowBoxMesh(_0: b3Vec3, _1: b3Vec3): b3MeshData | null;
  b3CreateGrid(_0: number, _1: number, _2: b3Vec3, _3: boolean): b3HeightFieldData | null;
  b3Body_GetLocalPoint(_0: b3BodyId, _1: b3Vec3): b3Vec3;
  b3Body_GetWorldPoint(_0: b3BodyId, _1: b3Vec3): b3Vec3;
  b3Body_GetLocalVector(_0: b3BodyId, _1: b3Vec3): b3Vec3;
  b3Body_GetWorldVector(_0: b3BodyId, _1: b3Vec3): b3Vec3;
  b3Body_SetLinearVelocity(_0: b3BodyId, _1: b3Vec3): void;
  b3Body_SetAngularVelocity(_0: b3BodyId, _1: b3Vec3): void;
  b3Body_GetLocalPointVelocity(_0: b3BodyId, _1: b3Vec3): b3Vec3;
  b3Body_GetWorldPointVelocity(_0: b3BodyId, _1: b3Vec3): b3Vec3;
  b3Body_ApplyForce(_0: b3BodyId, _1: b3Vec3, _2: b3Vec3, _3: boolean): void;
  b3Body_ApplyForceToCenter(_0: b3BodyId, _1: b3Vec3, _2: boolean): void;
  b3Body_ApplyTorque(_0: b3BodyId, _1: b3Vec3, _2: boolean): void;
  b3Body_ApplyLinearImpulse(_0: b3BodyId, _1: b3Vec3, _2: b3Vec3, _3: boolean): void;
  b3Body_ApplyLinearImpulseToCenter(_0: b3BodyId, _1: b3Vec3, _2: boolean): void;
  b3Body_ApplyAngularImpulse(_0: b3BodyId, _1: b3Vec3, _2: boolean): void;
  b3Body_GetLocalCenterOfMass(_0: b3BodyId): b3Vec3;
  b3Body_GetWorldCenterOfMass(_0: b3BodyId): b3Vec3;
  b3Shape_GetClosestPoint(_0: b3ShapeId, _1: b3Vec3): b3Vec3;
  b3Joint_GetConstraintForce(_0: b3JointId): b3Vec3;
  b3Joint_GetConstraintTorque(_0: b3JointId): b3Vec3;
  b3MotorJoint_SetLinearVelocity(_0: b3JointId, _1: b3Vec3): void;
  b3MotorJoint_GetLinearVelocity(_0: b3JointId): b3Vec3;
  b3MotorJoint_SetAngularVelocity(_0: b3JointId, _1: b3Vec3): void;
  b3MotorJoint_GetAngularVelocity(_0: b3JointId): b3Vec3;
  b3SphericalJoint_SetMotorVelocity(_0: b3JointId, _1: b3Vec3): void;
  b3SphericalJoint_GetMotorVelocity(_0: b3JointId): b3Vec3;
  b3SphericalJoint_GetMotorTorque(_0: b3JointId): b3Vec3;
  b3Body_GetLocalRotationalInertia(_0: b3BodyId): b3Matrix3;
  b3Body_GetWorldInverseRotationalInertia(_0: b3BodyId): b3Matrix3;
  b3Cross(_0: b3Vec3, _1: b3Vec3): b3Vec3;
  b3OffsetPos(_0: b3Vec3, _1: b3Vec3): b3Vec3;
  b3Perp(_0: b3Vec3): b3Vec3;
  b3IsNormalized(_0: b3Vec3): boolean;
  b3AABB_Center(_0: b3AABB): b3Vec3;
  b3AABB_Extents(_0: b3AABB): b3Vec3;
  b3ClosestPointToAABB(_0: b3Vec3, _1: b3AABB): b3Vec3;
  b3Body_GetTransform(_0: b3BodyId): b3Transform;
  b3CloneAndTransformHull(_0: b3HullData | null, _1: b3Transform, _2: b3Vec3): b3HullData | null;
  b3InvMulTransforms(_0: b3Transform, _1: b3Transform): b3Transform;
  b3ComputeHullAABB(_0: b3HullData | null, _1: b3Transform): b3AABB;
  b3Joint_SetLocalFrameA(_0: b3JointId, _1: b3Transform): void;
  b3Joint_GetLocalFrameA(_0: b3JointId): b3Transform;
  b3Joint_SetLocalFrameB(_0: b3JointId, _1: b3Transform): void;
  b3Joint_GetLocalFrameB(_0: b3JointId): b3Transform;
  b3TransformPoint(_0: b3Transform, _1: b3Vec3): b3Vec3;
  b3MulTransforms(_0: b3Transform, _1: b3Transform): b3Transform;
  b3Body_GetRotation(_0: b3BodyId): b3Quat;
  b3Body_SetTransform(_0: b3BodyId, _1: b3Vec3, _2: b3Quat): void;
  b3SphericalJoint_SetTargetRotation(_0: b3JointId, _1: b3Quat): void;
  b3SphericalJoint_GetTargetRotation(_0: b3JointId): b3Quat;
  b3RotateVector(_0: b3Quat, _1: b3Vec3): b3Vec3;
  b3InvRotateVector(_0: b3Quat, _1: b3Vec3): b3Vec3;
  b3ComputeQuatBetweenUnitVectors(_0: b3Vec3, _1: b3Vec3): b3Quat;
  b3InvMulQuat(_0: b3Quat, _1: b3Quat): b3Quat;
  b3IsValidPlane(_0: b3Plane): boolean;
  b3ComputeSphereAABB(_0: b3Sphere, _1: b3Transform): b3AABB;
  b3Shape_GetSphere(_0: b3ShapeId): b3Sphere;
  b3Shape_SetSphere(_0: b3ShapeId, _1: b3Sphere): void;
  b3ComputeCapsuleAABB(_0: b3Capsule, _1: b3Transform): b3AABB;
  b3Shape_GetCapsule(_0: b3ShapeId): b3Capsule;
  b3Shape_SetCapsule(_0: b3ShapeId, _1: b3Capsule): void;
  b3DefaultSurfaceMaterial(): b3SurfaceMaterial;
  b3Shape_SetSurfaceMaterial(_0: b3ShapeId, _1: b3SurfaceMaterial): void;
  b3Shape_GetSurfaceMaterial(_0: b3ShapeId): b3SurfaceMaterial;
  b3DefaultWorldDef(): b3WorldDef;
  b3CreateWorld(worldDef: b3WorldDef): b3WorldId;
  b3DefaultBodyDef(): b3BodyDef;
  b3CreateBody(_0: b3WorldId, _1: b3BodyDef): b3BodyId;
  b3DefaultShapeDef(): b3ShapeDef;
  b3CreateSphereShape(_0: b3BodyId, _1: b3ShapeDef, _2: b3Sphere): b3ShapeId;
  b3CreateCapsuleShape(_0: b3BodyId, _1: b3ShapeDef, _2: b3Capsule): b3ShapeId;
  b3CreateHullShape(_0: b3BodyId, _1: b3ShapeDef, _2: b3HullData | null): b3ShapeId;
  b3CreateMeshShape(_0: b3BodyId, _1: b3ShapeDef, _2: b3MeshData | null, _3: b3Vec3): b3ShapeId;
  b3CreateCompoundShape(_0: b3BodyId, _1: b3ShapeDef, _2: b3CompoundData | null): b3ShapeId;
  b3CreateHeightFieldShape(_0: b3BodyId, _1: b3ShapeDef, _2: b3HeightFieldData | null): b3ShapeId;
  b3CreateTransformedHullShape(_0: b3BodyId, _1: b3ShapeDef, _2: b3HullData | null, _3: b3Transform, _4: b3Vec3): b3ShapeId;
  b3World_Step(worldId: b3WorldId, timeStep: number, subStepCount: number): void;
  b3World_SetRestitutionThreshold(_0: b3WorldId, _1: number): void;
  b3World_GetRestitutionThreshold(_0: b3WorldId): number;
  b3World_SetHitEventThreshold(_0: b3WorldId, _1: number): void;
  b3World_GetHitEventThreshold(_0: b3WorldId): number;
  b3World_SetContactTuning(_0: b3WorldId, _1: number, _2: number, _3: number): void;
  b3World_SetContactRecycleDistance(_0: b3WorldId, _1: number): void;
  b3World_GetContactRecycleDistance(_0: b3WorldId): number;
  b3World_SetMaximumLinearSpeed(_0: b3WorldId, _1: number): void;
  b3World_GetMaximumLinearSpeed(_0: b3WorldId): number;
  b3CreateBoxShape(_0: b3BodyId, _1: b3ShapeDef, _2: number, _3: number, _4: number): b3ShapeId;
  b3CreateCylinder(_0: number, _1: number, _2: number, _3: number): b3HullData | null;
  b3CreateCone(_0: number, _1: number, _2: number, _3: number): b3HullData | null;
  b3CreateRock(_0: number): b3HullData | null;
  b3CreateGridMesh(_0: number, _1: number, _2: number, _3: number, _4: boolean): b3MeshData | null;
  b3CreateWaveMesh(_0: number, _1: number, _2: number, _3: number, _4: number, _5: number): b3MeshData | null;
  b3CreateTorusMesh(_0: number, _1: number, _2: number, _3: number): b3MeshData | null;
  b3CreatePlatformMesh(_0: b3Vec3, _1: number, _2: number, _3: number): b3MeshData | null;
  b3CreateWave(_0: number, _1: number, _2: b3Vec3, _3: number, _4: number, _5: boolean): b3HeightFieldData | null;
  b3World_GetProfile(_0: b3WorldId): b3Profile;
  b3DefaultExplosionDef(): b3ExplosionDef;
  b3World_Explode(_0: b3WorldId, _1: b3ExplosionDef): void;
  b3Body_CastRay(_0: b3BodyId, _1: b3Vec3, _2: b3Vec3, _3: b3QueryFilter, _4: number, _5: b3Transform): b3BodyCastResult;
  b3Body_SetTargetTransform(_0: b3BodyId, _1: b3Transform, _2: number, _3: boolean): void;
  b3Body_GetMass(_0: b3BodyId): number;
  b3Body_GetInverseMass(_0: b3BodyId): number;
  b3Body_SetLinearDamping(_0: b3BodyId, _1: number): void;
  b3Body_GetLinearDamping(_0: b3BodyId): number;
  b3Body_SetAngularDamping(_0: b3BodyId, _1: number): void;
  b3Body_GetAngularDamping(_0: b3BodyId): number;
  b3Body_SetGravityScale(_0: b3BodyId, _1: number): void;
  b3Body_GetGravityScale(_0: b3BodyId): number;
  b3Body_SetSleepThreshold(_0: b3BodyId, _1: number): void;
  b3Body_GetSleepThreshold(_0: b3BodyId): number;
  b3Shape_SetDensity(_0: b3ShapeId, _1: number, _2: boolean): void;
  b3Shape_GetDensity(_0: b3ShapeId): number;
  b3Shape_SetFriction(_0: b3ShapeId, _1: number): void;
  b3Shape_GetFriction(_0: b3ShapeId): number;
  b3Shape_SetRestitution(_0: b3ShapeId, _1: number): void;
  b3Shape_GetRestitution(_0: b3ShapeId): number;
  b3Shape_ApplyWind(_0: b3ShapeId, _1: b3Vec3, _2: number, _3: number, _4: number, _5: boolean): void;
  b3DefaultFilterJointDef(): b3FilterJointDef;
  b3CreateFilterJoint(_0: b3WorldId, _1: b3FilterJointDef): b3JointId;
  b3DefaultDistanceJointDef(): b3DistanceJointDef;
  b3CreateDistanceJoint(_0: b3WorldId, _1: b3DistanceJointDef): b3JointId;
  b3DefaultRevoluteJointDef(): b3RevoluteJointDef;
  b3CreateRevoluteJoint(_0: b3WorldId, _1: b3RevoluteJointDef): b3JointId;
  b3DefaultPrismaticJointDef(): b3PrismaticJointDef;
  b3CreatePrismaticJoint(_0: b3WorldId, _1: b3PrismaticJointDef): b3JointId;
  b3DefaultWheelJointDef(): b3WheelJointDef;
  b3CreateWheelJoint(_0: b3WorldId, _1: b3WheelJointDef): b3JointId;
  b3DefaultWeldJointDef(): b3WeldJointDef;
  b3CreateWeldJoint(_0: b3WorldId, _1: b3WeldJointDef): b3JointId;
  b3DefaultSphericalJointDef(): b3SphericalJointDef;
  b3CreateSphericalJoint(_0: b3WorldId, _1: b3SphericalJointDef): b3JointId;
  b3DefaultMotorJointDef(): b3MotorJointDef;
  b3CreateMotorJoint(_0: b3WorldId, _1: b3MotorJointDef): b3JointId;
  b3DefaultParallelJointDef(): b3ParallelJointDef;
  b3CreateParallelJoint(_0: b3WorldId, _1: b3ParallelJointDef): b3JointId;
  b3Joint_GetLinearSeparation(_0: b3JointId): number;
  b3Joint_GetAngularSeparation(_0: b3JointId): number;
  b3Joint_SetConstraintTuning(_0: b3JointId, _1: number, _2: number): void;
  b3Joint_SetForceThreshold(_0: b3JointId, _1: number): void;
  b3Joint_GetForceThreshold(_0: b3JointId): number;
  b3Joint_SetTorqueThreshold(_0: b3JointId, _1: number): void;
  b3Joint_GetTorqueThreshold(_0: b3JointId): number;
  b3ParallelJoint_SetSpringHertz(_0: b3JointId, _1: number): void;
  b3ParallelJoint_SetSpringDampingRatio(_0: b3JointId, _1: number): void;
  b3ParallelJoint_GetSpringHertz(_0: b3JointId): number;
  b3ParallelJoint_GetSpringDampingRatio(_0: b3JointId): number;
  b3ParallelJoint_SetMaxTorque(_0: b3JointId, _1: number): void;
  b3ParallelJoint_GetMaxTorque(_0: b3JointId): number;
  b3DistanceJoint_SetLength(_0: b3JointId, _1: number): void;
  b3DistanceJoint_GetLength(_0: b3JointId): number;
  b3DistanceJoint_SetSpringForceRange(_0: b3JointId, _1: number, _2: number): void;
  b3DistanceJoint_SetSpringHertz(_0: b3JointId, _1: number): void;
  b3DistanceJoint_SetSpringDampingRatio(_0: b3JointId, _1: number): void;
  b3DistanceJoint_GetSpringHertz(_0: b3JointId): number;
  b3DistanceJoint_GetSpringDampingRatio(_0: b3JointId): number;
  b3DistanceJoint_SetLengthRange(_0: b3JointId, _1: number, _2: number): void;
  b3DistanceJoint_GetMinLength(_0: b3JointId): number;
  b3DistanceJoint_GetMaxLength(_0: b3JointId): number;
  b3DistanceJoint_GetCurrentLength(_0: b3JointId): number;
  b3DistanceJoint_SetMotorSpeed(_0: b3JointId, _1: number): void;
  b3DistanceJoint_GetMotorSpeed(_0: b3JointId): number;
  b3DistanceJoint_SetMaxMotorForce(_0: b3JointId, _1: number): void;
  b3DistanceJoint_GetMaxMotorForce(_0: b3JointId): number;
  b3DistanceJoint_GetMotorForce(_0: b3JointId): number;
  b3MotorJoint_SetMaxVelocityForce(_0: b3JointId, _1: number): void;
  b3MotorJoint_GetMaxVelocityForce(_0: b3JointId): number;
  b3MotorJoint_SetMaxVelocityTorque(_0: b3JointId, _1: number): void;
  b3MotorJoint_GetMaxVelocityTorque(_0: b3JointId): number;
  b3MotorJoint_SetLinearHertz(_0: b3JointId, _1: number): void;
  b3MotorJoint_GetLinearHertz(_0: b3JointId): number;
  b3MotorJoint_SetLinearDampingRatio(_0: b3JointId, _1: number): void;
  b3MotorJoint_GetLinearDampingRatio(_0: b3JointId): number;
  b3MotorJoint_SetAngularHertz(_0: b3JointId, _1: number): void;
  b3MotorJoint_GetAngularHertz(_0: b3JointId): number;
  b3MotorJoint_SetAngularDampingRatio(_0: b3JointId, _1: number): void;
  b3MotorJoint_GetAngularDampingRatio(_0: b3JointId): number;
  b3MotorJoint_SetMaxSpringForce(_0: b3JointId, _1: number): void;
  b3MotorJoint_GetMaxSpringForce(_0: b3JointId): number;
  b3MotorJoint_SetMaxSpringTorque(_0: b3JointId, _1: number): void;
  b3MotorJoint_GetMaxSpringTorque(_0: b3JointId): number;
  b3PrismaticJoint_SetSpringHertz(_0: b3JointId, _1: number): void;
  b3PrismaticJoint_GetSpringHertz(_0: b3JointId): number;
  b3PrismaticJoint_SetSpringDampingRatio(_0: b3JointId, _1: number): void;
  b3PrismaticJoint_GetSpringDampingRatio(_0: b3JointId): number;
  b3PrismaticJoint_SetTargetTranslation(_0: b3JointId, _1: number): void;
  b3PrismaticJoint_GetTargetTranslation(_0: b3JointId): number;
  b3PrismaticJoint_GetLowerLimit(_0: b3JointId): number;
  b3PrismaticJoint_GetUpperLimit(_0: b3JointId): number;
  b3PrismaticJoint_SetLimits(_0: b3JointId, _1: number, _2: number): void;
  b3PrismaticJoint_SetMotorSpeed(_0: b3JointId, _1: number): void;
  b3PrismaticJoint_GetMotorSpeed(_0: b3JointId): number;
  b3PrismaticJoint_SetMaxMotorForce(_0: b3JointId, _1: number): void;
  b3PrismaticJoint_GetMaxMotorForce(_0: b3JointId): number;
  b3PrismaticJoint_GetMotorForce(_0: b3JointId): number;
  b3PrismaticJoint_GetTranslation(_0: b3JointId): number;
  b3PrismaticJoint_GetSpeed(_0: b3JointId): number;
  b3RevoluteJoint_SetSpringHertz(_0: b3JointId, _1: number): void;
  b3RevoluteJoint_GetSpringHertz(_0: b3JointId): number;
  b3RevoluteJoint_SetSpringDampingRatio(_0: b3JointId, _1: number): void;
  b3RevoluteJoint_GetSpringDampingRatio(_0: b3JointId): number;
  b3RevoluteJoint_SetTargetAngle(_0: b3JointId, _1: number): void;
  b3RevoluteJoint_GetTargetAngle(_0: b3JointId): number;
  b3RevoluteJoint_GetAngle(_0: b3JointId): number;
  b3RevoluteJoint_GetLowerLimit(_0: b3JointId): number;
  b3RevoluteJoint_GetUpperLimit(_0: b3JointId): number;
  b3RevoluteJoint_SetLimits(_0: b3JointId, _1: number, _2: number): void;
  b3RevoluteJoint_SetMotorSpeed(_0: b3JointId, _1: number): void;
  b3RevoluteJoint_GetMotorSpeed(_0: b3JointId): number;
  b3RevoluteJoint_GetMotorTorque(_0: b3JointId): number;
  b3RevoluteJoint_SetMaxMotorTorque(_0: b3JointId, _1: number): void;
  b3RevoluteJoint_GetMaxMotorTorque(_0: b3JointId): number;
  b3SphericalJoint_GetConeLimit(_0: b3JointId): number;
  b3SphericalJoint_SetConeLimit(_0: b3JointId, _1: number): void;
  b3SphericalJoint_GetConeAngle(_0: b3JointId): number;
  b3SphericalJoint_GetLowerTwistLimit(_0: b3JointId): number;
  b3SphericalJoint_GetUpperTwistLimit(_0: b3JointId): number;
  b3SphericalJoint_SetTwistLimits(_0: b3JointId, _1: number, _2: number): void;
  b3SphericalJoint_GetTwistAngle(_0: b3JointId): number;
  b3SphericalJoint_SetSpringHertz(_0: b3JointId, _1: number): void;
  b3SphericalJoint_GetSpringHertz(_0: b3JointId): number;
  b3SphericalJoint_SetSpringDampingRatio(_0: b3JointId, _1: number): void;
  b3SphericalJoint_GetSpringDampingRatio(_0: b3JointId): number;
  b3SphericalJoint_SetMaxMotorTorque(_0: b3JointId, _1: number): void;
  b3SphericalJoint_GetMaxMotorTorque(_0: b3JointId): number;
  b3WeldJoint_SetLinearHertz(_0: b3JointId, _1: number): void;
  b3WeldJoint_GetLinearHertz(_0: b3JointId): number;
  b3WeldJoint_SetLinearDampingRatio(_0: b3JointId, _1: number): void;
  b3WeldJoint_GetLinearDampingRatio(_0: b3JointId): number;
  b3WeldJoint_SetAngularHertz(_0: b3JointId, _1: number): void;
  b3WeldJoint_GetAngularHertz(_0: b3JointId): number;
  b3WeldJoint_SetAngularDampingRatio(_0: b3JointId, _1: number): void;
  b3WeldJoint_GetAngularDampingRatio(_0: b3JointId): number;
  b3WheelJoint_SetSuspensionHertz(_0: b3JointId, _1: number): void;
  b3WheelJoint_GetSuspensionHertz(_0: b3JointId): number;
  b3WheelJoint_SetSuspensionDampingRatio(_0: b3JointId, _1: number): void;
  b3WheelJoint_GetSuspensionDampingRatio(_0: b3JointId): number;
  b3WheelJoint_GetLowerSuspensionLimit(_0: b3JointId): number;
  b3WheelJoint_GetUpperSuspensionLimit(_0: b3JointId): number;
  b3WheelJoint_SetSuspensionLimits(_0: b3JointId, _1: number, _2: number): void;
  b3WheelJoint_SetSpinMotorSpeed(_0: b3JointId, _1: number): void;
  b3WheelJoint_GetSpinMotorSpeed(_0: b3JointId): number;
  b3WheelJoint_SetMaxSpinTorque(_0: b3JointId, _1: number): void;
  b3WheelJoint_GetMaxSpinTorque(_0: b3JointId): number;
  b3WheelJoint_GetSpinSpeed(_0: b3JointId): number;
  b3WheelJoint_GetSpinTorque(_0: b3JointId): number;
  b3WheelJoint_SetSteeringHertz(_0: b3JointId, _1: number): void;
  b3WheelJoint_GetSteeringHertz(_0: b3JointId): number;
  b3WheelJoint_SetSteeringDampingRatio(_0: b3JointId, _1: number): void;
  b3WheelJoint_GetSteeringDampingRatio(_0: b3JointId): number;
  b3WheelJoint_SetMaxSteeringTorque(_0: b3JointId, _1: number): void;
  b3WheelJoint_GetMaxSteeringTorque(_0: b3JointId): number;
  b3WheelJoint_GetLowerSteeringLimit(_0: b3JointId): number;
  b3WheelJoint_GetUpperSteeringLimit(_0: b3JointId): number;
  b3WheelJoint_SetSteeringLimits(_0: b3JointId, _1: number, _2: number): void;
  b3WheelJoint_SetTargetSteeringAngle(_0: b3JointId, _1: number): void;
  b3WheelJoint_GetTargetSteeringAngle(_0: b3JointId): number;
  b3WheelJoint_GetSteeringAngle(_0: b3JointId): number;
  b3WheelJoint_GetSteeringTorque(_0: b3JointId): number;
  b3ComputeSphereMass(_0: b3Sphere, _1: number): b3MassData;
  b3ComputeCapsuleMass(_0: b3Capsule, _1: number): b3MassData;
  b3ComputeHullMass(_0: b3HullData | null, _1: number): b3MassData;
  b3Body_GetMassData(_0: b3BodyId): b3MassData;
  b3Body_SetMassData(_0: b3BodyId, _1: b3MassData): void;
  b3Shape_ComputeMassData(_0: b3ShapeId): b3MassData;
  b3World_CastRayClosest(_0: b3WorldId, _1: b3Vec3, _2: b3Vec3, _3: b3QueryFilter): b3RayResult;
  b3Shape_RayCast(_0: b3ShapeId, _1: b3Vec3, _2: b3Vec3): b3WorldCastOutput;
  b3Distance(_0: b3Vec3, _1: b3Vec3): number;
  b3DistanceSquared(_0: b3Vec3, _1: b3Vec3): number;
  b3MakeQuatFromAxisAngle(_0: b3Vec3, _1: number): b3Quat;
  b3AABB_Area(_0: b3AABB): number;
  b3ComputeCosSin(_0: number): b3CosSin;
  b3DynamicTree_GetAreaRatio(_0: b3DynamicTree | null): number;
  b3Body_SetName(_0: b3BodyId, _1: EmbindString): void;
  b3Body_GetName(_0: b3BodyId): string;
  b3CreateHull(_0: any): b3HullData | null;
  b3GetHullVertices(_0: b3HullData | null): any;
  b3CreateMesh(_0: any, _1: any): b3MeshData | null;
  b3GetMeshVertices(_0: b3MeshData | null): any;
  b3GetMeshIndices(_0: b3MeshData | null): any;
  b3GetMeshMaterialIndices(_0: b3MeshData | null): any;
  b3CreateCompound(_0: any): b3CompoundData | null;
  b3CreateHeightField(_0: any, _1: number, _2: number, _3: b3Vec3): b3HeightFieldData | null;
  b3World_CastMover(_0: b3WorldId, _1: b3Vec3, _2: b3Capsule, _3: b3Vec3, _4: b3QueryFilter, _5: any): number;
  b3World_CollideMover(_0: b3WorldId, _1: b3Vec3, _2: b3Capsule, _3: b3QueryFilter, _4: any): void;
  b3SolvePlanes(_0: b3Vec3, _1: any): b3PlaneSolverResult;
  b3ClipVector(_0: b3Vec3, _1: any): b3Vec3;
  b3World_SetCustomFilterCallback(_0: b3WorldId, _1: any): void;
  b3World_SetPreSolveCallback(_0: b3WorldId, _1: any): void;
  b3ShapeDistance(_0: any, _1: number, _2: any, _3: number, _4: b3Transform, _5: boolean): b3DistanceOutput;
  b3ShapeCast(_0: any, _1: number, _2: any, _3: number, _4: b3Transform, _5: b3Vec3, _6: number, _7: boolean): b3WorldCastOutput;
  b3TimeOfImpact(_0: any, _1: number, _2: any, _3: number, _4: b3Sweep, _5: b3Sweep, _6: number): b3TOIOutput;
  b3CollideSpheres(_0: b3Sphere, _1: b3Sphere, _2: b3Transform): any;
  b3CollideCapsuleAndSphere(_0: b3Capsule, _1: b3Sphere, _2: b3Transform): any;
  b3CollideHullAndSphere(_0: b3HullData | null, _1: b3Sphere, _2: b3Transform): any;
  b3CollideCapsules(_0: b3Capsule, _1: b3Capsule, _2: b3Transform): any;
  b3CollideHullAndCapsule(_0: b3HullData | null, _1: b3Capsule, _2: b3Transform): any;
  b3CollideHulls(_0: b3HullData | null, _1: b3HullData | null, _2: b3Transform): any;
  b3CollideCapsuleAndTriangle(_0: b3Capsule, _1: b3Vec3, _2: b3Vec3, _3: b3Vec3): any;
  b3CollideHullAndTriangle(_0: b3HullData | null, _1: b3Vec3, _2: b3Vec3, _3: b3Vec3, _4: number): any;
  b3CollideSphereAndTriangle(_0: b3Sphere, _1: b3Vec3, _2: b3Vec3, _3: b3Vec3): any;
  b3Body_GetContactData(_0: b3BodyId): any;
  b3Shape_GetContactData(_0: b3ShapeId): any;
  b3Shape_GetSensorData(_0: b3ShapeId): any;
  b3World_OverlapShape(_0: b3WorldId, _1: b3Vec3, _2: any, _3: number, _4: b3QueryFilter, _5: any): void;
  b3World_CastShape(_0: b3WorldId, _1: b3Vec3, _2: any, _3: number, _4: b3Vec3, _5: b3QueryFilter, _6: any): void;
  b3Body_CastShape(_0: b3BodyId, _1: b3Vec3, _2: any, _3: number, _4: b3Vec3, _5: b3QueryFilter, _6: number, _7: boolean, _8: b3Transform): b3BodyCastResult;
  b3Body_OverlapShape(_0: b3BodyId, _1: b3Vec3, _2: any, _3: number, _4: b3QueryFilter, _5: b3Transform): boolean;
  b3Shape_GetHullVertices(_0: b3ShapeId): any;
  b3DistanceJoint_GetSpringForceRange(_0: b3JointId): any;
  b3World_OverlapAABB(_0: b3WorldId, _1: b3AABB, _2: b3QueryFilter, _3: any): void;
  b3World_CastRay(_0: b3WorldId, _1: b3Vec3, _2: b3Vec3, _3: b3QueryFilter, _4: any): void;
  b3World_GetBodyEvents(_0: b3WorldId): { moveEvents: b3BodyMoveEvent[] };
  b3World_GetSensorEvents(_0: b3WorldId): { beginEvents: b3SensorBeginTouchEvent[], endEvents: b3SensorEndTouchEvent[] };
  b3World_GetContactEvents(_0: b3WorldId): { beginEvents: b3ContactBeginTouchEvent[], endEvents: b3ContactEndTouchEvent[], hitEvents: b3ContactHitEvent[] };
  b3World_GetJointEvents(_0: b3WorldId): { jointEvents: b3JointEvent[] };
  b3GetLengthAndNormalize(_0: b3Vec3): any;
  b3GetAxisAngle(_0: b3Quat): any;
  b3DynamicTree_Query(_0: b3DynamicTree | null, _1: b3AABB, _2: number, _3: any): b3TreeStats;
  b3DynamicTree_RayCast(_0: b3DynamicTree | null, _1: b3Vec3, _2: b3Vec3, _3: number, _4: number, _5: any): b3TreeStats;
  b3DynamicTree_QueryClosest(_0: b3DynamicTree | null, _1: b3Vec3, _2: number, _3: any): b3TreeStats;
  b3World_Draw(_0: b3WorldId, _1: any): void;
}

export type Box3DModule = WasmModule & EmbindModule;
export default function Box3DFactory (options?: unknown): Promise<Box3DModule>;
