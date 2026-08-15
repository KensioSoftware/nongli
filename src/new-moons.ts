/**
 * New moons (朔), which are where lunar months begin.
 *
 * The rule the calendar is built on is short: a lunar month begins on the day
 * containing the new moon. Everything hard about that is in the word *day* —
 * the new moon is an instant, and which day contains it depends on the meridian
 * whose midnight you measure against. So this module, like
 * {@link ./solar-term-times.js}, returns instants and leaves the day to
 * whatever knows about places.
 *
 * A new moon here is the astronomical conjunction: the moment the Moon and Sun
 * share an apparent ecliptic longitude. Not first visibility of the crescent,
 * which is a different event, days later, and depends on the observer — some
 * other lunar calendars are built on that instead, and conflating the two is a
 * common way to be a day or two wrong.
 */

import { nextNewMoon } from "./ephemeris.js";

/**
 * How far to search for the next new moon.
 *
 * A synodic month runs between about 29.3 and 29.8 days — the spread comes from
 * the eccentricity of both the lunar and terrestrial orbits — so 45 days
 * comfortably contains one wherever the search starts. Unlike the solar search,
 * a longer window here costs nothing but time: {@link nextNewMoon} returns the
 * same answer for any window from 30 to 1000 days.
 */
const SEARCH_WINDOW_DAYS = 45;

/** Roughly a synodic month, used to step past a moon already found. */
const STEP_PAST_HOURS = 25 * 24;

/**
 * The first new moon at or after an instant.
 *
 * @throws {RangeError} if the ephemeris does not reach that far. The Moon
 * search reaches further back than the Sun's — it still answers at -50,000,
 * where the solar term search has already given up — so in practice this only
 * fires in the far future.
 */
export function newMoonFrom(instant: Temporal.Instant): Temporal.Instant {
  const found = nextNewMoon(instant, SEARCH_WINDOW_DAYS);
  if (found === undefined) {
    throw new RangeError(
      `No new moon found within ${String(SEARCH_WINDOW_DAYS)} days of ${instant.toString()}: the ephemeris does not reach that far.`,
    );
  }
  return found;
}

/**
 * Every new moon in `[from, to)`, in chronological order.
 *
 * Half open, so a new moon exactly at `from` is included and one exactly at
 * `to` is not. That is the convention that makes consecutive spans tile without
 * a moon falling into both or neither — which matters here more than usual,
 * since these become month boundaries and a duplicated or dropped one shifts
 * every month after it.
 *
 * Returns nothing when `to` is at or before `from`, rather than treating a
 * reversed span as an error: an empty range has an obvious empty answer.
 */
export function newMoonsBetween(
  from: Temporal.Instant,
  to: Temporal.Instant,
): readonly Temporal.Instant[] {
  const moons: Temporal.Instant[] = [];
  let cursor = from;

  while (Temporal.Instant.compare(cursor, to) < 0) {
    const moon = newMoonFrom(cursor);
    if (Temporal.Instant.compare(moon, to) >= 0) {
      break;
    }
    moons.push(moon);
    // Step past the one just found, by less than the shortest synodic month so
    // the next search cannot skip a moon, and by enough that it cannot find the
    // same one again.
    cursor = moon.add({ hours: STEP_PAST_HOURS });
  }

  return moons;
}
