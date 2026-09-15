/**
 * No-op stand-in with the full WeatherEffect shape, used when an effect fails
 * to construct so the rest of the app can keep calling it unconditionally.
 */
export function createNoopEffect() {
    return {
        update: () => {},
        draw: () => {},
        toggle: () => {},
        setEnabled: () => {},
        cleanup: () => {},
        enabled: false,
        hasExplicitPreference: false
    };
}

/**
 * Construct each weather definition's effect. A definition whose create()
 * throws is logged and replaced with a no-op effect instead of aborting startup.
 * @param {{name: string, label: string, key: string, create: () => object}[]} definitions
 * @returns {{effect: object, name: string, label: string, key: string}[]}
 */
export function instantiateWeathers(definitions) {
    return definitions.map(({ name, label, key, create }) => {
        let effect;
        try {
            effect = create();
        } catch (error) {
            console.error(`Failed to initialize ${label} effect:`, error);
            effect = createNoopEffect();
        }
        return { effect, name, label, key };
    });
}

/**
 * Coordinates a set of mutually-exclusive weather effects (snow, rain, ...).
 * Each entry is { effect, label } where `effect` exposes `.enabled`, `.toggle()`,
 * `.setEnabled(boolean)`, and `.hasExplicitPreference` (true if `.enabled` reflects
 * a stored user choice rather than a fallback default, e.g. snow's seasonal default).
 */
export function createWeatherGroup(weathers) {
    // Enforce the invariant at construction time too, in case stale localStorage
    // (or a fallback default like snow's seasonal rule) leaves more than one effect
    // enabled. Prefer an effect the user explicitly chose over one that's merely on
    // by default, so a real persisted preference is never silently overwritten by
    // an arbitrary tie-break (e.g. rain explicitly enabled by the user, but snow also
    // on by seasonal default — snow must lose that tie, not win it by array order).
    //
    // The loser is disabled via setEnabled(), not toggle(): this reconciliation is
    // automatic startup cleanup, not a real user action, so it must not persist to
    // localStorage or mark hasExplicitPreference — doing so would permanently and
    // falsely record e.g. "user explicitly turned snow off" just because snow's
    // seasonal default happened to conflict with another effect at load time.
    const alreadyEnabled = weathers.filter(w => w.effect.enabled);
    if (alreadyEnabled.length > 1) {
        const winner = alreadyEnabled.find(w => w.effect.hasExplicitPreference) ?? alreadyEnabled[0];
        alreadyEnabled.filter(w => w !== winner).forEach(w => w.effect.setEnabled(false));
    }

    return {
        toggle(target) {
            // Toggle the target first and only disable its peers on a confirmed
            // false-to-true transition. A failed effect construction falls back to a
            // no-op stub (see createNoopEffect) whose toggle() never flips .enabled — disabling
            // peers unconditionally would turn off a working effect while the broken
            // one silently stays off.
            const wasEnabled = target.effect.enabled;
            target.effect.toggle();
            if (!wasEnabled && target.effect.enabled) {
                weathers.forEach(w => {
                    if (w !== target && w.effect.enabled) w.effect.toggle();
                });
            }
        }
    };
}
