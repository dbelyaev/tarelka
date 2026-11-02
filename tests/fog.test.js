import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FogEffect } from '../src/fog.js';
import { CONFIG } from '../src/config.js';

describe('FogEffect', () => {
    beforeEach(() => {
        document.body.innerHTML = '<main></main>';
        localStorage.clear();
    });

    afterEach(() => {
        CONFIG.ps1Style = false;
    });

    it('appends a hidden, aria-hidden fog layer to <main>', () => {
        const effect = new FogEffect();

        expect(document.querySelector('main').contains(effect.element)).toBe(true);
        expect(effect.element.classList.contains('weather-layer')).toBe(true);
        expect(effect.element.classList.contains('fog-layer')).toBe(true);
        expect(effect.element.getAttribute('aria-hidden')).toBe('true');
        expect(effect.element.classList.contains('fog-layer--visible')).toBe(false);

        effect.cleanup();
    });

    it('defaults to disabled when no preference is persisted', () => {
        const effect = new FogEffect();
        expect(effect.enabled).toBe(false);
        expect(effect.hasExplicitPreference).toBe(false);
        effect.cleanup();
    });

    it('starts visible when fogEnabled=true is persisted', () => {
        localStorage.setItem('fogEnabled', 'true');
        const effect = new FogEffect();

        expect(effect.enabled).toBe(true);
        expect(effect.hasExplicitPreference).toBe(true);
        expect(effect.element.classList.contains('fog-layer--visible')).toBe(true);

        effect.cleanup();
    });

    it('toggle() shows and hides the layer and persists the choice', () => {
        const effect = new FogEffect();

        effect.toggle();
        expect(effect.element.classList.contains('fog-layer--visible')).toBe(true);
        expect(localStorage.getItem('fogEnabled')).toBe('true');

        effect.toggle();
        expect(effect.element.classList.contains('fog-layer--visible')).toBe(false);
        expect(localStorage.getItem('fogEnabled')).toBe('false');

        effect.cleanup();
    });

    it('setEnabled() updates visibility without persisting', () => {
        const effect = new FogEffect();

        effect.setEnabled(true);

        expect(effect.element.classList.contains('fog-layer--visible')).toBe(true);
        expect(localStorage.getItem('fogEnabled')).toBeNull();
        expect(effect.hasExplicitPreference).toBe(false);

        effect.cleanup();
    });

    it('adds the PS1 modifier class in PS1 mode', () => {
        CONFIG.ps1Style = true;
        const effect = new FogEffect();
        expect(effect.element.classList.contains('weather-layer--ps1')).toBe(true);
        effect.cleanup();
    });

    it('cleanup() removes the layer from the DOM', () => {
        const effect = new FogEffect();
        effect.cleanup();
        expect(document.querySelector('.fog-layer')).toBeNull();
    });
});
