// Shared three.js boilerplate, matching the crashcat examples' rendering setup:
// scene (0x1a1a1a), a 75° camera, ambient + directional light, orbit controls,
// resize handling, and a delta-clamped animation loop. Camera pose is per-example.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStats, type Stats } from './stats';

export type Harness = {
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGLRenderer;
	controls: OrbitControls;
	stats: Stats;
	onFrame( cb: ( dt: number ) => void ): void;
	start(): void;
};

export interface HarnessOptions
{
	camera?: [number, number, number];
	target?: [number, number, number];
	/** Show the stats.js FPS/MS/MB panel (physics + frame time). Defaults to true. */
	stats?: boolean;
}

export function createHarness( options: HarnessOptions = {} ): Harness
{
	const { camera: cameraPos = [0, 10, 20], target = [0, 3, 0], stats: showStats = true } = options;

	const scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x1a1a1a );

	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.set( cameraPos[0], cameraPos[1], cameraPos[2] );
	camera.lookAt( target[0], target[1], target[2] );

	const renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );

	const onResize = () =>
	{
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );
	};
	window.addEventListener( 'resize', onResize );
	onResize();

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.target.set( target[0], target[1], target[2] );

	scene.add( new THREE.AmbientLight( 0xffffff, 0.5 ) );
	const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.8 );
	directionalLight.position.set( 5, 10, 7 );
	scene.add( directionalLight );

	const callbacks: Array<( dt: number ) => void> = [];
	const maxDelta = 1 / 30;
	let lastTime = performance.now();

	function animate(): void
	{
		requestAnimationFrame( animate );
		const now = performance.now();
		const delta = Math.min( ( now - lastTime ) / 1000, maxDelta );
		lastTime = now;
		for ( const cb of callbacks ) cb( delta );
		controls.update();
		renderer.render( scene, camera );
	}

	return {
		scene,
		camera,
		renderer,
		controls,
		onFrame: ( cb ) => callbacks.push( cb ),
		start: () =>
		{
			lastTime = performance.now();
			animate();
		},
	};
}
