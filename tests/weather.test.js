import { describe, it, expect, vi } from 'vitest';
import { createWeatherGroup } from '../src/weather.js';

function fakeWeather(label, enabled = false) {
    const effect = {
        enabled,
        toggle: vi.fn(function () {
            this.enabled = !this.enabled;
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

    it('toggles normally in a single-effect group', () => {
        const snow = fakeWeather('Snow', false);
        const group = createWeatherGroup([snow]);

        group.toggle(snow);
        expect(snow.effect.enabled).toBe(true);

        group.toggle(snow);
        expect(snow.effect.enabled).toBe(false);
    });
});
