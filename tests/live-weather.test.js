import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mapWeatherToEffect, fetchLiveWeatherEffect, applyLiveWeatherDefault } from '../src/live-weather.js';
import { CONFIG } from '../src/config.js';

function fakeWeather(name, enabled = false, hasExplicitPreference = false) {
    const effect = {
        enabled,
        hasExplicitPreference,
        // Mirrors CanvasEffect.setEnabled(): changes .enabled only, never
        // touches hasExplicitPreference — see the comment on
        // applyLiveWeatherDefault for why that distinction matters.
        setEnabled: vi.fn(function (value) {
            this.enabled = value;
        })
    };
    return { effect, name };
}

describe('mapWeatherToEffect', () => {
    const cases = [
        [0, 'none'], [1, 'none'], [2, 'none'], [3, 'none'],
        [45, 'fog'], [48, 'fog'],
        [51, 'rain'], [53, 'rain'], [55, 'rain'],
        [56, 'sleet'], [57, 'sleet'],
        [61, 'rain'], [63, 'rain'], [65, 'rain'],
        [66, 'sleet'], [67, 'sleet'],
        [71, 'snow'], [73, 'snow'], [75, 'snow'], [77, 'snow'],
        [80, 'rain'], [81, 'rain'], [82, 'rain'],
        [85, 'snow'], [86, 'snow'],
        [95, 'thunderstorm'], [96, 'thunderstorm'], [99, 'thunderstorm']
    ];

    it.each(cases)('maps WMO code %i to %s (calm wind)', (code, expected) => {
        expect(mapWeatherToEffect(code, 0)).toBe(expected);
    });

    it('maps an unrecognized code to none', () => {
        expect(mapWeatherToEffect(9999, 0)).toBe('none');
    });

    it('promotes a clear/cloudy code to wind when wind speed meets the threshold', () => {
        expect(mapWeatherToEffect(1, CONFIG.liveWeather.windSpeedThresholdKmh)).toBe('wind');
        expect(mapWeatherToEffect(3, CONFIG.liveWeather.windSpeedThresholdKmh + 10)).toBe('wind');
    });

    it('does not promote to wind when speed is below the threshold', () => {
        expect(mapWeatherToEffect(1, CONFIG.liveWeather.windSpeedThresholdKmh - 1)).toBe('none');
    });

    it('lets precipitation win over high wind speed instead of promoting to wind', () => {
        expect(mapWeatherToEffect(65, CONFIG.liveWeather.windSpeedThresholdKmh + 20)).toBe('rain');
        expect(mapWeatherToEffect(75, CONFIG.liveWeather.windSpeedThresholdKmh + 20)).toBe('snow');
    });

    it('keeps fog and thunderstorm codes instead of promoting them to wind', () => {
        expect(mapWeatherToEffect(45, CONFIG.liveWeather.windSpeedThresholdKmh + 20)).toBe('fog');
        expect(mapWeatherToEffect(95, CONFIG.liveWeather.windSpeedThresholdKmh + 20)).toBe('thunderstorm');
    });
});

describe('fetchLiveWeatherEffect', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    function jsonResponse(body, ok = true, status = 200) {
        return { ok, status, json: async () => body };
    }

    it('resolves the mapped effect on a successful fetch and caches it', async () => {
        fetch.mockResolvedValue(jsonResponse({ current_weather: { weathercode: 61, windspeed: 5 } }));

        const effect = await fetchLiveWeatherEffect();

        expect(effect).toBe('rain');
        expect(fetch).toHaveBeenCalledTimes(1);
        const cached = JSON.parse(localStorage.getItem('liveWeatherCache'));
        expect(cached.effect).toBe('rain');
        expect(typeof cached.fetchedAt).toBe('number');
    });

    it('returns the cached effect without calling fetch when within the TTL', async () => {
        localStorage.setItem('liveWeatherCache', JSON.stringify({ effect: 'snow', fetchedAt: Date.now() }));

        const effect = await fetchLiveWeatherEffect();

        expect(effect).toBe('snow');
        expect(fetch).not.toHaveBeenCalled();
    });

    it('re-fetches when the cached entry has expired', async () => {
        const staleTime = Date.now() - CONFIG.liveWeather.cacheTtlMs - 1000;
        localStorage.setItem('liveWeatherCache', JSON.stringify({ effect: 'snow', fetchedAt: staleTime }));
        fetch.mockResolvedValue(jsonResponse({ current_weather: { weathercode: 0, windspeed: 0 } }));

        const effect = await fetchLiveWeatherEffect();

        expect(effect).toBe('none');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('returns null on a network rejection', async () => {
        fetch.mockRejectedValue(new Error('network down'));

        const effect = await fetchLiveWeatherEffect();

        expect(effect).toBeNull();
    });

    it('returns null on a non-OK HTTP status', async () => {
        fetch.mockResolvedValue(jsonResponse({}, false, 503));

        const effect = await fetchLiveWeatherEffect();

        expect(effect).toBeNull();
    });

    it('returns null on a malformed/missing-field response', async () => {
        fetch.mockResolvedValue(jsonResponse({ current_weather: {} }));

        const effect = await fetchLiveWeatherEffect();

        expect(effect).toBeNull();
    });

    it('returns null when the fetch times out', async () => {
        vi.useFakeTimers();
        fetch.mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }));

        const promise = fetchLiveWeatherEffect({ timeoutMs: 100 });
        await vi.advanceTimersByTimeAsync(100);

        expect(await promise).toBeNull();
    });
});

