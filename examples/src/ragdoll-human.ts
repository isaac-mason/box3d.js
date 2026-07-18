// Ragdoll bone table — a faithful port of box3d's shared/human.c (14 bones, an
// anatomically-posed humanoid). Each bone is a capsule linked to its parent by a
// spherical joint (cone + twist limits) or a revolute joint (hinge limits). The
// exact reference frames / local joint frames / limits come straight from box3d.

import type {
	Box3DModule,
	b3BodyId,
	b3JointId,
	b3Quat,
	b3Transform,
	b3Vec3,
	b3WorldId,
} from 'box3d.js';

const DEG = Math.PI / 180;

type Bone = {
	name: string;
	parent: number; // index into bones, -1 for root
	refP: b3Vec3;
	refQ: b3Quat;
	c1: b3Vec3;
	c2: b3Vec3;
	radius: number;
	groupFilter: boolean; // shape joins the human's self-collision-off group
	joint?: {
		type: 'spherical' | 'revolute';
		localFrameA: b3Transform;
		localFrameB: b3Transform;
		swing: number;
		twistLo: number;
		twistHi: number;
		friction: number;
	};
};

const BONES: Bone[] = [
	{
		name: 'pelvis',
		parent: -1,
		refP: [0.0, 0.932087, -0.051708],
		refQ: [0.739169, 0.0, 0.0, 0.67352],
		c1: [0.07, 0.0, -0.08],
		c2: [-0.07, 0.0, -0.08],
		radius: 0.13,
		groupFilter: false,
	},
	{
		name: 'spine_01',
		parent: 0,
		refP: [0.0, 1.113505, -0.03481],
		refQ: [0.739973, 0.0, 0.0, 0.672637],
		c1: [0.06, -0.0, -0.052264],
		c2: [-0.06, 0.0, -0.052264],
		radius: 0.12,
		groupFilter: true,
		joint: {
			type: 'spherical',
			localFrameA: {
				position: [0.0, 0.0, -0.182204],
				quaternion: [-0.999999, 0.0, -0.0, 0.001194],
			},
			localFrameB: {
				position: [0.0, 0.0, -0.007736],
				quaternion: [-1.0, 0.0, -0.0, 0.0],
			},
			swing: 25.0 * DEG,
			twistLo: -15.0 * DEG,
			twistHi: 15.0 * DEG,
			friction: 1.0,
		},
	},
	{
		name: 'spine_02',
		parent: 1,
		refP: [0.0, 1.194336, -0.027087],
		refQ: [0.703611, 0.0, 0.0, 0.710586],
		c1: [0.08, -0.015133, -0.091801],
		c2: [-0.08, -0.015133, -0.091801],
		radius: 0.1,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				position: [0.0, -0.0, -0.088935],
				quaternion: [-0.998619, -0.0, 0.0, -0.05254],
			},
			localFrameB: {
				position: [-0.0, 0.0, -0.008199],
				quaternion: [-1.0, 0.0, -0.0, 0.0],
			},
			swing: 25.0 * DEG,
			twistLo: -15.0 * DEG,
			twistHi: 15.0 * DEG,
			friction: 1.0,
		},
	},
	{
		name: 'spine_03',
		parent: 2,
		refP: [-0.0, 1.31043, -0.028232],
		refQ: [0.669856, 1e-6, -1e-6, 0.742491],
		c1: [0.11, -0.039753, -0.13],
		c2: [-0.11, -0.039753, -0.13],
		radius: 0.145,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				position: [-0.0, 0.0, -0.124298],
				quaternion: [-0.998921, 1e-6, -1e-6, -0.046434],
			},
			localFrameB: {
				position: [0.0, 0.0, 0.0],
				quaternion: [-1.0, 0.0, -1e-6, 0.0],
			},
			swing: 15.0 * DEG,
			twistLo: -10.0 * DEG,
			twistHi: 10.0 * DEG,
			friction: 1.0,
		},
	},
	{
		name: 'neck',
		parent: 3,
		refP: [0.0, 1.575582, -0.055837],
		refQ: [0.879922, 0.0, 0.0, 0.475118],
		c1: [-1e-6, -0.0, -0.02],
		c2: [0.0, -0.005, -0.08],
		radius: 0.07,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				position: [1e-6, -0.000259, -0.266585],
				quaternion: [-0.942192, -1e-6, 0.0, 0.335074],
			},
			localFrameB: {
				position: [0.0, 0.0, 0.0],
				quaternion: [-1.0, 0.0, -1e-6, 0.0],
			},
			swing: 45.0 * DEG,
			twistLo: -15.0 * DEG,
			twistHi: 15.0 * DEG,
			friction: 0.8,
		},
	},
	{
		name: 'head',
		parent: 4,
		refP: [0.0, 1.653348, -0.003241],
		refQ: [0.750288, 0.0, 0.0, 0.661111],
		c1: [-1e-6, 0.016892, -0.05869],
		c2: [0.0, -0.003629, -0.115072],
		radius: 0.0975,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				position: [0.0, 0.001321, -0.093873],
				quaternion: [-0.974301, -0.0, -0.0, -0.225251],
			},
			localFrameB: {
				position: [0.0, 0.001268, -0.005104],
				quaternion: [-1.0, 0.0, -0.0, 0.0],
			},
			swing: 15.0 * DEG,
			twistLo: -15.0 * DEG,
			twistHi: 15.0 * DEG,
			friction: 0.4,
		},
	},
	{
		name: 'thigh_l',
		parent: 0,
		refP: [0.090416, 0.986104, -0.03509],
		refQ: [-0.703287, -0.070715, 0.053866, 0.705327],
		c1: [0.023719, 0.006008, -0.039068],
		c2: [-0.064492, -0.004664, -0.424718],
		radius: 0.09,
		groupFilter: true,
		joint: {
			type: 'spherical',
			localFrameA: {
				position: [0.05, 0.011537, -0.055325],
				quaternion: [-0.714896, -0.022305, -0.698361, -0.02679],
			},
			localFrameB: {
				position: [0.0, 0.0, 0.0],
				quaternion: [-0.002064, 0.758987, 0.017046, 0.65088],
			},
			swing: 10.0 * DEG,
			twistLo: -60.0 * DEG,
			twistHi: 40.0 * DEG,
			friction: 1.0,
		},
	},
	{
		name: 'calf_l',
		parent: 6,
		refP: [0.101198, 0.527027, -0.037374],
		refQ: [-0.653328, -0.06686, 0.058582, 0.751838],
		c1: [0.001778, 0.0, 0.009841],
		c2: [-0.078577, 0.014707, -0.41816],
		radius: 0.075,
		groupFilter: false,
		joint: {
			type: 'revolute',
			localFrameA: {
				position: [-0.069989, 0.000253, -0.453844],
				quaternion: [-0.000677, 0.760087, 0.105674, 0.641171],
			},
			localFrameB: {
				position: [0.0, 0.0, 0.0],
				quaternion: [-0.044589, 0.76554, 0.053368, 0.639619],
			},
			swing: 0.0 * DEG,
			twistLo: -5.0 * DEG,
			twistHi: 45.0 * DEG,
			friction: 1.0,
		},
	},
	{
		name: 'thigh_r',
		parent: 0,
		refP: [-0.090416, 0.986104, -0.03509],
		refQ: [-0.703287, 0.070715, -0.053865, 0.705326],
		c1: [-0.023719, 0.006008, -0.039068],
		c2: [0.064492, -0.004664, -0.424718],
		radius: 0.09,
		groupFilter: true,
		joint: {
			type: 'spherical',
			localFrameA: {
				position: [-0.05, 0.011537, -0.055326],
				quaternion: [-0.039089, -0.714094, 0.043177, 0.697623],
			},
			localFrameB: {
				position: [0.0, 0.0, 0.0],
				quaternion: [0.758805, -0.019886, -0.651012, -0.001759],
			},
			swing: 10.0 * DEG,
			twistLo: -30.0 * DEG,
			twistHi: 60.0 * DEG,
			friction: 1.0,
		},
	},
	{
		name: 'calf_r',
		parent: 8,
		refP: [-0.101198, 0.527027, -0.037373],
		refQ: [-0.653327, 0.06686, -0.058582, 0.751839],
		c1: [-0.00182, 0.0, 0.010071],
		c2: [0.077883, 0.014825, -0.418047],
		radius: 0.075,
		groupFilter: false,
		joint: {
			type: 'revolute',
			localFrameA: {
				position: [0.069988, 0.000253, -0.453844],
				quaternion: [0.760086, -0.000675, -0.641171, -0.105676],
			},
			localFrameB: {
				position: [0.0, 0.0, 0.0],
				quaternion: [0.76554, -0.044589, -0.639619, -0.053368],
			},
			swing: 0.0 * DEG,
			twistLo: -45.0 * DEG,
			twistHi: 5.0 * DEG,
			friction: 1.0,
		},
	},
	{
		name: 'upper_arm_l',
		parent: 3,
		refP: [0.20378, 1.484275, -0.115897],
		refQ: [0.143082, 0.69598, -0.69013, 0.13733],
		c1: [0.0, 0.0, 0.0],
		c2: [-0.091118, 0.037775, 0.229719],
		radius: 0.075,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				position: [0.20378, -0.069369, -0.181921],
				quaternion: [-0.278486, 0.4456, -0.097014, 0.845266],
			},
			localFrameB: {
				position: [0.0, 0.0, 0.0],
				quaternion: [-0.201396, -0.001586, 0.90185, 0.382234],
			},
			swing: 60.0 * DEG,
			twistLo: -5.0 * DEG,
			twistHi: 5.0 * DEG,
			friction: 1.0,
		},
	},
	{
		name: 'lower_arm_l',
		parent: 10,
		refP: [0.305614, 1.242908, -0.117599],
		refQ: [0.165048, 0.563437, -0.802002, 0.109959],
		c1: [0.0, 0.0, 0.0],
		c2: [-0.142406, 0.039392, 0.261092],
		radius: 0.05,
		groupFilter: false,
		joint: {
			type: 'revolute',
			localFrameA: {
				position: [-0.095482, 0.039584, 0.240723],
				quaternion: [0.512487, -0.180629, 0.839474, 0.003742],
			},
			localFrameB: {
				position: [0.0, 0.0, 0.0],
				quaternion: [0.503803, -0.029831, 0.858168, 0.094017],
			},
			swing: 0.0 * DEG,
			twistLo: -5.0 * DEG,
			twistHi: 60.0 * DEG,
			friction: 1.0,
		},
	},
	{
		name: 'upper_arm_r',
		parent: 3,
		refP: [-0.20378, 1.484276, -0.115899],
		refQ: [0.143083, -0.695978, 0.690132, 0.137329],
		c1: [0.0, 0.0, 0.0],
		c2: [0.091118, 0.037775, 0.229718],
		radius: 0.075,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				position: [-0.203779, -0.069371, -0.181922],
				quaternion: [-0.253621, -0.414842, 0.106962, 0.867261],
			},
			localFrameB: {
				position: [0.0, 0.0, 0.0],
				quaternion: [-0.201397, 0.001587, -0.90185, 0.382233],
			},
			swing: 60.0 * DEG,
			twistLo: -5.0 * DEG,
			twistHi: 5.0 * DEG,
			friction: 1.0,
		},
	},
	{
		name: 'lower_arm_r',
		parent: 12,
		refP: [-0.305614, 1.242907, -0.117599],
		refQ: [0.165048, -0.563437, 0.802002, 0.109959],
		c1: [0.0, 0.0, 0.0],
		c2: [0.142406, 0.039392, 0.261092],
		radius: 0.05,
		groupFilter: false,
		joint: {
			type: 'revolute',
			localFrameA: {
				position: [0.095484, 0.039585, 0.240723],
				quaternion: [-0.180627, 0.512487, -0.003744, -0.839474],
			},
			localFrameB: {
				position: [0.0, 0.0, 0.0],
				quaternion: [-0.029831, 0.503803, -0.094017, -0.858169],
			},
			swing: 0.0 * DEG,
			twistLo: -60.0 * DEG,
			twistHi: 5.0 * DEG,
			friction: 1.0,
		},
	},
];

