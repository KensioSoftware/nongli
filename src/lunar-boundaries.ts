/**
 * Locating the instants a lunisolar month runs between.
 *
 * A month boundary is a conjunction (朔), and the month begins on the local day
 * containing it. {@link ./lunar-months.js} assembles these into a numbered
 * calendar. This module only finds them.
 *
 * ## Spans are delimited by dates, and margins by instants
 *
 * The conjunction search converges to a tolerance and returns the same event a
 * few milliseconds apart depending on where it started (see
 * {@link ./new-moons.js}). Closing a span by comparing instants therefore
 * admits the closing conjunction as an extra month whenever it comes back a
 * millisecond early, and every month after the leap shifts by one. Measured over
 * 1900-2100 that cost eleven whole years.
 *
 * So every comparison here is between dates. A month begins on a *day*, and a
 * millisecond has never decided one. Instants are kept for the margins in
 * {@link ./claim.js}, where the whole point is sub-minute distances.
 */

import { sunLongitude } from "./ephemeris.js";
import { newMoonFrom } from "./new-moons.js";
import type { Place } from "./place.js";
import { localDateAt, startOfDayAt } from "./place.js";
import { solarTermInstant } from "./solar-term-times.js";
import type { SolarTerm } from "./solar-terms.js";
import { solarTermNamed } from "./solar-terms.js";

/** Degrees of solar longitude between one 中气 and the next. */
const DEGREES_PER_MAJOR_TERM = 30;

/**
 * How far to step past a conjunction before searching for the next.
 *
 * Shorter than the shortest synodic month (about 29.3 days), so the next search
 * cannot skip a moon, and long enough that it cannot rediscover the one just
 * found.
 */
const STEP_PAST_HOURS = 25 * 24;

/** Long enough to contain a synodic month from any starting point. */
const LOOK_BACK_HOURS = 31 * 24;

/**
 * Look a term up by name, failing loudly if the table has lost it.
 *
 * The table is fixed at compile time, so this can only fire if someone edits
 * {@link ./solar-terms.js}. Resolving it once at load keeps an `undefined`
 * check off every path below.
 */
function requireTerm(name: string): SolarTerm {
  const term = solarTermNamed(name);
  if (term === undefined) {
    throw new Error(`The solar term table is missing ${name}.`);
  }
  return term;
}

/** 冬至, the term month 11 is defined by. */
const WINTER_SOLSTICE = requireTerm("冬至");

/** A month boundary: a conjunction, the day it falls on, and the Sun's sector. */
export interface Boundary {
  readonly instant: Temporal.Instant;
  readonly date: Temporal.PlainDate;
  /**
   * The 30° sector of solar longitude the day begins in.
   *
   * A month contains no 中气 exactly when its own sector and the next
   * boundary's are equal, because the Sun never crossed a multiple of 30 in
   * between. That is one position lookup per month against a search per term,
   * and searches are what cost.
   */
  readonly sector: number;
}

/** The 冬至 of an ISO year, and the conjunction opening the month 11 it falls in. */
export interface SolsticeMonth {
  readonly solstice: Temporal.Instant;
  readonly opening: Temporal.Instant;
}

/**
 * The conjunction beginning the month that contains a given local day.
 *
 * Walks forward from a month before the day and stops at the last conjunction
 * whose own day has not passed it.
 */
export function conjunctionOpeningMonthOn(
  date: Temporal.PlainDate,
  place: Place,
): Temporal.Instant {
  const from = startOfDayAt(date, place).subtract({ hours: LOOK_BACK_HOURS });
  let moon = newMoonFrom(from);

  for (;;) {
    const next = newMoonFrom(moon.add({ hours: STEP_PAST_HOURS }));
    if (Temporal.PlainDate.compare(localDateAt(next, place), date) > 0) {
      return moon;
    }
    moon = next;
  }
}

/** The 冬至 of an ISO year, and the month 11 containing it. */
export function solsticeMonth(isoYear: number, place: Place): SolsticeMonth {
  const solstice = solarTermInstant(WINTER_SOLSTICE, isoYear);
  return {
    solstice,
    opening: conjunctionOpeningMonthOn(localDateAt(solstice, place), place),
  };
}

/**
 * Every month boundary from one solstice month up to and including the next.
 *
 * Thirteen or fourteen entries, giving twelve or thirteen months once each is
 * paired with its successor.
 */
export function boundariesBetween(
  opening: SolsticeMonth,
  closing: SolsticeMonth,
  place: Place,
): readonly Boundary[] {
  const closesOn = localDateAt(closing.opening, place);
  const instants: Temporal.Instant[] = [];
  let moon = opening.opening;

  while (Temporal.PlainDate.compare(localDateAt(moon, place), closesOn) < 0) {
    instants.push(moon);
    moon = newMoonFrom(moon.add({ hours: STEP_PAST_HOURS }));
  }
  instants.push(closing.opening);

  return instants.map((instant) => {
    const date = localDateAt(instant, place);
    return {
      instant,
      date,
      sector: Math.floor(
        sunLongitude(startOfDayAt(date, place)) / DEGREES_PER_MAJOR_TERM,
      ),
    };
  });
}

/**
 * Consecutive overlapping pairs, so `[a, b, c]` yields `[a, b]` then `[b, c]`.
 *
 * A month is a pair of boundaries, and walking pairs this way keeps the caller
 * free of indexed access. The lint bans both `!` and `as T`, and an index into
 * an array cannot be proved in bounds, so the alternative is a scattering of
 * `undefined` checks for cases that cannot arise.
 */
export function* consecutive<T>(
  items: readonly T[],
): Generator<readonly [T, T]> {
  let previous: T | undefined;
  let first = true;

  for (const item of items) {
    if (!first && previous !== undefined) {
      yield [previous, item];
    }
    previous = item;
    first = false;
  }
}
