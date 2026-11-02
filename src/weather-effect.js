/**
 * Shared toggle lifecycle for every weather effect, canvas-based or not.
 * Owns the persisted enabled state and the `.enabled` / `.toggle()` /
 * `.setEnabled()` / `.hasExplicitPreference` contract that createWeatherGroup
 * and applyLiveWeatherDefault rely on. Subclasses react to state changes via
 * _onEnabledChange(enabled) and override update()/draw()/cleanup() as needed.
 */
export class WeatherEffect {
    constructor({ storageKey, resolveDefaultEnabled }) {
        this._storageKey = storageKey;
        const stored = localStorage.getItem(storageKey);
        this.hasExplicitPreference = stored !== null;
        this.enabled = stored === null ? resolveDefaultEnabled() : stored === 'true';
        // _onEnabledChange is deliberately not called here: subclass fields and
        // DOM don't exist yet, so each subclass applies its initial state itself.
    }

    toggle() {
        this.enabled = !this.enabled;
        this.hasExplicitPreference = true;
        localStorage.setItem(this._storageKey, String(this.enabled));
        this._onEnabledChange(this.enabled);
    }

    /**
     * Set enabled state programmatically (e.g. live-weather auto-selection)
     * WITHOUT recording it as a user preference: unlike toggle(), this does
     * not touch hasExplicitPreference or localStorage. An automated decision
     * must stay re-adjustable on every future call — persisting it would make
     * the constructor's `hasExplicitPreference = stored !== null` check treat
     * it as a real user choice on the next page load, permanently blocking
     * further automated changes.
     */
    setEnabled(enabled) {
        if (this.enabled === enabled) return;
        this.enabled = enabled;
        this._onEnabledChange(this.enabled);
    }

    _onEnabledChange(_enabled) {}

    update(_delta) {}

    draw() {}

    cleanup() {}
}
