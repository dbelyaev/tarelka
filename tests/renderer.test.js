import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { makeMockGL } from './helpers/mock-gl.js';

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;
const originalPixelRatio = window.devicePixelRatio;

function setViewport(width, height, devicePixelRatio) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
    Object.defineProperty(window, 'devicePixelRatio', { value: devicePixelRatio, configurable: true });
}

async function loadRenderer() {
    vi.resetModules();
    return import('../src/renderer.js');
}

/**
 * Build a real THREE.WebGLRenderer on a mock GL context, so assertions run
 * against three.js's own sizing code rather than a reimplementation of it.
 */
function createRealRenderer() {
    const canvas = document.createElement('canvas');
    const gl = makeMockGL();
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl });
    return { renderer, canvas, gl };
}

// Viewport/DPR combinations whose product lands on a .5-or-higher fraction,
// which is what makes three.js's floor() (drawing buffer) and round() (GL
// viewport) diverge.
const AWKWARD_VIEWPORTS = [
    [1281, 721, 1],
    [1439, 899, 1.25],
    [1023, 767, 1.5],
    [1365, 767, 1.75],
    [1280, 720, 2],
    [999, 555, 3],
    [1, 1, 1.25]
];

afterEach(() => {
    setViewport(originalWidth, originalHeight, originalPixelRatio);
});

describe('computeRenderSize', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns whole-pixel buffer dimensions in standard mode', async () => {
        const { computeRenderSize } = await loadRenderer();

        for (const [width, height, dpr] of AWKWARD_VIEWPORTS) {
            setViewport(width, height, dpr);
            const size = computeRenderSize();
            expect(Number.isInteger(size.width)).toBe(true);
            expect(Number.isInteger(size.height)).toBe(true);
        }
    });

    it('returns whole-pixel buffer dimensions in PS1 mode', async () => {
        localStorage.setItem('ps1Style', 'true');
        const { computeRenderSize } = await loadRenderer();

        for (const [width, height, dpr] of AWKWARD_VIEWPORTS) {
            setViewport(width, height, dpr);
            const size = computeRenderSize();
            expect(Number.isInteger(size.width)).toBe(true);
            expect(Number.isInteger(size.height)).toBe(true);
        }
    });

    it('caps the buffer at maxPixelRatio on high-DPI displays', async () => {
        setViewport(1000, 500, 4);
        const { computeRenderSize } = await loadRenderer();
        const { CONFIG } = await import('../src/config.js');

        expect(computeRenderSize().width).toBe(1000 * CONFIG.renderer.maxPixelRatio);
    });

    it('scales the buffer down by ps1PixelScale in PS1 mode', async () => {
        localStorage.setItem('ps1Style', 'true');
        setViewport(1280, 720, 2);
        const { computeRenderSize } = await loadRenderer();
        const { CONFIG } = await import('../src/config.js');

        expect(computeRenderSize().width).toBe(1280 / CONFIG.ps1PixelScale);
    });

    it('never returns a zero-sized buffer', async () => {
        localStorage.setItem('ps1Style', 'true');
        setViewport(1, 1, 1);
        const { computeRenderSize } = await loadRenderer();

        expect(computeRenderSize()).toMatchObject({ width: 1, height: 1 });
    });
});

describe('applyRenderSize', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    for (const ps1Style of [false, true]) {
        it(`keeps the GL viewport within the drawing buffer (ps1Style=${ps1Style})`, async () => {
            if (ps1Style) {
                localStorage.setItem('ps1Style', 'true');
            }
            const { applyRenderSize } = await loadRenderer();

            for (const [width, height, dpr] of AWKWARD_VIEWPORTS) {
                setViewport(width, height, dpr);
                const { renderer, canvas, gl } = createRealRenderer();

                applyRenderSize(renderer);

                // A viewport wider or taller than the drawing buffer is what makes
                // browsers warn "Drawing to a destination rect smaller than the
                // viewport rect".
                expect(gl.lastViewport).toEqual([0, 0, canvas.width, canvas.height]);
            }
        });
    }

    it('stretches the canvas over the full viewport via CSS', async () => {
        setViewport(1439, 899, 1.25);
        const { applyRenderSize } = await loadRenderer();
        const { renderer, canvas } = createRealRenderer();

        applyRenderSize(renderer);

        expect(canvas.style.width).toBe('1439px');
        expect(canvas.style.height).toBe('899px');
    });
});

describe('three.js sizing behaviour', () => {
    // Guards the assumption the fix is built on. If a future three.js release
    // makes the drawing buffer and the viewport agree on their own, this test
    // fails and applyRenderSize can be simplified.
    it('still derives the buffer with floor() and the viewport with round()', () => {
        const { renderer, canvas, gl } = createRealRenderer();

        renderer.setPixelRatio(1);
        renderer.setSize(640.5, 360.5, false);

        expect([canvas.width, canvas.height]).toEqual([640, 360]);
        expect(gl.lastViewport).toEqual([0, 0, 641, 361]);
    });
});
