import fs from 'node:fs';
import { defineConfig } from 'vite';

// Multi-page app: every root-level *.html becomes a rollup input, so adding an
// example is just dropping in an <name>.html + src/<name>.ts pair.
const input: Record<string, string> = {};
for ( const file of fs.readdirSync( './' ) )
{
	if ( file.endsWith( '.html' ) )
	{
		input[file.replace( '.html', '' )] = `./${file}`;
	}
}

export default defineConfig( {
	base: './',
	build: { outDir: 'dist', target: 'esnext', rollupOptions: { input } },
	server: { open: '/index.html' },
	// The emscripten module is a large self-contained bundle; let it pass
	// through rather than having esbuild pre-bundle the inlined wasm.
	optimizeDeps: { exclude: ['box3d.js'] },
} );