export type Human = { bodies: b3BodyId[]; joints: b3JointId[] };

function normQ(q: b3Quat): b3Quat {
	const len = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
	return [q[0] / len, q[1] / len, q[2] / len, q[3] / len];
}

// Faithful port of CreateHuman(): builds the 14-bone humanoid at `position`.
// `group` is a unique per-human index so a ragdoll's own limbs don't self-collide
// (shapes sharing a negative group index never collide). `friction` is the joint
// motor torque, `hertz`/`damping` an optional joint spring.
export function createHuman(
	b3: Box3DModule,
	world: b3WorldId,
	position: b3Vec3,
	group: number,
	friction = 0.05,
	hertz = 0,
	damping = 0.5,
): Human {
	const bodies: b3BodyId[] = [];
	const joints: b3JointId[] = [];

	for (const bone of BONES) {
		const bodyDef = b3.b3DefaultBodyDef();
		bodyDef.type = b3.b3BodyType.b3_dynamicBody;
		bodyDef.rotation = bone.refQ;
		bodyDef.position = [
			position[0] + bone.refP[0],
			position[1] + bone.refP[1],
			position[2] + bone.refP[2],
		];
		const body = b3.b3CreateBody(world, bodyDef);

		const shapeDef = b3.b3DefaultShapeDef();
		shapeDef.baseMaterial.rollingResistance = 0.2;
		shapeDef.filter.groupIndex = bone.groupFilter ? -group : 0;
		b3.b3CreateCapsuleShape(body, shapeDef, {
			center1: bone.c1,
			center2: bone.c2,
			radius: bone.radius,
		});

		bodies.push(body);
	}

	for (let i = 1; i < BONES.length; i++) {
		const bone = BONES[i];
		if (!bone.joint) continue;
		const j = bone.joint;
		const bodyA = bodies[bone.parent];
		const bodyB = bodies[i];
		const frameA: b3Transform = {
			position: j.localFrameA.position,
			quaternion: normQ(j.localFrameA.quaternion),
		};
		const frameB: b3Transform = {
			position: j.localFrameB.position,
			quaternion: normQ(j.localFrameB.quaternion),
		};

		if (j.type === 'revolute') {
			const def = b3.b3DefaultRevoluteJointDef();
			def.base.bodyIdA = bodyA;
			def.base.bodyIdB = bodyB;
			def.base.localFrameA = frameA;
			def.base.localFrameB = frameB;
			def.enableLimit = true;
			def.lowerAngle = j.twistLo;
			def.upperAngle = j.twistHi;
			def.enableSpring = hertz > 0;
			def.hertz = hertz;
			def.dampingRatio = damping;
			def.enableMotor = true;
			def.maxMotorTorque = j.friction * friction;
			joints.push(b3.b3CreateRevoluteJoint(world, def));
		} else {
			const def = b3.b3DefaultSphericalJointDef();
			def.base.bodyIdA = bodyA;
			def.base.bodyIdB = bodyB;
			def.base.localFrameA = frameA;
			def.base.localFrameB = frameB;
			def.enableConeLimit = true;
			def.coneAngle = j.swing;
			def.enableTwistLimit = true;
			def.lowerTwistAngle = j.twistLo;
			def.upperTwistAngle = j.twistHi;
			def.enableSpring = hertz > 0;
			def.hertz = hertz;
			def.dampingRatio = damping;
			def.enableMotor = true;
			def.maxMotorTorque = j.friction * friction;
			joints.push(b3.b3CreateSphericalJoint(world, def));
		}
	}

	// disable collision between the two thighs (they overlap at the pelvis)
	const filterDef = b3.b3DefaultFilterJointDef();
	filterDef.base.bodyIdA = bodies[6]; // thigh_l
	filterDef.base.bodyIdB = bodies[8]; // thigh_r
	joints.push(b3.b3CreateFilterJoint(world, filterDef));

	return { bodies, joints };
}
