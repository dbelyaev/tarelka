import { describe, it, expect, vi } from 'vitest';
import { createWeatherGroup, createNoopEffect, instantiateWeathers } from '../src/weather.js';

function fakeWeather(label, enabled = false, hasExplicitPreference = false) {
    const effect = {
        enabled,
        hasExplicitPreference,
        toggle: vi.fn(function () {
            this.enabled = !this.enabled;
            this.hasExplicitPreference = true;
        }),
        setEnabled: vi.fn(function (value) {
            this.enabled = value;
        })
    };
    return { effect, label };
}

describe('createWeatherGroup', () => {
    it('turns off any other enabled effect when one is toggled on', () => {
        const snow = fakeWeather('Snow', true);
        const rain = fakeWeather('Rain', false);
        const group = createWeatherGroup([snow, rain]);

        group.toggle(rain);

        expect(rain.effect.enabled).toBe(true);
        expect(snow.effect.enabled).toBe(false);
    });

    it('does not touch other already-off effects when toggling the active one off', () => {
        const snow = fakeWeather('Snow', false);
        const rain = fakeWeather('Rain', true);
        const group = createWeatherGroup([snow, rain]);

        group.toggle(rain);

        expect(rain.effect.enabled).toBe(false);
        expect(snow.effect.toggle).not.toHaveBeenCalled();
    });

    it('keeps only the first effect enabled if construction finds more than one already on', () => {
        const snow = fakeWeather('Snow', true);
        const rain = fakeWeather('Rain', true);
        createWeatherGroup([snow, rain]);

        expect(snow.effect.enabled).toBe(true);
        expect(rain.effect.enabled).toBe(false);
    });

    it('prefers an explicitly-chosen effect over one enabled only by a fallback default', () => {
        // Regression: snow enabled by its seasonal default, rain enabled by an explicit
        // user choice — snow must lose the tie despite being first in the array.
        const snow = fakeWeather('Snow', true, false);
        const rain = fakeWeather('Rain', true, true);
        createWeatherGroup([snow, rain]);

        expect(rain.effect.enabled).toBe(true);
        expect(snow.effect.enabled).toBe(false);
    });

    it('disables a construction-time conflict loser via setEnabled(), not toggle() — so it is never falsely marked as an explicit user choice', () => {
        // Regression: using toggle() here would persist a fabricated "user explicitly
        // turned this off" preference just because of automatic startup reconciliation,
        // permanently corrupting hasExplicitPreference for an effect the user never touched.
        const snow = fakeWeather('Snow', true, false);
        const rain = fakeWeather('Rain', true, true);
        createWeatherGroup([snow, rain]);

        expect(snow.effect.toggle).not.toHaveBeenCalled();
        expect(snow.effect.setEnabled).toHaveBeenCalledWith(false);
        expect(snow.effect.hasExplicitPreference).toBe(false);
    });

    it('leaves a working effect on when the target failed to construct (no-op toggle stub)', () => {
        // Regression: main.js falls back to a no-op stub ({ enabled: false, toggle: () => {}, ... })
        // when an effect throws during construction. Its toggle() never flips .enabled, so
        // disabling peers unconditionally would silently turn off a working effect for nothing.
        const snow = fakeWeather('Snow', true);
        const brokenRain = { effect: { enabled: false, toggle: vi.fn() }, label: 'Rain' };
        const group = createWeatherGroup([snow, brokenRain]);

        group.toggle(brokenRain);

        expect(brokenRain.effect.enabled).toBe(false);
        expect(snow.effect.enabled).toBe(true);
    });

    it('toggles normally in a single-effect group', () => {
        const snow = fakeWeather('Snow', false);
        const group = createWeatherGroup([snow]);

        group.toggle(snow);
        expect(snow.effect.enabled).toBe(true);

        group.toggle(snow);
        expect(snow.effect.enabled).toBe(false);
    });
});

describe('instantiateWeathers', () => {
    it('constructs each effect and carries over its name, label, and key', () => {
        const effect = { enabled: false };
        const [weather] = instantiateWeathers([
            { name: 'rain', label: 'Rain', key: 'r', create: () => effect }
        ]);

        expect(weather).toEqual({ effect, name: 'rain', label: 'Rain', key: 'r' });
    });

    it('falls back to a disabled no-op effect when construction throws, without affecting the others', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const working = { enabled: true };

        const [broken, ok] = instantiateWeathers([
            { name: 'fog', label: 'Fog', key: 'f', create: () => { throw new Error('boom'); } },
            { name: 'rain', label: 'Rain', key: 'r', create: () => working }
        ]);

        expect(consoleError).toHaveBeenCalledWith('Failed to initialize Fog effect:', expect.any(Error));
        expect(broken.effect.enabled).toBe(false);
        expect(broken.effect.hasExplicitPreference).toBe(false);
        expect(() => {
            broken.effect.update(0.016);
            broken.effect.draw();
            broken.effect.toggle();
            broken.effect.setEnabled(true);
            broken.effect.cleanup();
        }).not.toThrow();
        expect(ok.effect).toBe(working);

        consoleError.mockRestore();
    });
});

describe('createNoopEffect', () => {
    it('returns a fresh object each call so stubs never share state', () => {
        expect(createNoopEffect()).not.toBe(createNoopEffect());
    });
});
