// Ragdoll bone table — a faithful port of box3d's shared/human.c (14 bones, an
// anatomically-posed humanoid). Each bone is a capsule linked to its parent by a
// spherical joint (cone + twist limits) or a revolute joint (hinge limits). The
// exact reference frames / local joint frames / limits come straight from box3d.

import type {
	Box3DModule,
	b3BodyId,
	b3JointId,
	b3Vec3,
	b3WorldId,
} from 'box3d.js';

const DEG = Math.PI / 180;

type Bone = {
	name: string;
	parent: number; // index into bones, -1 for root
	refP: b3Vec3;
	refQ: { v: b3Vec3; s: number };
	c1: b3Vec3;
	c2: b3Vec3;
	radius: number;
	groupFilter: boolean; // shape joins the human's self-collision-off group
	joint?: {
		type: 'spherical' | 'revolute';
		localFrameA: { p: b3Vec3; q: { v: b3Vec3; s: number } };
		localFrameB: { p: b3Vec3; q: { v: b3Vec3; s: number } };
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
		refP: { x: 0.0, y: 0.932087, z: -0.051708 },
		refQ: { v: { x: 0.739169, y: 0.0, z: 0.0 }, s: 0.67352 },
		c1: { x: 0.07, y: 0.0, z: -0.08 },
		c2: { x: -0.07, y: 0.0, z: -0.08 },
		radius: 0.13,
		groupFilter: false,
	},
	{
		name: 'spine_01',
		parent: 0,
		refP: { x: 0.0, y: 1.113505, z: -0.03481 },
		refQ: { v: { x: 0.739973, y: 0.0, z: 0.0 }, s: 0.672637 },
		c1: { x: 0.06, y: -0.0, z: -0.052264 },
		c2: { x: -0.06, y: 0.0, z: -0.052264 },
		radius: 0.12,
		groupFilter: true,
		joint: {
			type: 'spherical',
			localFrameA: {
				p: { x: 0.0, y: 0.0, z: -0.182204 },
				q: { v: { x: -0.999999, y: 0.0, z: -0.0 }, s: 0.001194 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: -0.007736 },
				q: { v: { x: -1.0, y: 0.0, z: -0.0 }, s: 0.0 },
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
		refP: { x: 0.0, y: 1.194336, z: -0.027087 },
		refQ: { v: { x: 0.703611, y: 0.0, z: 0.0 }, s: 0.710586 },
		c1: { x: 0.08, y: -0.015133, z: -0.091801 },
		c2: { x: -0.08, y: -0.015133, z: -0.091801 },
		radius: 0.1,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				p: { x: 0.0, y: -0.0, z: -0.088935 },
				q: { v: { x: -0.998619, y: -0.0, z: 0.0 }, s: -0.05254 },
			},
			localFrameB: {
				p: { x: -0.0, y: 0.0, z: -0.008199 },
				q: { v: { x: -1.0, y: 0.0, z: -0.0 }, s: 0.0 },
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
		refP: { x: -0.0, y: 1.31043, z: -0.028232 },
		refQ: { v: { x: 0.669856, y: 1e-6, z: -1e-6 }, s: 0.742491 },
		c1: { x: 0.11, y: -0.039753, z: -0.13 },
		c2: { x: -0.11, y: -0.039753, z: -0.13 },
		radius: 0.145,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				p: { x: -0.0, y: 0.0, z: -0.124298 },
				q: { v: { x: -0.998921, y: 1e-6, z: -1e-6 }, s: -0.046434 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: 0.0 },
				q: { v: { x: -1.0, y: 0.0, z: -1e-6 }, s: 0.0 },
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
		refP: { x: 0.0, y: 1.575582, z: -0.055837 },
		refQ: { v: { x: 0.879922, y: 0.0, z: 0.0 }, s: 0.475118 },
		c1: { x: -1e-6, y: -0.0, z: -0.02 },
		c2: { x: 0.0, y: -0.005, z: -0.08 },
		radius: 0.07,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				p: { x: 1e-6, y: -0.000259, z: -0.266585 },
				q: { v: { x: -0.942192, y: -1e-6, z: 0.0 }, s: 0.335074 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: 0.0 },
				q: { v: { x: -1.0, y: 0.0, z: -1e-6 }, s: 0.0 },
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
		refP: { x: 0.0, y: 1.653348, z: -0.003241 },
		refQ: { v: { x: 0.750288, y: 0.0, z: 0.0 }, s: 0.661111 },
		c1: { x: -1e-6, y: 0.016892, z: -0.05869 },
		c2: { x: 0.0, y: -0.003629, z: -0.115072 },
		radius: 0.0975,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				p: { x: 0.0, y: 0.001321, z: -0.093873 },
				q: { v: { x: -0.974301, y: -0.0, z: -0.0 }, s: -0.225251 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.001268, z: -0.005104 },
				q: { v: { x: -1.0, y: 0.0, z: -0.0 }, s: 0.0 },
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
		refP: { x: 0.090416, y: 0.986104, z: -0.03509 },
		refQ: { v: { x: -0.703287, y: -0.070715, z: 0.053866 }, s: 0.705327 },
		c1: { x: 0.023719, y: 0.006008, z: -0.039068 },
		c2: { x: -0.064492, y: -0.004664, z: -0.424718 },
		radius: 0.09,
		groupFilter: true,
		joint: {
			type: 'spherical',
			localFrameA: {
				p: { x: 0.05, y: 0.011537, z: -0.055325 },
				q: { v: { x: -0.714896, y: -0.022305, z: -0.698361 }, s: -0.02679 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: 0.0 },
				q: { v: { x: -0.002064, y: 0.758987, z: 0.017046 }, s: 0.65088 },
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
		refP: { x: 0.101198, y: 0.527027, z: -0.037374 },
		refQ: { v: { x: -0.653328, y: -0.06686, z: 0.058582 }, s: 0.751838 },
		c1: { x: 0.001778, y: 0.0, z: 0.009841 },
		c2: { x: -0.078577, y: 0.014707, z: -0.41816 },
		radius: 0.075,
		groupFilter: false,
		joint: {
			type: 'revolute',
			localFrameA: {
				p: { x: -0.069989, y: 0.000253, z: -0.453844 },
				q: { v: { x: -0.000677, y: 0.760087, z: 0.105674 }, s: 0.641171 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: 0.0 },
				q: { v: { x: -0.044589, y: 0.76554, z: 0.053368 }, s: 0.639619 },
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
		refP: { x: -0.090416, y: 0.986104, z: -0.03509 },
		refQ: { v: { x: -0.703287, y: 0.070715, z: -0.053865 }, s: 0.705326 },
		c1: { x: -0.023719, y: 0.006008, z: -0.039068 },
		c2: { x: 0.064492, y: -0.004664, z: -0.424718 },
		radius: 0.09,
		groupFilter: true,
		joint: {
			type: 'spherical',
			localFrameA: {
				p: { x: -0.05, y: 0.011537, z: -0.055326 },
				q: { v: { x: -0.039089, y: -0.714094, z: 0.043177 }, s: 0.697623 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: 0.0 },
				q: { v: { x: 0.758805, y: -0.019886, z: -0.651012 }, s: -0.001759 },
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
		refP: { x: -0.101198, y: 0.527027, z: -0.037373 },
		refQ: { v: { x: -0.653327, y: 0.06686, z: -0.058582 }, s: 0.751839 },
		c1: { x: -0.00182, y: 0.0, z: 0.010071 },
		c2: { x: 0.077883, y: 0.014825, z: -0.418047 },
		radius: 0.075,
		groupFilter: false,
		joint: {
			type: 'revolute',
			localFrameA: {
				p: { x: 0.069988, y: 0.000253, z: -0.453844 },
				q: { v: { x: 0.760086, y: -0.000675, z: -0.641171 }, s: -0.105676 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: 0.0 },
				q: { v: { x: 0.76554, y: -0.044589, z: -0.639619 }, s: -0.053368 },
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
		refP: { x: 0.20378, y: 1.484275, z: -0.115897 },
		refQ: { v: { x: 0.143082, y: 0.69598, z: -0.69013 }, s: 0.13733 },
		c1: { x: 0.0, y: 0.0, z: 0.0 },
		c2: { x: -0.091118, y: 0.037775, z: 0.229719 },
		radius: 0.075,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				p: { x: 0.20378, y: -0.069369, z: -0.181921 },
				q: { v: { x: -0.278486, y: 0.4456, z: -0.097014 }, s: 0.845266 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: 0.0 },
				q: { v: { x: -0.201396, y: -0.001586, z: 0.90185 }, s: 0.382234 },
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
		refP: { x: 0.305614, y: 1.242908, z: -0.117599 },
		refQ: { v: { x: 0.165048, y: 0.563437, z: -0.802002 }, s: 0.109959 },
		c1: { x: 0.0, y: 0.0, z: 0.0 },
		c2: { x: -0.142406, y: 0.039392, z: 0.261092 },
		radius: 0.05,
		groupFilter: false,
		joint: {
			type: 'revolute',
			localFrameA: {
				p: { x: -0.095482, y: 0.039584, z: 0.240723 },
				q: { v: { x: 0.512487, y: -0.180629, z: 0.839474 }, s: 0.003742 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: 0.0 },
				q: { v: { x: 0.503803, y: -0.029831, z: 0.858168 }, s: 0.094017 },
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
		refP: { x: -0.20378, y: 1.484276, z: -0.115899 },
		refQ: { v: { x: 0.143083, y: -0.695978, z: 0.690132 }, s: 0.137329 },
		c1: { x: 0.0, y: 0.0, z: 0.0 },
		c2: { x: 0.091118, y: 0.037775, z: 0.229718 },
		radius: 0.075,
		groupFilter: false,
		joint: {
			type: 'spherical',
			localFrameA: {
				p: { x: -0.203779, y: -0.069371, z: -0.181922 },
				q: { v: { x: -0.253621, y: -0.414842, z: 0.106962 }, s: 0.867261 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: 0.0 },
				q: { v: { x: -0.201397, y: 0.001587, z: -0.90185 }, s: 0.382233 },
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
		refP: { x: -0.305614, y: 1.242907, z: -0.117599 },
		refQ: { v: { x: 0.165048, y: -0.563437, z: 0.802002 }, s: 0.109959 },
		c1: { x: 0.0, y: 0.0, z: 0.0 },
		c2: { x: 0.142406, y: 0.039392, z: 0.261092 },
		radius: 0.05,
		groupFilter: false,
		joint: {
			type: 'revolute',
			localFrameA: {
				p: { x: 0.095484, y: 0.039585, z: 0.240723 },
				q: { v: { x: -0.180627, y: 0.512487, z: -0.003744 }, s: -0.839474 },
			},
			localFrameB: {
				p: { x: 0.0, y: 0.0, z: 0.0 },
				q: { v: { x: -0.029831, y: 0.503803, z: -0.094017 }, s: -0.858169 },
			},
			swing: 0.0 * DEG,
			twistLo: -60.0 * DEG,
			twistHi: 5.0 * DEG,
			friction: 1.0,
		},
	},
];

export type Human = { bodies: b3BodyId[]; joints: b3JointId[] };

function normQ(
	qv: { x: number; y: number; z: number },
	s: number,
): { v: b3Vec3; s: number } {
	const len = Math.hypot(qv.x, qv.y, qv.z, s) || 1;
	return { v: { x: qv.x / len, y: qv.y / len, z: qv.z / len }, s: s / len };
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
		bodyDef.position = {
			x: position.x + bone.refP.x,
			y: position.y + bone.refP.y,
			z: position.z + bone.refP.z,
		};
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
		const frameA = {
			p: j.localFrameA.p,
			q: normQ(j.localFrameA.q.v, j.localFrameA.q.s),
		};
		const frameB = {
			p: j.localFrameB.p,
			q: normQ(j.localFrameB.q.v, j.localFrameB.q.s),
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
