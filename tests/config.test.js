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
});
