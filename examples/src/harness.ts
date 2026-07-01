// Shared three.js boilerplate every example builds on: renderer, scene, camera,
// orbit controls, lights, a ground grid, resize handling, and a delta-clamped
// animation loop. Examples register per-frame callbacks and call start().

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface Harness
{
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGLRenderer;
	controls: OrbitControls;
	onFrame( cb: ( dt: number ) => void ): void;
	start(): void;
}

export function createHarness(): Harness
{
	const scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x15151a );

	const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
	camera.position.set( 14, 11, 18 );

	const renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	document.body.appendChild( renderer.domElement );

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.target.set( 0, 2, 0 );

	scene.add( new THREE.AmbientLight( 0xffffff, 0.5 ) );
	const sun = new THREE.DirectionalLight( 0xffffff, 2.0 );
	sun.position.set( 12, 22, 8 );
	sun.castShadow = true;
	sun.shadow.mapSize.set( 2048, 2048 );
	sun.shadow.camera.near = 1;
	sun.shadow.camera.far = 80;
	const s = 30;
	sun.shadow.camera.left = -s;
	sun.shadow.camera.right = s;
	sun.shadow.camera.top = s;
	sun.shadow.camera.bottom = -s;
	scene.add( sun );

	const grid = new THREE.GridHelper( 60, 60, 0x333333, 0x222222 );
	scene.add( grid );

	window.addEventListener( 'resize', () =>
	{
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize( window.innerWidth, window.innerHeight );
	} );

	const callbacks: Array<( dt: number ) => void> = [];
	let last = performance.now();

	function loop(): void
	{
		requestAnimationFrame( loop );
		const now = performance.now();
		const dt = Math.min( ( now - last ) / 1000, 1 / 30 );
		last = now;
		for ( const cb of callbacks ) cb( dt );
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
			last = performance.now();
			loop();
		},
	};
}
