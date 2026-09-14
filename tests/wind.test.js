import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WindEffect } from '../src/wind.js';
import { CONFIG } from '../src/config.js';

const STREAKS_PER_AREA = 15000;
const MIN_WIND_STREAKS = 10;

function targetStreakCount(width, height) {
    return Math.max(Math.floor((width * height) / STREAKS_PER_AREA), MIN_WIND_STREAKS);
}

function setViewport(width, height) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

function countsByLayer(effect) {
    return effect.streaks.reduce((counts, streak) => {
        counts[streak.layer] = (counts[streak.layer] || 0) + 1;
        return counts;
    }, {});
}

describe('WindEffect', () => {
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

    it('populates enough streaks to cover the viewport area', () => {
        const effect = new WindEffect();
        expect(effect.streaks).toHaveLength(targetStreakCount(800, 600));
        effect.cleanup();
    });

    it('never drops below the minimum streak count on tiny viewports', () => {
        setViewport(50, 50);
        const effect = new WindEffect();
        expect(effect.streaks.length).toBeGreaterThanOrEqual(MIN_WIND_STREAKS);
        effect.cleanup();
    });

    it('adds streaks proportionally when the viewport grows', () => {
        const effect = new WindEffect();
        const before = effect.streaks.length;

        setViewport(1600, 1200);
        effect.resize();

        expect(effect.streaks).toHaveLength(targetStreakCount(1600, 1200));
        expect(effect.streaks.length).toBeGreaterThan(before);
        effect.cleanup();
    });

    it('removes streaks down to the new target when the viewport shrinks, without exceeding any layer’s prior count', () => {
        const effect = new WindEffect();
        const before = countsByLayer(effect);

        setViewport(400, 300);
        effect.resize();

        const target = targetStreakCount(400, 300);
        const after = countsByLayer(effect);

        expect(effect.streaks).toHaveLength(target);
        for (const layer of [0, 1, 2]) {
            expect(after[layer] || 0).toBeLessThanOrEqual(before[layer] || 0);
        }
        effect.cleanup();
    });

    it('defaults to disabled when no preference is persisted', () => {
        const effect = new WindEffect();
        expect(effect.enabled).toBe(false);
        expect(effect.hasExplicitPreference).toBe(false);
        effect.cleanup();
    });

    it('respects a persisted windEnabled=false preference', () => {
        localStorage.setItem('windEnabled', 'false');
        const effect = new WindEffect();
        expect(effect.enabled).toBe(false);
        expect(effect.hasExplicitPreference).toBe(true);
        effect.cleanup();
    });

    it('respects a persisted windEnabled=true preference', () => {
        localStorage.setItem('windEnabled', 'true');
        const effect = new WindEffect();
        expect(effect.enabled).toBe(true);
        expect(effect.hasExplicitPreference).toBe(true);
        effect.cleanup();
    });

    it('toggle() flips enabled state, persists it, and marks the preference explicit', () => {
        const effect = new WindEffect();
        const initial = effect.enabled;

        effect.toggle();

        expect(effect.enabled).toBe(!initial);
        expect(localStorage.getItem('windEnabled')).toBe(String(!initial));
        expect(effect.hasExplicitPreference).toBe(true);
        effect.cleanup();
    });

    it('cleanup() removes the canvas from the DOM', () => {
        const effect = new WindEffect();
        expect(document.querySelector('main').contains(effect.canvas)).toBe(true);

        effect.cleanup();

        expect(document.querySelector('main').contains(effect.canvas)).toBe(false);
    });

    it('picks a shared base direction sign of 1 or -1', () => {
        const effect = new WindEffect();
        expect([1, -1]).toContain(effect.baseDirSign);
        effect.cleanup();
    });

    it('jitters each streak\'s angle within the configured range of the base', () => {
        const effect = new WindEffect();

        const distinctDirections = new Set(effect.streaks.map(s => s.dirY));
        expect(distinctDirections.size).toBeGreaterThan(1);

        const maxAngleRad = (CONFIG.wind.angle.max + CONFIG.wind.angleJitter) * Math.PI / 180;
        for (const streak of effect.streaks) {
            expect(Math.abs(streak.dirY)).toBeLessThanOrEqual(Math.sin(maxAngleRad) + 1e-9);
        }

        effect.cleanup();
    });

    it('scales down streak density on coarse-pointer (mobile-class) devices', () => {
        const baseline = new WindEffect();
        const baselineCount = baseline.streaks.length;
        baseline.cleanup();

        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn(() => ({ matches: true }))
        });

        const mobile = new WindEffect();
        const expectedMobileCount = Math.max(
            Math.floor((800 * 600 * CONFIG.performance.mobileParticleScale) / STREAKS_PER_AREA),
            MIN_WIND_STREAKS
        );

        expect(mobile.streaks).toHaveLength(expectedMobileCount);
        expect(mobile.streaks.length).toBeLessThan(baselineCount);

        mobile.cleanup();
        delete window.matchMedia;
    });
});
