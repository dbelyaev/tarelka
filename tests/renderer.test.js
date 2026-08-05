import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
 * Stand-in for THREE.WebGLRenderer that reproduces how three.js derives the
 * canvas drawing buffer and the GL viewport from a setSize() call: the buffer
 * is floored, the viewport is rounded. If the two disagree the browser logs
 * "drawElementsInstanced: Drawing to a destination rect smaller than the
 * viewport rect".
 */
function createFakeRenderer() {
    const domElement = document.createElement('canvas');
    let pixelRatio = 1;

    return {
        domElement,
        viewport: { width: 0, height: 0 },
        setPixelRatio(value) {
            pixelRatio = value;
        },
        getPixelRatio() {
            return pixelRatio;
        },
        setSize(width, height, updateStyle = true) {
            domElement.width = Math.floor(width * pixelRatio);
            domElement.height = Math.floor(height * pixelRatio);
            this.viewport.width = Math.round(width * pixelRatio);
            this.viewport.height = Math.round(height * pixelRatio);
            if (updateStyle) {
                domElement.style.width = `${width}px`;
                domElement.style.height = `${height}px`;
            }
        }
    };
}

// Viewport/DPR combinations whose product lands on a .5-or-higher fraction,
// which is what makes floor() and round() diverge.
const AWKWARD_VIEWPORTS = [
    [1281, 721, 1],
    [1439, 899, 1.25],
    [1023, 767, 1.5],
    [1365, 767, 1.75],
    [1280, 720, 2],
    [999, 555, 3],
    [1, 1, 1.25]
];

describe('computeRenderSize', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        setViewport(originalWidth, originalHeight, originalPixelRatio);
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

    afterEach(() => {
        setViewport(originalWidth, originalHeight, originalPixelRatio);
    });

    for (const ps1Style of [false, true]) {
        it(`keeps the GL viewport within the drawing buffer (ps1Style=${ps1Style})`, async () => {
            if (ps1Style) {
                localStorage.setItem('ps1Style', 'true');
            }
            const { applyRenderSize } = await loadRenderer();

            for (const [width, height, dpr] of AWKWARD_VIEWPORTS) {
                setViewport(width, height, dpr);
                const renderer = createFakeRenderer();
                applyRenderSize(renderer);

                expect(renderer.viewport.width).toBe(renderer.domElement.width);
                expect(renderer.viewport.height).toBe(renderer.domElement.height);
            }
        });
    }

    it('stretches the canvas over the full viewport via CSS', async () => {
        setViewport(1439, 899, 1.25);
        const { applyRenderSize } = await loadRenderer();
        const renderer = createFakeRenderer();

        applyRenderSize(renderer);

        expect(renderer.domElement.style.width).toBe('1439px');
        expect(renderer.domElement.style.height).toBe('899px');
    });
});
