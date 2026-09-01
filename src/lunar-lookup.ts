/**
 * Finding the span or month a date belongs to.
 *
 * {@link ./lunar-months.js} builds a span of numbered months from one solstice
 * month to the next. These are the lookups over it, and they carry the one
 * awkward mapping in the library: a lunisolar year runs from month 1 to month
 * 12 while the engine computes from month 11 to month 11, so a year straddles
 * two spans and has to be stitched from both.
 */

import type { LunarMonth, LunarSpan } from "./lunar-months.js";
import { spanFromSolsticeOf } from "./lunar-months.js";
import { solsticeMonth } from "./lunar-boundaries.js";
import type { Place } from "./place.js";
import { localDateAt } from "./place.js";

/** The span of months containing a Gregorian date. */
export function spanContaining(
  date: Temporal.PlainDate,
  place: Place,
): LunarSpan {
  // The span opening in this December contains the date only once the date has
  // reached that month 11. Before then the date belongs to the previous span.
  const opensOn = localDateAt(solsticeMonth(date.year, place).opening, place);
  const isoYear =
    Temporal.PlainDate.compare(date, opensOn) >= 0 ? date.year : date.year - 1;

  return spanFromSolsticeOf(isoYear, place);
}

/**
 * The month of a span containing a date.
 *
 * A span built by {@link spanContaining} always holds the date it was built
 * for, so callers converting a date never see the error. It is reachable by
 * pairing a span with a date from outside it, which is a caller mistake worth
 * naming rather than answering with the nearest month.
 *
 * @throws {RangeError} if the span does not cover the date.
 */
export function monthContaining(
  span: LunarSpan,
  date: Temporal.PlainDate,
): LunarMonth {
  const month = span.months.find(
    (each) =>
      Temporal.PlainDate.compare(date, each.start) >= 0 &&
      Temporal.PlainDate.compare(date, each.end) < 0,
  );

  if (month === undefined) {
    throw new RangeError(
      `The span at ${span.place.name} does not cover ${date.toString()}.`,
    );
  }

  return month;
}

/**
 * The months of one lunisolar year, from month 1 to month 12.
 *
 * A lunisolar year straddles two solstice spans, so this stitches the tail of
 * one to the head of the next.
 */
export function monthsOfYear(
  year: number,
  place: Place,
): readonly LunarMonth[] {
  return [
    ...spanFromSolsticeOf(year - 1, place).months,
    ...spanFromSolsticeOf(year, place).months,
  ].filter((month) => month.year === year);
}
