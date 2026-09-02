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
 * The functions here are deliberately thin and deliberately total — they report
 * absence with `undefined` rather than throwing, and leave it to their callers
 * to decide whether a missing answer is an error. Everything shaped like a
 * calendar lives elsewhere.
 *
 * ## nongli owns its ΔT
 *
 * `astronomy-engine` defaults to the Espenak and Meeus polynomials and exposes
 * `SetDeltaTFunction` to replace them. nongli supplies Stephenson, Morrison and
 * Hohenkerk (2016) instead, installed here at module load so that every instant
 * this module returns already carries it.
 *
 * ΔT is what converts an astronomical instant into a civil date, and it is the
 * one term a cross-check between ephemerides cannot see, because the usual
 * candidates all inherit the same Espenak and Meeus polynomials. Owning it is
 * the difference between historical dates that mean something and historical
 * dates that look confident. See {@link ./delta-t.js}.
 *
 * The installation is a module side effect, which is the one place this package
 * has any. `astronomy-engine` keeps the function in module state and offers no
 * other way in, and every entry point here imports this module, so there is no
 * order in which a caller can get an instant computed on the old default.
 */

import * as astronomy from "astronomy-engine";

import { deltaTSecondsFromEpochDays } from "./delta-t.js";

astronomy.SetDeltaTFunction(deltaTSecondsFromEpochDays);

const toDate = (instant: Temporal.Instant): Date =>
  new Date(instant.epochMilliseconds);

const toInstant = (time: astronomy.AstroTime): Temporal.Instant =>
  Temporal.Instant.fromEpochMilliseconds(time.date.getTime());

/**
 * The Sun's apparent geocentric ecliptic longitude at an instant, in degrees.
 *
 * Which unpacks as: **how far through the year the Sun is**, measured as an
 * angle from 0 to 360 rather than in days. 0° is the March equinox, 90° the June
 * solstice, 180° September, 270° December. *Ecliptic* is the path the Sun traces
 * against the stars over a year; *geocentric* means as seen from the Earth
 * rather than from the Sun; *apparent* means with the small corrections for
 * light taking time to arrive. The last two affect accuracy and never change
 * what the number means.
 *
 * Total: there is a position for every instant, so nothing to report absent.
 */
export function sunLongitude(at: Temporal.Instant): number {
  return astronomy.SunPosition(toDate(at)).elon;
}

/**
 * The instant the Sun next reaches a given point in its yearly circuit,
 * searching forward from `from`, or `undefined` if it does not do so within
 * `withinDays`. See {@link sunLongitude} for what the angle means.
 *
 * ## Keep the window short
 *
 * The search misses crossings when given a long window. Measured on
 * astronomy-engine 2.1.19, a 400-day search from 1 January finds twenty-two of
 * the twenty-four solar term longitudes and returns nothing at all for 105° and
 * 135°, in every year tried from -500 to 2026. The same search over 380 days
 * finds both.
 *
 * So callers should estimate where the answer is and search a few weeks around
 * it, rather than sweeping a year and taking what turns up. That is faster
 * besides.
 */
export function sunReachesLongitude(
  longitude: number,
  from: Temporal.Instant,
  withinDays: number,
): Temporal.Instant | undefined {
  const found = astronomy.SearchSunLongitude(
    longitude,
    toDate(from),
    withinDays,
  );
  return found === null ? undefined : toInstant(found);
}

/**
 * The instant of the first new moon at or after `from`, or `undefined` if there
 * is none within `withinDays`.
 *
 * A new moon is the moment the Moon passes between the Earth and the Sun — the
 * conjunction — not first sight of the crescent. See
 * {@link ./new-moons.js} for why that distinction matters.
 *
 * Unlike {@link sunReachesLongitude} this one is not sensitive to the window
 * length — it returns the same answer for any window from 30 to 1000 days,
 * because it searches for the next occurrence rather than for a crossing
 * somewhere inside a span. The window only needs to be long enough to contain
 * one synodic month, which varies between about 29.3 and 29.8 days.
 */
export function nextNewMoon(
  from: Temporal.Instant,
  withinDays: number,
): Temporal.Instant | undefined {
  const found = astronomy.SearchMoonPhase(0, toDate(from), withinDays);
  return found === null ? undefined : toInstant(found);
}
