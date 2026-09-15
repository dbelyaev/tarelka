/**
 * Thunderstorm effect — rain streaks plus momentary lightning flashes
 *
 * Reuses RainEffect's particle system wholesale (a thunderstorm is rain that
 * occasionally lights up) and layers a momentary-event model on top: a
 * scheduler fires a strike every few seconds, and each strike is a short
 * sequence of exponentially-decaying flicker pulses drawn as a translucent
 * full-canvas fill over the rain.
 *
 * Accessibility: pulse spacing, strike interval, and opacity are bounded by
 * CONFIG.thunderstorm to stay under the WCAG 2.3.1 three-flashes-per-second
 * threshold, and prefers-reduced-motion collapses each strike to one dim pulse.
 */
import { CONFIG } from './config.js';
import { prefersReducedMotion, randomInRange } from './utils.js';
import { RainEffect } from './rain.js';
import { createEventScheduler, pulseIntensity } from './momentary-event.js';

/** Below this intensity a flash is invisible, so it isn't drawn and a finished strike is dropped */
const MIN_VISIBLE_INTENSITY = 0.01;

/**
 * Build the flicker pulse sequence for one lightning strike.
 * @param {boolean} reducedMotion - collapse to a single dimmed pulse
 * @returns {{offsetSec: number, peak: number}[]}
 */
export function buildStrike(reducedMotion) {
    const cfg = CONFIG.thunderstorm;
    const rollPeak = () => randomInRange(cfg.peakOpacity.min, cfg.peakOpacity.max);

    if (reducedMotion) {
        return [{ offsetSec: 0, peak: rollPeak() * cfg.reducedMotionOpacityScale }];
    }

    const count = Math.floor(randomInRange(1, cfg.maxPulses + 1));
    const pulses = [];
    let offsetSec = 0;
    for (let i = 0; i < count; i++) {
        pulses.push({ offsetSec, peak: rollPeak() });
        offsetSec += randomInRange(cfg.minPulseGapSec, cfg.maxPulseGapSec);
    }
    return pulses;
}

/**
 * Thunderstorm effect manager
 */
export class ThunderstormEffect extends RainEffect {
    constructor() {
        super({ className: 'thunderstorm-canvas', storageKey: 'thunderstormEnabled' });

        this.strike = null;
        this.scheduler = createEventScheduler({
            interval: CONFIG.thunderstorm.strikeInterval,
            onTrigger: () => {
                // Checked per strike so an OS-level preference change applies without a reload
                this.strike = { pulses: buildStrike(prefersReducedMotion()), elapsed: 0 };
            }
        });
    }

    /** Current flash intensity in [0, 1]; 0 when no strike is active */
    flashIntensity() {
        if (!this.strike) return 0;
        return pulseIntensity(this.strike.pulses, this.strike.elapsed, CONFIG.thunderstorm.pulseDecaySec);
    }

    update(delta) {
        if (!this.enabled) return;

        super.update(delta);

        if (this.strike) {
            this.strike.elapsed += delta;
            const lastOffset = this.strike.pulses.at(-1).offsetSec;
            if (this.strike.elapsed > lastOffset && this.flashIntensity() < MIN_VISIBLE_INTENSITY) {
                this.strike = null;
            }
        }
        this.scheduler.tick(delta);
    }

    draw() {
        if (!this.enabled) return;

        super.draw();

        const intensity = this.flashIntensity();
        if (intensity >= MIN_VISIBLE_INTENSITY) {
            this.ctx.fillStyle = `rgba(215, 225, 255, ${intensity})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    _onEnabledChange(enabled) {
        super._onEnabledChange(enabled);
        // Never leave a flash frozen mid-strike, and don't strike the instant it's re-enabled
        this.strike = null;
        this.scheduler.reset();
    }
}
