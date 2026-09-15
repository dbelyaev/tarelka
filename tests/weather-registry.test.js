import { describe, it, expect } from 'vitest';
import { WEATHER_DEFINITIONS } from '../src/weather-registry.js';
import { VALID_EFFECTS } from '../src/live-weather.js';

/** Keys main.js already handles outside the weather registry */
const RESERVED_KEYS = ['p', 'd'];

describe('WEATHER_DEFINITIONS', () => {
    it('uses unique names', () => {
        const names = WEATHER_DEFINITIONS.map(d => d.name);
        expect(new Set(names).size).toBe(names.length);
    });

    it('uses unique, single lowercase-character keys that do not collide with reserved shortcuts', () => {
        const keys = WEATHER_DEFINITIONS.map(d => d.key);
        expect(new Set(keys).size).toBe(keys.length);
        for (const key of keys) {
            expect(key).toMatch(/^[a-z]$/);
            expect(RESERVED_KEYS).not.toContain(key);
        }
    });

    it('matches the effect names live weather can resolve to, so auto-selection never silently misses', () => {
        const registryNames = new Set(WEATHER_DEFINITIONS.map(d => d.name));
        const liveNames = new Set([...VALID_EFFECTS].filter(name => name !== 'none'));
        expect(registryNames).toEqual(liveNames);
    });

    it('gives every definition a label and a create factory', () => {
        for (const definition of WEATHER_DEFINITIONS) {
            expect(definition.label).toEqual(expect.any(String));
            expect(definition.create).toEqual(expect.any(Function));
        }
    });
});
