/**
 * Screenshot automation for examples.
 *
 * Starts `pnpm run dev` (Vite dev server), navigates Playwright Chromium to
 * each example, waits for physics rendering to settle, clips to the <canvas>
 * element, and writes PNGs to examples/public/screenshots/<key>.png.
 *
 * Usage (from the examples/ directory):
 *   pnpm run screenshot                       # all examples
 *   pnpm run screenshot example-shapes        # one example
 *   SCREENSHOT_TIMEOUT=3000 pnpm run screenshot
 */

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(__dirname, '..');

const TIMEOUT_MS = Number(process.env.SCREENSHOT_TIMEOUT ?? 2500);
const VIEWPORT = { width: 1280, height: 720 };

// ---------------------------------------------------------------------------
// Read example registry
// ---------------------------------------------------------------------------

const examples = JSON.parse(
    readFileSync(resolve(examplesDir, 'src/examples.json'), 'utf8'),
);
const onlyKey = process.argv[2];
const exampleKeys = onlyKey
    ? Object.keys(examples).filter((k) => k === onlyKey)
    : Object.keys(examples);
if (onlyKey && exampleKeys.length === 0) {
    throw new Error(`Unknown example key: ${onlyKey}`);
}

// ---------------------------------------------------------------------------
// Ensure output directory exists
// ---------------------------------------------------------------------------

const screenshotsDir = resolve(examplesDir, 'public/screenshots');
mkdirSync(screenshotsDir, { recursive: true });

// ---------------------------------------------------------------------------
// Start Vite dev server and wait until ready
// ---------------------------------------------------------------------------

function startDevServer() {
    return new Promise((resolve, reject) => {
        const proc = spawn('pnpm', ['run', 'dev', '--', '--port', '5199', '--strictPort'], {
            cwd: examplesDir,
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        let resolved = false;

        const onData = (data) => {
            const text = data.toString();
            process.stdout.write(`[vite] ${text}`);
            const match = text.match(/Local:\s+(http:\/\/localhost:\d+)/);
            if (match && !resolved) {
                resolved = true;
                resolve({ proc, url: match[1] });
            }
        };

        proc.stdout.on('data', onData);
        proc.stderr.on('data', onData);
        proc.on('error', reject);
        proc.on('exit', (code) => {
            if (!resolved) reject(new Error(`Vite exited early with code ${code}`));
        });
    });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let viteProc = null;

try {
    console.log('Starting Vite dev server...');
    const { proc, url } = await startDevServer();
    viteProc = proc;
    console.log(`Vite ready at ${url}`);

    const browser = await chromium.launch({
        headless: process.env.HEADED !== '1',
        args: [
            '--use-angle=metal',
            '--window-position=-10000,-10000',
        ],
    });

    const context = await browser.newContext({ viewport: VIEWPORT });
    const page = await context.newPage();

    page.on('pageerror', (err) => console.error(`[page error] ${err.message}`));
    page.on('console', (msg) => {
        if (msg.type() === 'error') console.error(`[console] ${msg.text()}`);
    });

    for (const key of exampleKeys) {
        const pageUrl = `${url}/${key}.html`;
        console.log(`\n-> ${key}`);

        await page.goto(pageUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(TIMEOUT_MS);

        // Hide DOM overlays (lil-gui, any status elements) so they don't
        // appear on top of the canvas in the screenshot.
        await page.evaluate(() => {
            document.querySelectorAll('.lil-gui, #status').forEach((el) => {
                el.style.display = 'none';
            });
        });

        const canvas = page.locator('canvas').first();
        const box = await canvas.boundingBox();

        if (!box) {
            console.warn(`  No <canvas> found - skipping`);
            continue;
        }

        const outPath = resolve(screenshotsDir, `${key}.png`);
        await page.screenshot({ path: outPath, clip: box });
        console.log(`  Saved -> ${outPath}`);
    }

    await browser.close();
    console.log('\nAll screenshots captured.');
} finally {
    if (viteProc) viteProc.kill('SIGTERM');
}
