/**
 * Helpers for building and walking instants in tests.
 *
 * These live here rather than in a test file for two reasons. The lint wants a
 * function that captures nothing from its enclosing scope to sit at module
 * scope, and the testing style wants nothing at the top level of a test file
 * but imports. A separate module satisfies both. `test/` is also excluded from
 * the build, so none of this ships.
 */

import { newMoonFrom } from "../src/new-moons.js";

/** The meridian the modern 农历 is computed against, as a fixed offset. */
export const CHINA = "+08:00";

export const MS_PER_DAY = 86_400_000;

/** An instant from an ISO string, shortened because tests are full of them. */
export const at = (iso: string): Temporal.Instant => Temporal.Instant.from(iso);

/** Midsummer of a given ISO year, for tests about how far the ephemeris reaches. */
export const midsummerOf = (isoYear: number): Temporal.Instant =>
  Temporal.PlainDate.from({ year: isoYear, month: 6, day: 1 })
    .toZonedDateTime("UTC")
    .toInstant();

/**
 * Walks consecutive new moons from a starting point.
 *
 * Used by the properties that have to hold at every moon, not only at one. A
 * conjunction lands either side of its own instant at roughly even odds, so a
 * property checked at a single moon is checked by a coin toss.
 */
export function* moonsFrom(
  startIso: string,
  count: number,
): Generator<Temporal.Instant> {
  let cursor = at(startIso);
  for (let index = 0; index < count; index++) {
    const moon = newMoonFrom(cursor);
    yield moon;
    cursor = moon.add({ hours: 600 });
  }
}
