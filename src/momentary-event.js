/**
 * Primitives for momentary events (e.g. lightning strikes) — things that happen
 * at random intervals and fade out, rather than particles that move every frame.
 * Pure logic with no DOM/canvas access; effects drive them from update().
 */
import { randomInRange } from './utils.js';

/**
 * Fire onTrigger() after a random delay within `interval`, then roll a new delay.
 * @param {{ interval: {min: number, max: number}, onTrigger: () => void }} options - interval in seconds
 * @returns {{ tick: (deltaSec: number) => void, reset: () => void }}
 */
export function createEventScheduler({ interval, onTrigger }) {
    let remaining = randomInRange(interval.min, interval.max);

    return {
        tick(deltaSec) {
            remaining -= deltaSec;
            // At most one trigger per tick: a huge delta after a stalled frame
            // must not unleash a burst of back-to-back events.
            if (remaining <= 0) {
                remaining = randomInRange(interval.min, interval.max);
                onTrigger();
            }
        },
        reset() {
            remaining = randomInRange(interval.min, interval.max);
        }
    };
}

/**
 * Combined intensity of a sequence of exponentially-decaying pulses.
 * @param {{offsetSec: number, peak: number}[]} pulses
 * @param {number} elapsedSec - time since the sequence started
 * @param {number} decaySec - time constant of each pulse's exponential decay
 * @returns {number} intensity clamped to [0, 1]
 */
export function pulseIntensity(pulses, elapsedSec, decaySec) {
    let total = 0;
    for (const { offsetSec, peak } of pulses) {
        const t = elapsedSec - offsetSec;
        if (t >= 0) {
            total += peak * Math.exp(-t / decaySec);
        }
    }
    return Math.min(1, Math.max(0, total));
}
