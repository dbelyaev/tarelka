import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WeatherEffect } from '../src/weather-effect.js';

class RecordingEffect extends WeatherEffect {
    constructor(options) {
        super(options);
        this.changes = [];
    }

    _onEnabledChange(enabled) {
        this.changes.push(enabled);
    }
}

function createEffect(defaultEnabled = false) {
    return new RecordingEffect({ storageKey: 'testEnabled', resolveDefaultEnabled: () => defaultEnabled });
}

describe('WeatherEffect', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('falls back to the resolved default when no preference is persisted', () => {
        expect(createEffect(true).enabled).toBe(true);
        expect(createEffect(false).enabled).toBe(false);
        expect(createEffect(true).hasExplicitPreference).toBe(false);
    });

    it('prefers a persisted preference over the default', () => {
        localStorage.setItem('testEnabled', 'false');
        const effect = createEffect(true);
        expect(effect.enabled).toBe(false);
        expect(effect.hasExplicitPreference).toBe(true);
    });

    it('does not consult the default resolver when a preference is persisted', () => {
        localStorage.setItem('testEnabled', 'true');
        const resolveDefaultEnabled = vi.fn(() => false);
        const effect = new WeatherEffect({ storageKey: 'testEnabled', resolveDefaultEnabled });
        expect(effect.enabled).toBe(true);
        expect(resolveDefaultEnabled).not.toHaveBeenCalled();
    });

    it('does not call _onEnabledChange during construction', () => {
        const spy = vi.spyOn(RecordingEffect.prototype, '_onEnabledChange');
        createEffect(true);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('toggle() flips state, persists it, marks it explicit, and notifies the subclass', () => {
        const effect = createEffect(false);

        effect.toggle();

        expect(effect.enabled).toBe(true);
        expect(effect.hasExplicitPreference).toBe(true);
        expect(localStorage.getItem('testEnabled')).toBe('true');
        expect(effect.changes).toEqual([true]);
    });

    it('setEnabled() changes state and notifies without persisting or marking a preference', () => {
        const effect = createEffect(false);

        effect.setEnabled(true);

        expect(effect.enabled).toBe(true);
        expect(effect.hasExplicitPreference).toBe(false);
        expect(localStorage.getItem('testEnabled')).toBeNull();
        expect(effect.changes).toEqual([true]);
    });

    it('setEnabled() with the current state is a no-op that does not notify', () => {
        const effect = createEffect(true);
        effect.setEnabled(true);
        expect(effect.changes).toEqual([]);
    });

    it('provides no-op update/draw/cleanup so every effect shares one shape', () => {
        const effect = createEffect();
        expect(() => {
            effect.update(0.016);
            effect.draw();
            effect.cleanup();
        }).not.toThrow();
    });
});
