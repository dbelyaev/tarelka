import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SnowEffect } from '../src/snow.js';

const FLAKES_PER_AREA = 8000;
const MIN_SNOWFLAKES = 10;

function targetFlakeCount(width, height) {
    return Math.max(Math.floor((width * height) / FLAKES_PER_AREA), MIN_SNOWFLAKES);
}

function setViewport(width, height) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

function countsByLayer(effect) {
    return effect.snowflakes.reduce((counts, flake) => {
        counts[flake.layer] = (counts[flake.layer] || 0) + 1;
        return counts;
    }, {});
}

describe('SnowEffect', () => {
    beforeEach(() => {
        document.body.innerHTML = '<main></main>';
        localStorage.clear();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            fill: vi.fn()
        });
        setViewport(800, 600);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('populates enough snowflakes to cover the viewport area', () => {
        const effect = new SnowEffect();
        expect(effect.snowflakes).toHaveLength(targetFlakeCount(800, 600));
        effect.cleanup();
    });

    it('never drops below the minimum snowflake count on tiny viewports', () => {
        setViewport(50, 50);
        const effect = new SnowEffect();
        expect(effect.snowflakes.length).toBeGreaterThanOrEqual(MIN_SNOWFLAKES);
        effect.cleanup();
    });

    it('adds flakes proportionally when the viewport grows', () => {
        const effect = new SnowEffect();
        const before = effect.snowflakes.length;

        setViewport(1600, 1200);
        effect.resize();

        expect(effect.snowflakes.length).toBe(targetFlakeCount(1600, 1200));
        expect(effect.snowflakes.length).toBeGreaterThan(before);
        effect.cleanup();
    });

    it('removes flakes down to the new target when the viewport shrinks, without exceeding any layer’s prior count', () => {
        const effect = new SnowEffect();
        const before = countsByLayer(effect);

        setViewport(400, 300);
        effect.resize();

        const target = targetFlakeCount(400, 300);
        const after = countsByLayer(effect);

        expect(effect.snowflakes.length).toBe(target);
        for (const layer of [0, 1, 2]) {
            expect(after[layer] || 0).toBeLessThanOrEqual(before[layer] || 0);
        }
        effect.cleanup();
    });

    it('respects a persisted snowEnabled=false preference over the seasonal default', () => {
        localStorage.setItem('snowEnabled', 'false');
        const effect = new SnowEffect();
        expect(effect.enabled).toBe(false);
        effect.cleanup();
    });

    it('respects a persisted snowEnabled=true preference over the seasonal default', () => {
        localStorage.setItem('snowEnabled', 'true');
        const effect = new SnowEffect();
        expect(effect.enabled).toBe(true);
        effect.cleanup();
    });

    it('toggle() flips enabled state and persists it', () => {
        const effect = new SnowEffect();
        const initial = effect.enabled;

        effect.toggle();

        expect(effect.enabled).toBe(!initial);
        expect(localStorage.getItem('snowEnabled')).toBe(String(!initial));
        effect.cleanup();
    });

    it('cleanup() removes the canvas from the DOM', () => {
        const effect = new SnowEffect();
        expect(document.querySelector('main').contains(effect.canvas)).toBe(true);

        effect.cleanup();

        expect(document.querySelector('main').contains(effect.canvas)).toBe(false);
    });
});
