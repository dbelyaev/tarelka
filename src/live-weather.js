/**
 * Live weather auto-selection for Stavanger, Norway
 *
 * Fetches current conditions from Open-Meteo (no API key, CORS-friendly) and
 * maps the WMO weather code + wind speed to one of the app's weather effects.
 * Results are cached in localStorage for CONFIG.liveWeather.cacheTtlMs so a
 * page reload doesn't re-hit the API. Any failure (network, timeout, bad
 * response) resolves to null — distinct from a confirmed 'none' (clear/calm)
 * — so callers can tell "we checked and it's clear" from "we don't know".
 */
import { CONFIG } from './config.js';

const CACHE_KEY = 'liveWeatherCache';
const VALID_EFFECTS = new Set(['none', 'rain', 'snow', 'sleet', 'wind']);

/**
 * Map a WMO weather code + wind speed (km/h) to an effect name.
 * Precipitation codes always win over the wind-speed promotion below.
 * @param {number} weatherCode
 * @param {number} windSpeedKmh
 * @returns {'none'|'rain'|'snow'|'sleet'|'wind'}
 */
export function mapWeatherToEffect(weatherCode, windSpeedKmh) {
    let candidate;
    switch (weatherCode) {
        case 51: case 53: case 55: // drizzle
        case 61: case 63: case 65: // rain
        case 80: case 81: case 82: // rain showers
        case 95: case 96: case 99: // thunderstorm (approximated to rain — no dedicated effect yet)
            candidate = 'rain';
            break;
        case 56: case 57: // freezing drizzle
        case 66: case 67: // freezing rain
            candidate = 'sleet';
            break;
        case 71: case 73: case 75: case 77: // snow fall / snow grains
        case 85: case 86: // snow showers
            candidate = 'snow';
            break;
        default: // clear, cloudy, fog, or unrecognized — fog has no dedicated effect yet
            candidate = 'none';
    }

    if (candidate === 'none' && windSpeedKmh >= CONFIG.liveWeather.windSpeedThresholdKmh) {
        candidate = 'wind';
    }

    return candidate;
}

function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { effect, fetchedAt } = JSON.parse(raw);
        if (!VALID_EFFECTS.has(effect) || typeof fetchedAt !== 'number') return null;
        if (Date.now() - fetchedAt >= CONFIG.liveWeather.cacheTtlMs) return null;
        return effect;
    } catch {
        return null;
    }
}

function writeCache(effect) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ effect, fetchedAt: Date.now() }));
    } catch {
        // localStorage unavailable/full — cache is a pure optimization, safe to skip
    }
}

/**
 * Fetch current Stavanger weather and resolve it to an effect name.
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<'none'|'rain'|'snow'|'sleet'|'wind'|null>} null on any failure/timeout
 */
export async function fetchLiveWeatherEffect({ timeoutMs = CONFIG.liveWeather.fetchTimeoutMs } = {}) {
    const cached = readCache();
    if (cached !== null) {
        console.log('[weather] Using cached weather effect:', cached);
        return cached;
    }

    console.log('[weather] Fetching live weather for Stavanger...');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${CONFIG.liveWeather.latitude}&longitude=${CONFIG.liveWeather.longitude}&current_weather=true`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
            throw new Error(`Open-Meteo responded with ${response.status}`);
        }

        const data = await response.json();
        const { weathercode, windspeed } = data.current_weather ?? {};
        if (typeof weathercode !== 'number' || typeof windspeed !== 'number') {
            throw new TypeError('Open-Meteo response missing current_weather fields');
        }

        const effect = mapWeatherToEffect(weathercode, windspeed);
        console.log('[weather] Live weather resolved to:', effect, '(code', weathercode, ', wind', windspeed, 'km/h)');
        writeCache(effect);
        return effect;
    } catch (error) {
        console.warn('[weather] Unable to fetch live weather, keeping default:', error);
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Apply the live weather result to a set of weather effects, without ever
 * overriding a user's own explicit preference.
 *
 * Deliberately bypasses weatherGroup.toggle()/effect.toggle() and uses
 * effect.setEnabled() instead: toggle() unconditionally marks
 * hasExplicitPreference = true and persists to localStorage, which would
 * make an automated live-weather change look like a real user choice on the
 * very next page load (via CanvasEffect's `hasExplicitPreference = stored
 * !== null` construction check) — permanently blocking any future
 * reconciliation the first time this function enables or disables anything.
 * setEnabled() changes .enabled in memory only, so a live-weather decision
 * stays re-adjustable on every load; the 15-minute fetch cache is the only
 * continuity mechanism for it, by design.
 *
 * Precedence, per effect (not group-wide — see README for the reasoning):
 *  - liveEffectName === null (fetch failed/timed out) -> no-op.
 *  - An effect other than the live match is enabled AND explicitly chosen by
 *    the user -> no-op (an explicit "on" always wins over a live suggestion).
 *  - The live match itself is explicitly disabled by the user -> no-op (an
 *    explicit "off" is never forced back on).
 *  - Otherwise, enable the match (if any) and disable every other enabled
 *    effect that does NOT have an explicit preference.
 *
 * @param {{effect: object, name: string}[]} weathers
 * @param {'none'|'rain'|'snow'|'sleet'|'wind'|null} liveEffectName
 */
export function applyLiveWeatherDefault(weathers, liveEffectName) {
    if (liveEffectName === null) {
        console.log('[weather] No live data available, leaving current defaults');
        return;
    }

    const match = weathers.find(w => w.name === liveEffectName);

    const hasConflictingExplicitlyOn = weathers.some(
        w => w !== match && w.effect.enabled && w.effect.hasExplicitPreference
    );
    if (hasConflictingExplicitlyOn) {
        console.log('[weather] Skipping — an explicitly-enabled effect takes precedence');
        return;
    }

    if (match?.effect.hasExplicitPreference && !match.effect.enabled) {
        console.log('[weather] Skipping — the matching effect was explicitly turned off');
        return;
    }

    console.log('[weather] Applying live weather effect:', liveEffectName);
    if (match) {
        match.effect.setEnabled(true);
    }
    weathers.forEach(w => {
        if (w !== match && w.effect.enabled && !w.effect.hasExplicitPreference) {
            w.effect.setEnabled(false);
        }
    });
}
