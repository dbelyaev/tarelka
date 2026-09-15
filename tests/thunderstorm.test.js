import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThunderstormEffect, buildStrike } from '../src/thunderstorm.js';
import { CONFIG } from '../src/config.js';

function setViewport(width, height) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

function mockReducedMotion(reduce) {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: vi.fn(query => ({ matches: reduce && query === '(prefers-reduced-motion: reduce)' }))
    });
}

/** Advance the effect far enough for its scheduler to fire a strike */
function forceStrike(effect) {
    effect.update(CONFIG.thunderstorm.strikeInterval.max);
}

describe('buildStrike', () => {
    const cfg = CONFIG.thunderstorm;

    it('keeps pulse count, spacing, and peak opacity within the photosensitivity-safe bounds', () => {
        for (let i = 0; i < 500; i++) {
            const pulses = buildStrike(false);

            expect(pulses.length).toBeGreaterThanOrEqual(1);
            expect(pulses.length).toBeLessThanOrEqual(cfg.maxPulses);
            expect(pulses[0].offsetSec).toBe(0);

            pulses.forEach((pulse, index) => {
                expect(pulse.peak).toBeGreaterThanOrEqual(cfg.peakOpacity.min);
                expect(pulse.peak).toBeLessThanOrEqual(cfg.peakOpacity.max);
                if (index > 0) {
                    expect(pulse.offsetSec - pulses[index - 1].offsetSec).toBeGreaterThanOrEqual(cfg.minPulseGapSec);
                }
            });
        }
    });

    it('never allows more than 3 pulses within any 1-second window (WCAG 2.3.1)', () => {
        for (let i = 0; i < 500; i++) {
            const offsets = buildStrike(false).map(p => p.offsetSec);
            for (const start of offsets) {
                const inWindow = offsets.filter(o => o >= start && o < start + 1);
                expect(inWindow.length).toBeLessThanOrEqual(3);
            }
        }
    });

    it('collapses to a single dimmed pulse under reduced motion', () => {
        for (let i = 0; i < 100; i++) {
            const pulses = buildStrike(true);
            expect(pulses).toHaveLength(1);
            expect(pulses[0].peak).toBeLessThanOrEqual(cfg.peakOpacity.max * cfg.reducedMotionOpacityScale);
        }
    });

    it('configures a strike interval longer than the longest possible strike, so strikes never overlap', () => {
        const longestPulseStart = (cfg.maxPulses - 1) * cfg.maxPulseGapSec;
        // Time for the brightest possible pulse to decay below the 0.01 visibility cutoff
        const fadeOut = cfg.pulseDecaySec * Math.log(cfg.peakOpacity.max / 0.01);
        expect(cfg.strikeInterval.min).toBeGreaterThan(longestPulseStart + fadeOut);
    });
});

describe('ThunderstormEffect', () => {
    let ctx;

    beforeEach(() => {
        document.body.innerHTML = '<main></main>';
        localStorage.clear();
        ctx = { clearRect: vi.fn(), stroke: vi.fn(), fillRect: vi.fn() };
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
        vi.stubGlobal('Path2D', class {
            moveTo() {}
            lineTo() {}
        });
        setViewport(800, 600);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        delete window.matchMedia;
    });

    it('uses its own storage key and canvas class, independent of the rain effect', () => {
        localStorage.setItem('rainEnabled', 'true');
        const effect = new ThunderstormEffect();

        expect(effect.enabled).toBe(false);
        expect(effect.hasExplicitPreference).toBe(false);
        expect(effect.canvas.classList.contains('thunderstorm-canvas')).toBe(true);
        expect(effect.canvas.classList.contains('weather-layer')).toBe(true);

        effect.toggle();
        expect(localStorage.getItem('thunderstormEnabled')).toBe('true');
        expect(localStorage.getItem('rainEnabled')).toBe('true');

        effect.cleanup();
    });

    it('renders rain streaks', () => {
        const effect = new ThunderstormEffect();
        expect(effect.raindrops.length).toBeGreaterThan(0);
        effect.cleanup();
    });

    it('does not schedule strikes while disabled', () => {
        const effect = new ThunderstormEffect();

        forceStrike(effect);

        expect(effect.strike).toBeNull();
        effect.cleanup();
    });

    it('fires a strike once the interval elapses and draws a flash only while it is visible', () => {
        const effect = new ThunderstormEffect();
        effect.toggle();

        effect.draw();
        expect(ctx.fillRect).not.toHaveBeenCalled();

        forceStrike(effect);
        expect(effect.strike).not.toBeNull();

        effect.draw();
        expect(ctx.fillRect).toHaveBeenCalledTimes(1);
        expect(ctx.fillStyle).toMatch(/^rgba\(215, 225, 255, /);

        effect.cleanup();
    });

    it('drops a finished strike once its last pulse has faded out', () => {
        const effect = new ThunderstormEffect();
        effect.toggle();
        forceStrike(effect);

        effect.update(2);

        expect(effect.strike).toBeNull();
        ctx.fillRect.mockClear();
        effect.draw();
        expect(ctx.fillRect).not.toHaveBeenCalled();

        effect.cleanup();
    });

    it('uses a single dimmed pulse when the user prefers reduced motion', () => {
        mockReducedMotion(true);
        const effect = new ThunderstormEffect();
        effect.toggle();

        forceStrike(effect);

        expect(effect.strike.pulses).toHaveLength(1);
        effect.cleanup();
    });

    it('clears an in-progress strike when disabled, so no flash lingers', () => {
        const effect = new ThunderstormEffect();
        effect.toggle();
        forceStrike(effect);

        effect.setEnabled(false);

        expect(effect.strike).toBeNull();
        expect(effect.flashIntensity()).toBe(0);
        expect(ctx.clearRect).toHaveBeenCalled();

        effect.cleanup();
    });

    it('does not strike immediately after being re-enabled', () => {
        // Math.random() = 0.5 rolls every strike delay to the interval midpoint
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const { min, max } = CONFIG.thunderstorm.strikeInterval;
        const effect = new ThunderstormEffect();
        effect.toggle();

        // Without a reset, the countdown would be 0.1s from firing here
        effect.update((min + max) / 2 - 0.1);
        effect.setEnabled(false);
        effect.setEnabled(true);
        effect.update(0.5);

        expect(effect.strike).toBeNull();
        effect.cleanup();
    });
});
