/**
 * A converted date, and everything that decided it.
 *
 * {@link ./lunisolar.js} answers the question. This answers it and shows its
 * working, which is the whole reason this library exists alongside the
 * runtime's own Chinese calendar.
 *
 * ```ts
 * const claim = explainChinese(Temporal.PlainDate.from("2057-09-28"));
 * claim.value;                    // { year: 2057, month: 8, isLeap: false, day: 30 }
 * claim.margin.total("minutes");  // 0.67 — the runtime says month 9 day 1
 * ```
 *
 * {@link ./evidence.js} explains what a margin measures.
 *
 * Measured against the runtime over 1900-2100, the two disagree on 15 dates out
 * of 7,236, and every one of those has a margin under six minutes. Nothing
 * further than ten minutes from a midnight disagrees at all.
 *
 * ## Evidence is per field
 *
 * The parts of an answer do not degrade together. Going back through history the
 * sexagenary day count stays exact, because it is a continuous count with no
 * astronomical input, while the month number around it depends on conjunctions
 * and solar terms and falls apart. One claim, three confidence levels.
 * {@link ChineseClaim.margin} carries the smallest of the three for callers who
 * only want to know whether a date is worth a second look.
 */

import type { DecidingEvent, Evidence } from "./evidence.js";
import {
  evidenceFrom,
  majorTermsIn,
  newMoonEvent,
  smallestMargin,
  solarTermEvent,
} from "./evidence.js";
import { monthBoundaries } from "./margins.js";
import {
  monthContaining,
  monthsOfYear,
  spanContaining,
} from "./lunar-lookup.js";
import type { LunisolarDate, ModelId, Options } from "./lunisolar.js";
import { dateIn, placeOf } from "./lunisolar.js";
import type { Place } from "./place.js";

/** A converted date, and everything that decided it. */
export interface ChineseClaim {
  /** The date that was asked about. */
  readonly of: Temporal.PlainDate;
  /** The answer. Equal to what `toChinese` returns for the same inputs. */
  readonly value: LunisolarDate;
  readonly place: Place;
  readonly model: ModelId;
  readonly day: Evidence;
  readonly month: Evidence;
  readonly year: Evidence;
  /**
   * The smallest margin across the three fields.
   *
   * Redundant, and it earns its place. Without it every caller asking whether a
   * date is worth a second look writes the same fold across three fields.
   */
  readonly margin: Temporal.Duration;
}

/**
 * The lunisolar date of a Gregorian one, with everything that decided it.
 *
 * The claim's `value` is exactly what `toChinese` returns for the same inputs.
 *
 * @throws {RangeError} if the ephemeris does not reach the date.
 */
export function explainChinese(
  date: Temporal.PlainDate,
  options?: Options,
): ChineseClaim {
  const place = placeOf(options);
  const span = spanContaining(date, place);
  const month = monthContaining(span, date);

  const value = dateIn(month, date);
  const opening = newMoonEvent("month start", month.startInstant, place);

  // The conjunction closing a month decides this date only on the month's last
  // day, where it settles whether the date is day 30 here or day 1 of the next
  // month. Carrying it is what stopped the claim reporting 2057-09-28 as safe
  // at 715 minutes while it sat 40 seconds from flipping.
  const closing: DecidingEvent[] =
    value.day === month.length
      ? [newMoonEvent("month end", month.endInstant, place)]
      : [];

  // Month 11 is the month *containing* 冬至, so the solstice is measured
  // against the month boundaries it would have to cross, not against the
  // nearest midnight. A solstice one minute after midnight in mid-month has
  // decided nothing marginally.
  const boundaries = monthBoundaries(span);
  const solstice = solarTermEvent(
    "solstice",
    "冬至",
    span.solstice,
    boundaries,
  );

  // Leap placement renumbers every month after it, so it decides the month and
  // the year of any date that follows it. A common year has no placement to be
  // near, and pays nothing for the terms.
  const leap = span.months.some((each) => each.isLeap)
    ? majorTermsIn(span)
    : [];

  // The conjunction opening month 1 decides which lunisolar year a date falls
  // in, and it can only change the answer for a date sitting on that boundary.
  // Carrying it for every date in the year reported one date in ten as
  // fragile, which is a signal nobody can act on.
  const firstMonth = monthsOfYear(value.year, place).at(0);
  const onYearBoundary =
    firstMonth !== undefined &&
    Math.abs(date.since(firstMonth.start).days) <= 1;

  const yearStart: DecidingEvent[] =
    firstMonth === undefined || !onYearBoundary
      ? []
      : [newMoonEvent("year start", firstMonth.startInstant, place)];

  const day = evidenceFrom([opening, ...closing]);
  const inMonth = evidenceFrom([opening, ...closing, solstice, ...leap]);
  const year = evidenceFrom([...yearStart, ...leap]);

  return {
    of: date,
    value,
    place,
    model: options?.model ?? "shixian",
    day,
    month: inMonth,
    year,
    margin: smallestMargin([
      ...day.deciding,
      ...inMonth.deciding,
      ...year.deciding,
    ]),
  };
}
