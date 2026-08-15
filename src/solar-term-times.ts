/**
 * When the solar terms happen.
 *
 * {@link ../solar-terms.js} says what the terms *are*; this says when. The two
 * are separate because the first is a fixed table and the second is astronomy,
 * and only the second needs the ephemeris.
 *
 * A term is an **instant**, and an instant is objective: it does not depend on
 * where you are standing. The *date* a term falls on very much does, because
 * that is a question about which local midnight the instant sits between, and
 * two places either side of a meridian can disagree by a day. So this module
 * returns instants only.
 */

import { sunLongitude, sunReachesLongitude } from "./ephemeris.js";
import type { SolarTerm } from "./solar-terms.js";
import { SOLAR_TERMS } from "./solar-terms.js";

/** The Sun's mean motion along the ecliptic, in degrees per day. */
const DEGREES_PER_DAY = 360 / 365.2422;

/**
 * How far before the estimated date the search starts, and how long it runs.
 *
 * The estimate assumes the Sun moves at its mean rate. It does not — the
 * Earth's orbit is eccentric, so the true position runs up to about two days
 * ahead of or behind the mean. Ten days of slack either side is ample for that
 * and leaves room for the estimate to degrade in the distant past, while
 * keeping the window far below the length that makes the underlying search
 * miss crossings entirely. See {@link sunReachesLongitude}.
 */
const SEARCH_BACKOFF_DAYS = 10;
const SEARCH_WINDOW_DAYS = 25;

const MS_PER_DAY = 86_400_000;

/**
 * The instant a solar term occurs in a given ISO year.
 *
 * `isoYear` is a proleptic Gregorian year — the same numbering Temporal's
 * `iso8601` calendar uses, negative for BCE, with no year zero skipped. It is
 * named for the system rather than called `year` because in this library that
 * would be a genuinely ambiguous word: a Chinese year, a sexagenary year and a
 * regnal year are all years, and Temporal offers no type that would tell them
 * apart. Its own `PlainDate.year` is 2026 for 2026-02-17 under *both* the ISO
 * and Chinese calendars, so the number carries no evidence of which it is.
 *
 * The Sun sits near 280° at the start of January, so every term's longitude is
 * reached exactly once between one 1 January and the next — including 冬至 at
 * 270°, which falls in the December at the far end of the same year rather than
 * the near one. Every term therefore lands inside the year asked for.
 *
 * @throws {RangeError} if `isoYear` is not a whole number, or if the search
 * finds nothing, which means the ephemeris has been pushed past where it is
 * defined.
 */
export function solarTermInstant(
  term: SolarTerm,
  isoYear: number,
): Temporal.Instant {
  if (!Number.isInteger(isoYear)) {
    throw new RangeError(
      `An ISO year must be a whole number; got ${String(isoYear)}.`,
    );
  }

  // Through Temporal rather than `Date.UTC`, which maps years 0 to 99 onto
  // 1900 to 1999 and would silently compute the wrong century for a hundred
  // years of the supported range.
  const yearStart = Temporal.PlainDate.from({
    year: isoYear,
    month: 1,
    day: 1,
  }).toZonedDateTime("UTC").epochMilliseconds;

  const startLongitude = sunLongitude(
    Temporal.Instant.fromEpochMilliseconds(yearStart),
  );
  const toTravel = (((term.longitude - startLongitude) % 360) + 360) % 360;
  // Rounded because `fromEpochMilliseconds` wants a whole number and the
  // estimate is fractional. Sub-millisecond precision is irrelevant to a
  // twenty-five day search window.
  const searchFrom = Temporal.Instant.fromEpochMilliseconds(
    Math.round(
      yearStart +
        (toTravel / DEGREES_PER_DAY - SEARCH_BACKOFF_DAYS) * MS_PER_DAY,
    ),
  );

  const found = sunReachesLongitude(
    term.longitude,
    searchFrom,
    SEARCH_WINDOW_DAYS,
  );

  if (found === undefined) {
    throw new RangeError(
      `No ${term.name} found in ${String(isoYear)}: the ephemeris does not reach that year.`,
    );
  }

  return found;
}

/** One solar term, and when it happened. */
export interface DatedSolarTerm {
  readonly term: SolarTerm;
  readonly instant: Temporal.Instant;
}

/**
 * Every solar term falling in a given ISO year, in chronological order.
 *
 * Always twenty-four of them: each solar longitude is reached exactly once a
 * year, so an ISO year contains a full set regardless of where the terms sit
 * within it.
 *
 * See {@link solarTermInstant} for why the parameter is `isoYear` rather than
 * `year`.
 */
export function solarTermsIn(isoYear: number): readonly DatedSolarTerm[] {
  return SOLAR_TERMS.map((term) => ({
    term,
    instant: solarTermInstant(term, isoYear),
  })).toSorted((a, b) => Temporal.Instant.compare(a.instant, b.instant));
}
