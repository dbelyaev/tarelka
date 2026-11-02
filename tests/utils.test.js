import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkWebGLSupport, debounce, isSnowSeason, disposeMaterial, prefersCoarsePointer, prefersReducedMotion, pickWeightedIndex } from '../src/utils.js';

describe('checkWebGLSupport', () => {
    it('returns false when the canvas cannot produce a WebGL context', () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        expect(checkWebGLSupport()).toBe(false);
        vi.restoreAllMocks();
    });

    it('returns false and does not throw when getContext throws', () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
            throw new Error('no webgl');
        });
        expect(checkWebGLSupport()).toBe(false);
        vi.restoreAllMocks();
    });
});

describe('debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('only invokes the wrapped function once after the wait elapses', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced();
        debounced();
        debounced();

        expect(fn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('passes through the latest arguments and this context', () => {
        const fn = vi.fn();
        const obj = { debounced: debounce(fn, 50) };

        obj.debounced('first');
        obj.debounced('second');
        vi.advanceTimersByTime(50);

        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith('second');
    });

    it('cancel() prevents a pending invocation', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced();
        debounced.cancel();
        vi.advanceTimersByTime(100);

        expect(fn).not.toHaveBeenCalled();
    });
});

describe('isSnowSeason', () => {
    const currentMonth = new Date().getMonth() + 1;

    it('returns true when the current month is in the list', () => {
        expect(isSnowSeason([currentMonth])).toBe(true);
    });

    it('returns false when the current month is not in the list', () => {
        const otherMonth = (currentMonth % 12) + 1;
        expect(isSnowSeason([otherMonth])).toBe(false);
    });

    it('returns false for a non-array argument', () => {
        expect(isSnowSeason(null)).toBe(false);
        expect(isSnowSeason(undefined)).toBe(false);
    });
});

describe('prefersCoarsePointer', () => {
    afterEach(() => {
        delete window.matchMedia;
    });

    it('returns false when matchMedia is unavailable (default jsdom environment)', () => {
        expect(typeof window.matchMedia).toBe('undefined');
        expect(prefersCoarsePointer()).toBe(false);
    });

    it('returns true when matchMedia reports a coarse pointer', () => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn(() => ({ matches: true }))
        });
        expect(prefersCoarsePointer()).toBe(true);
    });

    it('returns false when matchMedia reports no match', () => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn(() => ({ matches: false }))
        });
        expect(prefersCoarsePointer()).toBe(false);
    });
});

describe('prefersReducedMotion', () => {
    afterEach(() => {
        delete window.matchMedia;
    });

    it('returns false when matchMedia is unavailable (default jsdom environment)', () => {
        expect(prefersReducedMotion()).toBe(false);
    });

    it('queries the reduced-motion media feature and reports its match', () => {
        const matchMedia = vi.fn(query => ({ matches: query === '(prefers-reduced-motion: reduce)' }));
        Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });

        expect(prefersReducedMotion()).toBe(true);
        expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('returns false when matchMedia reports no match', () => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn(() => ({ matches: false }))
        });
        expect(prefersReducedMotion()).toBe(false);
    });
});

describe('pickWeightedIndex', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('picks index 0 for a low random value', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.1);
        expect(pickWeightedIndex([0.3, 0.4, 0.3])).toBe(0);
    });

    it('picks the middle index for a value in its range', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        expect(pickWeightedIndex([0.3, 0.4, 0.3])).toBe(1);
    });

    it('picks the last index for a high random value', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.95);
        expect(pickWeightedIndex([0.3, 0.4, 0.3])).toBe(2);
    });

    it('never returns an out-of-range index even if the distribution sums below 1', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.999);
        expect(pickWeightedIndex([0.3, 0.3])).toBe(1);
    });
});

describe('disposeMaterial', () => {
    it('does nothing for a nullish material', () => {
        expect(() => disposeMaterial(null)).not.toThrow();
        expect(() => disposeMaterial(undefined)).not.toThrow();
    });

    it('disposes every present map plus the material itself', () => {
        const material = {
            map: { dispose: vi.fn() },
            normalMap: { dispose: vi.fn() },
            dispose: vi.fn()
        };

        disposeMaterial(material);

        expect(material.map.dispose).toHaveBeenCalledTimes(1);
        expect(material.normalMap.dispose).toHaveBeenCalledTimes(1);
        expect(material.dispose).toHaveBeenCalledTimes(1);
    });

    it('skips maps that are not set without throwing', () => {
        const material = { dispose: vi.fn() };
        expect(() => disposeMaterial(material)).not.toThrow();
        expect(material.dispose).toHaveBeenCalledTimes(1);
    });
});
