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
 * How much slack a boundary comparison gets, in seconds.
 *
 * A conjunction does not have an exactly reproducible instant, and this is the
 * single most surprising thing about this module.
 *
 * The underlying search converges on the crossing numerically, and **lands on
 * slightly different answers depending on where it was told to start**. For the
 * conjunction of 2026-02-17 it returns `12:01:47.328Z` from most starting
 * points and `12:01:47.333Z` from one an hour earlier — five milliseconds
 * apart, for the same event. Nothing is wrong: the crossing is being located to
 * a tolerance, not computed in closed form.
 *
 * The consequence is that comparing these instants at millisecond precision is
 * not meaningful, so both ends of a span are decided to within a second — far
 * wider than the wobble, and far narrower than anything else that could sit at
 * a month boundary. Without this, `newMoonsBetween` dropped a conjunction
 * whenever its start was one: measured across 240 moons from 1000 to 2026, it
 * skipped 133 of them.
 *
 * Sub-second precision is not something this library needs. A margin worth
 * reporting is measured in minutes, and a date turns on which side of midnight
 * an instant falls — so a second of slack is six orders of magnitude below
 * anything that changes an answer.
 */
const BOUNDARY_TOLERANCE_SECONDS = 1;

const MS_PER_SECOND = 1000;

/**
 * The first new moon at or after an instant, to within a second.
 *
 * The tolerance is not a hedge: see {@link BOUNDARY_TOLERANCE_SECONDS}. The
 * returned instant may precede the one asked for by up to a second, which makes
 * this idempotent on its own output — feed it a conjunction it gave you and you
 * get that conjunction back rather than the next one.
 *
 * @throws {RangeError} if the ephemeris does not reach that far. The Moon
 * search reaches further back than the Sun's — it still answers at -50,000,
 * where the solar term search has already given up — so in practice this only
 * fires in the far future.
 */
export function newMoonFrom(instant: Temporal.Instant): Temporal.Instant {
  const from = instant.subtract({ seconds: BOUNDARY_TOLERANCE_SECONDS });
  const found = nextNewMoon(from, SEARCH_WINDOW_DAYS);
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
 * Half open, so a new moon at `from` is included and one at `to` is not — both
 * decided to within a second, for the reason in
 * {@link BOUNDARY_TOLERANCE_SECONDS}. That is the convention that makes
 * consecutive spans tile without a moon falling into both or neither, which
 * matters here more than usual: these become month boundaries, and a duplicated
 * or dropped one shifts every month after it.
 *
 * Returns nothing when `to` is at or before `from`, rather than treating a
 * reversed span as an error: an empty range has an obvious empty answer.
 */
export function newMoonsBetween(
  from: Temporal.Instant,
  to: Temporal.Instant,
): readonly Temporal.Instant[] {
  const moons: Temporal.Instant[] = [];
  // Both ends shifted by the same tolerance, so the span still tiles exactly:
  // whatever one range excludes at its end, the next includes at its start.
  const endsBefore =
    to.epochMilliseconds - BOUNDARY_TOLERANCE_SECONDS * MS_PER_SECOND;
  let cursor = from;

  while (Temporal.Instant.compare(cursor, to) < 0) {
    const moon = newMoonFrom(cursor);
    if (moon.epochMilliseconds >= endsBefore) {
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
