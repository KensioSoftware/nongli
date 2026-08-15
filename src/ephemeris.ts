/**
 * The seam over the ephemeris.
 *
 * Everything in nongli that needs to know where the Sun or the Moon actually
 * was goes through this module, and nothing else imports `astronomy-engine`
 * directly. That is deliberate: the ephemeris is a pinned, named dependency
 * rather than an implementation detail, and confining it to one file means the
 * choice can be revisited, its quirks documented once, and its time scale
 * controlled in a single place.
 *
 * ## Two things this module will grow
 *
 * **New moon instants**, which decide where lunar months begin, and are the
 * other half of what the calendar is built from.
 *
 * **Its own ΔT.** `astronomy-engine` defaults to the Espenak & Meeus
 * polynomials and exposes `SetDeltaTFunction` to replace them. nongli intends
 * to supply Stephenson, Morrison & Hohenkerk (2016) instead, because ΔT is what
 * converts an instant into a civil date and is therefore the single term that
 * every cross-check between ephemerides is blind to. That substitution belongs
 * here.
 */

import * as astronomy from "astronomy-engine";

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
 * keeping the window far below the length that trips the bug described below.
 */
const SEARCH_BACKOFF_DAYS = 10;
const SEARCH_WINDOW_DAYS = 25;

const MS_PER_DAY = 86_400_000;

/**
 * The instant a solar term occurs in a given Gregorian year.
 *
 * The Sun sits near 280° at the start of January, so every term's longitude is
 * reached exactly once between one 1 January and the next — including 冬至 at
 * 270°, which falls in the December at the far end of the same year rather than
 * the near one. Every term therefore lands inside the year asked for.
 *
 * ## Why this estimates a date rather than searching the whole year
 *
 * The obvious implementation hands `SearchSunLongitude` a 400-day window from 1
 * January and takes what it finds. That does not work: with a window that long
 * the search misses the crossing for some longitudes and reports nothing at
 * all. Measured on astronomy-engine 2.1.19, searching from 2026-01-01 finds
 * twenty-two of the twenty-four terms and returns `null` for 小暑 (105°) and
 * 立秋 (135°) — in every year tried, from -500 to 2026. The same search over
 * 380 days finds both.
 *
 * So the window is kept short and placed where the answer already is: estimate
 * the date from the Sun's mean motion, then search a few weeks around it. That
 * is faster as well as correct, since the search has far less ground to cover.
 *
 * @throws {RangeError} if `year` is not a whole number, or if the search finds
 * nothing — which now means the ephemeris has genuinely been pushed past where
 * it is defined, rather than the window being too wide.
 */
export function solarTermInstant(
  term: SolarTerm,
  year: number,
): Temporal.Instant {
  if (!Number.isInteger(year)) {
    throw new RangeError(`A year must be a whole number; got ${String(year)}.`);
  }

  // Through Temporal rather than `Date.UTC`, which maps years 0 to 99 onto
  // 1900 to 1999 and would silently compute the wrong century for a hundred
  // years of the supported range.
  const yearStart = Temporal.PlainDate.from({
    year,
    month: 1,
    day: 1,
  }).toZonedDateTime("UTC").epochMilliseconds;
  const startLongitude = astronomy.SunPosition(new Date(yearStart)).elon;
  const toTravel = (((term.longitude - startLongitude) % 360) + 360) % 360;
  const searchFrom = new Date(
    yearStart + (toTravel / DEGREES_PER_DAY - SEARCH_BACKOFF_DAYS) * MS_PER_DAY,
  );

  const found = astronomy.SearchSunLongitude(
    term.longitude,
    searchFrom,
    SEARCH_WINDOW_DAYS,
  );

  if (found === null) {
    throw new RangeError(
      `No ${term.name} found in ${String(year)}: the ephemeris does not reach that year.`,
    );
  }

  return Temporal.Instant.fromEpochMilliseconds(found.date.getTime());
}

/** One solar term, and when it happened. */
export interface DatedSolarTerm {
  readonly term: SolarTerm;
  readonly instant: Temporal.Instant;
}

/**
 * Every solar term falling in a given Gregorian year, in chronological order.
 *
 * Always twenty-four of them: each solar longitude is reached exactly once a
 * year, so a Gregorian year contains a full set regardless of where the terms
 * sit within it.
 */
export function solarTermsIn(year: number): readonly DatedSolarTerm[] {
  return SOLAR_TERMS.map((term) => ({
    term,
    instant: solarTermInstant(term, year),
  })).toSorted((a, b) => Temporal.Instant.compare(a.instant, b.instant));
}
