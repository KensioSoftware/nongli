/**
 * Questions about a whole lunisolar year.
 *
 * A lunisolar year runs from 正月初一 (month 1 day 1, 春节) to the day before the
 * next one, so it straddles two Gregorian years and two of the solstice spans
 * the engine in {@link ./lunar-months.js} computes in. These functions do that
 * stitching so callers never have to.
 *
 * ```ts
 * chineseNewYear(2026);        // 2026-02-17
 * isLeapYear(2033);            // true
 * lunisolarYear(2033).length;  // 13
 * ```
 */

import type { LunarMonth } from "./lunar-months.js";
import { MONTHS_IN_COMMON_YEAR } from "./lunar-months.js";
import { monthsOfYear } from "./lunar-lookup.js";
import type { Options } from "./lunisolar.js";
import { fromChinese, placeOf } from "./lunisolar.js";

/** The date 春节 falls on, which is month 1 day 1 of the lunisolar year. */
export function chineseNewYear(
  year: number,
  options?: Options,
): Temporal.PlainDate {
  return fromChinese({ year, month: 1, day: 1 }, options);
}

/**
 * Every month of a lunisolar year, from month 1 to month 12.
 *
 * Thirteen entries in a leap year. Useful for building a calendar page, and for
 * checking the invariants that every month runs 29 or 30 days and that a leap
 * month contains no 中气.
 */
export function lunisolarYear(
  year: number,
  options?: Options,
): readonly LunarMonth[] {
  return monthsOfYear(year, placeOf(options));
}

/** Whether a lunisolar year holds a leap month. */
export function isLeapYear(year: number, options?: Options): boolean {
  return lunisolarYear(year, options).length > MONTHS_IN_COMMON_YEAR;
}
