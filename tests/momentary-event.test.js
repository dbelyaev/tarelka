import { describe, it, expect, vi, afterEach } from 'vitest';
import { createEventScheduler, pulseIntensity } from '../src/momentary-event.js';

describe('createEventScheduler', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Math.random() = 0.5 over interval [2, 6] rolls a 4-second delay every time
    function createScheduler() {
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
        const onTrigger = vi.fn();
        const scheduler = createEventScheduler({ interval: { min: 2, max: 6 }, onTrigger });
        return { scheduler, onTrigger };
    }

    it('fires only once the rolled delay has elapsed', () => {
        const { scheduler, onTrigger } = createScheduler();

        scheduler.tick(3.75);
        expect(onTrigger).not.toHaveBeenCalled();

        scheduler.tick(0.25);
        expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    it('rolls a fresh delay after firing', () => {
        const { scheduler, onTrigger } = createScheduler();

        scheduler.tick(4);
        scheduler.tick(3.75);
        expect(onTrigger).toHaveBeenCalledTimes(1);

        scheduler.tick(0.25);
        expect(onTrigger).toHaveBeenCalledTimes(2);
    });

    it('fires at most once per tick, even for a delta spanning several intervals', () => {
        const { scheduler, onTrigger } = createScheduler();

        scheduler.tick(100);

        expect(onTrigger).toHaveBeenCalledTimes(1);
    });

    it('reset() discards elapsed progress and restarts the countdown', () => {
        const { scheduler, onTrigger } = createScheduler();

        scheduler.tick(3.5);
        scheduler.reset();
        scheduler.tick(3.5);
        expect(onTrigger).not.toHaveBeenCalled();

        scheduler.tick(0.5);
        expect(onTrigger).toHaveBeenCalledTimes(1);
    });
});

describe('pulseIntensity', () => {
    const decaySec = 0.1;

    it('is zero before the first pulse starts', () => {
        expect(pulseIntensity([{ offsetSec: 0.5, peak: 0.5 }], 0.2, decaySec)).toBe(0);
    });

    it('equals the peak at the pulse offset and decays exponentially afterwards', () => {
        const pulses = [{ offsetSec: 0.2, peak: 0.5 }];

        expect(pulseIntensity(pulses, 0.2, decaySec)).toBeCloseTo(0.5);
        expect(pulseIntensity(pulses, 0.3, decaySec)).toBeCloseTo(0.5 * Math.exp(-1));
        expect(pulseIntensity(pulses, 2, decaySec)).toBeLessThan(0.001);
    });

    it('sums overlapping pulses', () => {
        const pulses = [{ offsetSec: 0, peak: 0.3 }, { offsetSec: 0.1, peak: 0.3 }];
        expect(pulseIntensity(pulses, 0.1, decaySec)).toBeCloseTo(0.3 * Math.exp(-1) + 0.3);
    });

    it('clamps the combined intensity to 1', () => {
        const pulses = [{ offsetSec: 0, peak: 0.8 }, { offsetSec: 0, peak: 0.8 }];
        expect(pulseIntensity(pulses, 0, decaySec)).toBe(1);
    });

    it('is zero for an empty pulse list', () => {
        expect(pulseIntensity([], 1, decaySec)).toBe(0);
    });
});
