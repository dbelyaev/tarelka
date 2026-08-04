import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkWebGLSupport, debounce, isSnowSeason, disposeMaterial } from '../src/utils.js';

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
