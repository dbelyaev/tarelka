import { describe, it, expect, beforeEach, vi } from 'vitest';

async function loadConfig() {
    vi.resetModules();
    const { CONFIG } = await import('../src/config.js');
    return CONFIG;
}

describe('CONFIG', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('reflects the persisted ps1Style preference on load', async () => {
        localStorage.setItem('ps1Style', 'true');
        const CONFIG = await loadConfig();
        expect(CONFIG.ps1Style).toBe(true);
    });

    it('defaults ps1Style to false when nothing is persisted', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.ps1Style).toBe(false);
    });

    it('defines exactly seven RGB background colors with channels in [0, 1]', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.background.colors).toHaveLength(7);
        for (const color of CONFIG.background.colors) {
            expect(color).toHaveLength(3);
            for (const channel of color) {
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(1);
            }
        }
    });

    it('lists December and January as the default winter months', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.snow.winterMonths).toEqual([12, 1]);
    });

    it('defines the rain skew angle range', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.rain.angle).toEqual({ min: 30, max: 45 });
    });

    it('defines the per-drop rain angle jitter', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.rain.angleJitter).toBe(6);
    });

    it('defines the mobile particle density scale', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.performance.mobileParticleScale).toBe(0.6);
    });

    it('defines the wind streak angle range', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.wind.angle).toEqual({ min: 0, max: 10 });
    });

    it('defines the sleet skew angle range', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.sleet.angle).toEqual({ min: 8, max: 18 });
    });

    it('defines the sleet drift range', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.sleet.drift).toEqual({ min: -0.3, max: 0.3 });
    });

    it('defines Stavanger coordinates for live weather', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.liveWeather.latitude).toBe(58.97);
        expect(CONFIG.liveWeather.longitude).toBe(5.73);
    });

    it('defines the live weather cache TTL and fetch timeout', async () => {
        const CONFIG = await loadConfig();
        expect(CONFIG.liveWeather.cacheTtlMs).toBe(15 * 60 * 1000);
        expect(CONFIG.liveWeather.fetchTimeoutMs).toBe(3000);
    });
});
