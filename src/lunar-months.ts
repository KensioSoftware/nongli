/**
 * The lunisolar year, as a run of twelve or thirteen numbered months.
 *
 * {@link ./lunar-boundaries.js} finds the conjunctions. This assembles them
 * into a calendar, numbering the months and placing the leap month, and it is
 * the engine the conversions in {@link ./lunisolar.js} sit on.
 *
 * ## The three rules
 *
 * The modern calendar (时宪历, in force since 1645) needs only these:
 *
 * > A month begins on the day containing the new moon (朔).
 * > Month 11 is the month containing the winter solstice (冬至).
 * > When thirteen months fall between one month 11 and the next, the leap month
 * > is the first of them containing no 中气.
 *
 * A leap month repeats the number of the month before it, so a leap month
 * following month 6 is 闰六月 and also carries the number 6.
 *
 * ## Why the span runs from month 11
 *
 * Month 11 is the only month the calendar defines directly, by the solstice it
 * contains. Everything else is counted from it. So the natural unit of
 * computation is one solstice month to the next, and a lunisolar *year* (month 1
 * to month 12) straddles two of those spans. {@link monthsOfYear} does the
 * stitching.
 */

import type { Boundary } from "./lunar-boundaries.js";
import {
  boundariesBetween,
  consecutive,
  solsticeMonth,
} from "./lunar-boundaries.js";
import type { Place } from "./place.js";

/** One month of the lunisolar calendar, located in time. */
export interface LunarMonth {
  /** 1 to 12. A leap month carries the number of the month it follows. */
  readonly number: number;
  readonly isLeap: boolean;
  /** The lunisolar year this month belongs to. */
  readonly year: number;
  /** The first day of the month. */
  readonly start: Temporal.PlainDate;
  /** The conjunction (朔) the month begins on the day of. */
  readonly startInstant: Temporal.Instant;
  /** The first day of the following month. */
  readonly end: Temporal.PlainDate;
  /** The conjunction the following month begins on the day of. */
  readonly endInstant: Temporal.Instant;
  /** 29 or 30. Lunar months have no other lengths. */
  readonly length: number;
}

/**
 * One solstice month to the next, numbered and with the leap month placed.
 *
 * Twelve or thirteen entries, always beginning at month 11.
 */
export interface LunarSpan {
  readonly months: readonly LunarMonth[];
  /** The 冬至 that makes `months[0]` month 11. */
  readonly solstice: Temporal.Instant;
  readonly place: Place;
}

/** Months in a common lunisolar year. A leap year has one more. */
export const MONTHS_IN_COMMON_YEAR = 12;

/** The month the calendar defines directly, by the solstice it contains. */
const SOLSTICE_MONTH = 11;

/** A month as a pair of boundaries, before it has a number. */
export type MonthBounds = readonly [Boundary, Boundary];

/** A month with its boundaries and its name. */
export interface NumberedMonth {
  readonly bounds: MonthBounds;
  /** 1 to 12. */
  readonly number: number;
  readonly isLeap: boolean;
  readonly year: number;
}

/**
 * Which month of a span is the leap one, or `undefined` if the span has none.
 *
 * The first containing no 中气, which is the first whose two boundaries share a
 * 30° sector of solar longitude. Month 11 opens the span and contains the
 * solstice, so it is never a candidate.
 *
 * A twelve-month span cannot have a leap month however its sectors fall, so the
 * count is checked before the sectors are.
 */
export function leapIndexOf(
  months: readonly MonthBounds[],
): number | undefined {
  if (months.length <= MONTHS_IN_COMMON_YEAR) {
    return undefined;
  }

  const found = months.findIndex(
    ([start, end], index) => index > 0 && start.sector === end.sector,
  );

  return found === -1 ? undefined : found;
}

/**
 * The number and year of each month in a span.
 *
 * Counting runs from month 11, which is where the span opens. A leap month
 * takes no number of its own, so the count pauses over it and resumes after.
 *
 * `isoYear` names the December whose solstice opened the span. Months 11 and 12
 * close the lunisolar year of that December, and month 1 opens the next.
 */
export function numberMonths(
  months: readonly MonthBounds[],
  leapIndex: number | undefined,
  isoYear: number,
): readonly NumberedMonth[] {
  const numbered: NumberedMonth[] = [];
  let number = SOLSTICE_MONTH;
  let year = isoYear;

  for (const [index, bounds] of months.entries()) {
    const isLeap = index === leapIndex;

    if (index > 0 && !isLeap) {
      number = (number % MONTHS_IN_COMMON_YEAR) + 1;
      if (number === 1) {
        year = isoYear + 1;
      }
    }

    numbered.push({ bounds, number, isLeap, year });
  }

  return numbered;
}

/**
 * The span of months from one solstice month to the next.
 *
 * `isoYear` names the December whose solstice opens the span, so the span built
 * for 2025 runs from 冬至 2025 to 冬至 2026 and holds the months numbered 11 and
 * 12 of lunisolar year 2025 followed by months 1 to 10 of 2026.
 */
export function spanFromSolsticeOf(isoYear: number, place: Place): LunarSpan {
  const opening = solsticeMonth(isoYear, place);
  const closing = solsticeMonth(isoYear + 1, place);
  const bounds = [...consecutive(boundariesBetween(opening, closing, place))];
  const leapIndex = leapIndexOf(bounds);

  const months = numberMonths(bounds, leapIndex, isoYear).map(
    ({ bounds: [start, end], number, isLeap, year }) => ({
      number,
      isLeap,
      year,
      start: start.date,
      startInstant: start.instant,
      end: end.date,
      endInstant: end.instant,
      length: end.date.since(start.date).days,
    }),
  );

  return {
    months,
    solstice: opening.solstice,
    place,
  };
}
