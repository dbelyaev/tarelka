/**
 * Coordinates a set of mutually-exclusive weather effects (snow, rain, ...).
 * Each entry is { effect, label } where `effect` exposes `.enabled`, `.toggle()`,
 * and `.hasExplicitPreference` (true if `.enabled` reflects a stored user choice
 * rather than a fallback default, e.g. snow's seasonal default).
 */
export function createWeatherGroup(weathers) {
    // Enforce the invariant at construction time too, in case stale localStorage
    // (or a fallback default like snow's seasonal rule) leaves more than one effect
    // enabled. Prefer an effect the user explicitly chose over one that's merely on
    // by default, so a real persisted preference is never silently overwritten by
    // an arbitrary tie-break (e.g. rain explicitly enabled by the user, but snow also
    // on by seasonal default — snow must lose that tie, not win it by array order).
    const alreadyEnabled = weathers.filter(w => w.effect.enabled);
    if (alreadyEnabled.length > 1) {
        const explicit = alreadyEnabled.filter(w => w.effect.hasExplicitPreference);
        const winner = explicit[0] ?? alreadyEnabled[0];
        alreadyEnabled.filter(w => w !== winner).forEach(w => w.effect.toggle());
    }

    return {
        toggle(target) {
            weathers.forEach(w => {
                if (w !== target && w.effect.enabled) w.effect.toggle();
            });
            target.effect.toggle();
        }
    };
}
