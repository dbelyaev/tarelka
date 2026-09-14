import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SleetEffect } from '../src/sleet.js';
import { CONFIG } from '../src/config.js';

const DROPS_PER_AREA = 10000;
const MIN_SLEET_PARTICLES = 10;

function targetParticleCount(width, height) {
    return Math.max(Math.floor((width * height) / DROPS_PER_AREA), MIN_SLEET_PARTICLES);
}

function setViewport(width, height) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

describe('SleetEffect', () => {
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

    it('populates enough particles to cover the viewport area', () => {
        const effect = new SleetEffect();
        expect(effect.sleetflakes).toHaveLength(targetParticleCount(800, 600));
        effect.cleanup();
    });

    it('never drops below the minimum particle count on tiny viewports', () => {
        setViewport(50, 50);
        const effect = new SleetEffect();
        expect(effect.sleetflakes.length).toBeGreaterThanOrEqual(MIN_SLEET_PARTICLES);
        effect.cleanup();
    });

    it('adds particles proportionally when the viewport grows', () => {
        const effect = new SleetEffect();
        const before = effect.sleetflakes.length;

        setViewport(1600, 1200);
        effect.resize();

        expect(effect.sleetflakes).toHaveLength(targetParticleCount(1600, 1200));
        expect(effect.sleetflakes.length).toBeGreaterThan(before);
        effect.cleanup();
    });

    it('truncates to the new target when the viewport shrinks', () => {
        const effect = new SleetEffect();

        setViewport(400, 300);
        effect.resize();

        expect(effect.sleetflakes).toHaveLength(targetParticleCount(400, 300));
        effect.cleanup();
    });

    it('defaults to disabled when no preference is persisted', () => {
        const effect = new SleetEffect();
        expect(effect.enabled).toBe(false);
        expect(effect.hasExplicitPreference).toBe(false);
        effect.cleanup();
    });

    it('respects a persisted sleetEnabled=false preference', () => {
        localStorage.setItem('sleetEnabled', 'false');
        const effect = new SleetEffect();
        expect(effect.enabled).toBe(false);
        expect(effect.hasExplicitPreference).toBe(true);
        effect.cleanup();
    });

    it('respects a persisted sleetEnabled=true preference', () => {
        localStorage.setItem('sleetEnabled', 'true');
        const effect = new SleetEffect();
        expect(effect.enabled).toBe(true);
        expect(effect.hasExplicitPreference).toBe(true);
        effect.cleanup();
    });

    it('toggle() flips enabled state, persists it, and marks the preference explicit', () => {
        const effect = new SleetEffect();
        const initial = effect.enabled;

        effect.toggle();

        expect(effect.enabled).toBe(!initial);
        expect(localStorage.getItem('sleetEnabled')).toBe(String(!initial));
        expect(effect.hasExplicitPreference).toBe(true);
        effect.cleanup();
    });

    it('cleanup() removes the canvas from the DOM', () => {
        const effect = new SleetEffect();
        expect(document.querySelector('main').contains(effect.canvas)).toBe(true);

        effect.cleanup();

        expect(document.querySelector('main').contains(effect.canvas)).toBe(false);
    });

    it('picks a skew angle within the configured range', () => {
        const effect = new SleetEffect();
        expect(Math.abs(effect.angleDeg)).toBeGreaterThanOrEqual(CONFIG.sleet.angle.min);
        expect(Math.abs(effect.angleDeg)).toBeLessThanOrEqual(CONFIG.sleet.angle.max);
        effect.cleanup();
    });

    it('jitters each particle\'s angle around the shared base angle instead of all sharing one direction', () => {
        const effect = new SleetEffect();

        const distinctDirections = new Set(effect.sleetflakes.map(f => f.dirX));
        expect(distinctDirections.size).toBeGreaterThan(1);

        for (const flake of effect.sleetflakes) {
            const flakeAngleDeg = Math.atan2(flake.dirX, flake.dirY) * 180 / Math.PI;
            const delta = Math.abs(flakeAngleDeg - effect.angleDeg);
            expect(delta).toBeLessThanOrEqual(CONFIG.sleet.angleJitter + 1e-9);
        }

        effect.cleanup();
    });

    it('gives each particle an independent horizontal drift within the configured range', () => {
        const effect = new SleetEffect();

        const distinctDrifts = new Set(effect.sleetflakes.map(f => f.drift));
        expect(distinctDrifts.size).toBeGreaterThan(1);

        for (const flake of effect.sleetflakes) {
            expect(flake.drift).toBeGreaterThanOrEqual(CONFIG.sleet.drift.min);
            expect(flake.drift).toBeLessThanOrEqual(CONFIG.sleet.drift.max);
        }

        effect.cleanup();
    });

    it('scales down particle density on coarse-pointer (mobile-class) devices', () => {
        const baseline = new SleetEffect();
        const baselineCount = baseline.sleetflakes.length;
        baseline.cleanup();

        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn(() => ({ matches: true }))
        });

        const mobile = new SleetEffect();
        const expectedMobileCount = Math.max(
            Math.floor((800 * 600 * CONFIG.performance.mobileParticleScale) / DROPS_PER_AREA),
            MIN_SLEET_PARTICLES
        );

        expect(mobile.sleetflakes).toHaveLength(expectedMobileCount);
        expect(mobile.sleetflakes.length).toBeLessThan(baselineCount);

        mobile.cleanup();
        delete window.matchMedia;
    });
});