describe('applyLiveWeatherDefault', () => {
    it('does nothing when live data is unavailable (null)', () => {
        const snow = fakeWeather('snow', true, false);
        const weathers = [snow];

        applyLiveWeatherDefault(weathers, null);

        expect(snow.effect.setEnabled).not.toHaveBeenCalled();
    });

    it('enables the matching effect and disables other non-explicit enabled effects', () => {
        const snow = fakeWeather('snow', true, false); // on via fallback default
        const rain = fakeWeather('rain', false, false);
        const weathers = [snow, rain];

        applyLiveWeatherDefault(weathers, 'rain');

        expect(rain.effect.enabled).toBe(true);
        expect(snow.effect.enabled).toBe(false);
    });

    it('turns off a non-explicit fallback-enabled effect when live data says none', () => {
        const snow = fakeWeather('snow', true, false);
        const weathers = [snow];

        applyLiveWeatherDefault(weathers, 'none');

        expect(snow.effect.enabled).toBe(false);
    });

    it('does not force a match back on when the user explicitly turned it off', () => {
        const rain = fakeWeather('rain', false, true); // explicitly off
        const weathers = [rain];

        applyLiveWeatherDefault(weathers, 'rain');

        expect(rain.effect.setEnabled).not.toHaveBeenCalled();
        expect(rain.effect.enabled).toBe(false);
    });

    it('does not override an explicitly-enabled effect that differs from the live match', () => {
        const snow = fakeWeather('snow', true, true); // explicitly on
        const rain = fakeWeather('rain', false, false);
        const weathers = [snow, rain];

        applyLiveWeatherDefault(weathers, 'rain');

        expect(snow.effect.enabled).toBe(true);
        expect(rain.effect.enabled).toBe(false);
    });

    it('lets an explicit preference on one effect block reconciliation only for that conflict, not the whole group — regression for the group-wide-block bug found in review', () => {
        // snow was explicitly disabled by the user in the past (hasExplicitPreference=true, enabled=false).
        // Live weather says it's raining. Rain has no explicit preference at all.
        // Rain must still be allowed to turn on — snow's explicit-off state is irrelevant to it.
        const snow = fakeWeather('snow', false, true);
        const rain = fakeWeather('rain', false, false);
        const weathers = [snow, rain];

        applyLiveWeatherDefault(weathers, 'rain');

        expect(rain.effect.enabled).toBe(true);
        expect(snow.effect.enabled).toBe(false);
    });

    it('never marks hasExplicitPreference on effects it changes — regression for the toggle()-persistence bug found during implementation', () => {
        // If applyLiveWeatherDefault used effect.toggle()/weatherGroup.toggle() instead of
        // setEnabled(), every automated change would set hasExplicitPreference = true and
        // persist to localStorage, which CanvasEffect's constructor reads back as a genuine
        // user preference on the next page load — permanently freezing live-weather updates
        // after the very first one. setEnabled() must leave hasExplicitPreference untouched.
        const snow = fakeWeather('snow', true, false);
        const rain = fakeWeather('rain', false, false);
        const weathers = [snow, rain];

        applyLiveWeatherDefault(weathers, 'rain');

        expect(snow.effect.hasExplicitPreference).toBe(false);
        expect(rain.effect.hasExplicitPreference).toBe(false);
    });
});
