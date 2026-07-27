/**
 * Prototype toggles — switches for mechanics on trial, reachable from the
 * console (`dyestopia.combo(true)`) or the URL (`?combo`, for phones without
 * a console). Deliberately not persisted: a spike should not outlive its
 * playtest by accident.
 */
export const flags = {
  /**
   * The M3 combo spike: a merge's colour absorbs adjacent groups of its own
   * ingredients, and the wave can make the merge legal by itself. Playtest,
   * then decide in or out.
   */
  combo: new URLSearchParams(window.location.search).has('combo'),
}
