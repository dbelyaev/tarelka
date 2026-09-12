import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RainEffect } from '../src/rain.js';
import { CONFIG } from '../src/config.js';

const DROPS_PER_AREA = 12000;
const MIN_RAINDROPS = 10;

function targetDropCount(width, height) {
    return Math.max(Math.floor((width * height) / DROPS_PER_AREA), MIN_RAINDROPS);
}

function setViewport(width, height) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

describe('RainEffect', () => {
    beforeEach(() => {
        document.body.innerHTML = '<main></main>';
        localStorage.clear();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
            clearRect: vi.fn(),
            stroke: vi.fn()
        });
        setViewport(800, 600);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('populates enough raindrops to cover the viewport area', () => {
        const effect = new RainEffect();
        expect(effect.raindrops).toHaveLength(targetDropCount(800, 600));
        effect.cleanup();
    });

    it('never drops below the minimum raindrop count on tiny viewports', () => {
        setViewport(50, 50);
        const effect = new RainEffect();
        expect(effect.raindrops.length).toBeGreaterThanOrEqual(MIN_RAINDROPS);
        effect.cleanup();
    });

    it('adds drops proportionally when the viewport grows', () => {
        const effect = new RainEffect();
        const before = effect.raindrops.length;

        setViewport(1600, 1200);
        effect.resize();

        expect(effect.raindrops).toHaveLength(targetDropCount(1600, 1200));
        expect(effect.raindrops.length).toBeGreaterThan(before);
        effect.cleanup();
    });

    it('truncates to the new target when the viewport shrinks', () => {
        const effect = new RainEffect();

        setViewport(400, 300);
        effect.resize();

        expect(effect.raindrops).toHaveLength(targetDropCount(400, 300));
        effect.cleanup();
    });

    it('defaults to disabled when no preference is persisted', () => {
        const effect = new RainEffect();
        expect(effect.enabled).toBe(false);
        expect(effect.hasExplicitPreference).toBe(false);
        effect.cleanup();
    });

    it('respects a persisted rainEnabled=false preference', () => {
        localStorage.setItem('rainEnabled', 'false');
        const effect = new RainEffect();
        expect(effect.enabled).toBe(false);
        expect(effect.hasExplicitPreference).toBe(true);
        effect.cleanup();
    });

    it('respects a persisted rainEnabled=true preference', () => {
        localStorage.setItem('rainEnabled', 'true');
        const effect = new RainEffect();
        expect(effect.enabled).toBe(true);
        expect(effect.hasExplicitPreference).toBe(true);
        effect.cleanup();
    });

    it('toggle() flips enabled state, persists it, and marks the preference explicit', () => {
        const effect = new RainEffect();
        const initial = effect.enabled;

        effect.toggle();

        expect(effect.enabled).toBe(!initial);
        expect(localStorage.getItem('rainEnabled')).toBe(String(!initial));
        expect(effect.hasExplicitPreference).toBe(true);
        effect.cleanup();
    });

    it('cleanup() removes the canvas from the DOM', () => {
        const effect = new RainEffect();
        expect(document.querySelector('main').contains(effect.canvas)).toBe(true);

        effect.cleanup();

        expect(document.querySelector('main').contains(effect.canvas)).toBe(false);
    });

    it('picks a skew angle within the configured range', () => {
        const effect = new RainEffect();
        expect(Math.abs(effect.angleDeg)).toBeGreaterThanOrEqual(CONFIG.rain.angle.min);
        expect(Math.abs(effect.angleDeg)).toBeLessThanOrEqual(CONFIG.rain.angle.max);
        effect.cleanup();
    });

    it('jitters each drop\'s angle around the shared base angle instead of all sharing one direction', () => {
        const effect = new RainEffect();

        const distinctDirections = new Set(effect.raindrops.map(d => d.dirX));
        expect(distinctDirections.size).toBeGreaterThan(1);

        for (const drop of effect.raindrops) {
            const dropAngleDeg = Math.atan2(drop.dirX, drop.dirY) * 180 / Math.PI;
            const delta = Math.abs(dropAngleDeg - effect.angleDeg);
            expect(delta).toBeLessThanOrEqual(CONFIG.rain.angleJitter + 1e-9);
        }

        effect.cleanup();
    });

    it('scales down drop density on coarse-pointer (mobile-class) devices', () => {
        const baseline = new RainEffect();
        const baselineCount = baseline.raindrops.length;
        baseline.cleanup();

        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn(() => ({ matches: true }))
        });

        const mobile = new RainEffect();
        const expectedMobileCount = Math.max(
            Math.floor((800 * 600 * CONFIG.performance.mobileParticleScale) / 12000),
            MIN_RAINDROPS
        );

        expect(mobile.raindrops).toHaveLength(expectedMobileCount);
        expect(mobile.raindrops.length).toBeLessThan(baselineCount);

        mobile.cleanup();
        delete window.matchMedia;
    });
});
