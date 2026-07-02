// Shared three.js boilerplate, matching the crashcat examples' rendering setup:
// scene (0x1a1a1a), a 75° camera, ambient + directional light, orbit controls,
// resize handling, and a delta-clamped animation loop. Camera pose is per-example.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { createStats, type Stats } from './stats';

export type Harness = {
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGLRenderer;
	controls: OrbitControls;
	/** Shared lil-gui panel — examples add their own controls to this instead of creating a new GUI. */
	gui: GUI;
	stats: Stats;
	onFrame( cb: ( dt: number ) => void ): void;
	/**
	 * Run the physics step, timing just it for the stats MS panel — rendering
	 * and mesh sync are deliberately excluded. Call this instead of stepping
	 * the world directly, e.g. `app.step( () => b3.b3World_Step( world, 1 / 60, 4 ) )`.
	 */
	step( fn: () => void ): void;
	start(): void;
};

export interface HarnessOptions
{
	camera?: [number, number, number];
	target?: [number, number, number];
}

export function createHarness( options: HarnessOptions = {} ): Harness
{
	const { camera: cameraPos = [0, 10, 20], target = [0, 3, 0] } = options;

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

	// Shared lil-gui — examples add their own controls to `app.gui` rather
	// than creating their own. The stats.js panel (FPS + MS) lives inside a
	// "Stats" folder, the same way the crashcat examples nest it in the debug UI.
	const gui = new GUI();
	const stats = createStats();
	const statsFolder = gui.addFolder( 'Stats' );
	stats.dom.style.position = 'relative';
	statsFolder.domElement.appendChild( stats.dom );
	statsFolder.open();

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
		gui,
		stats,
		onFrame: ( cb ) => callbacks.push( cb ),
		step: ( fn ) =>
		{
			stats.begin();
			fn();
			stats.end();
		},
		start: () =>
		{
			lastTime = performance.now();
			animate();
		},
	};
}
