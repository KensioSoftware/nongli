/**
 * Converting between Gregorian dates and the 农历.
 *
 * Two calls, and the difference between them is the point of this library.
 * {@link toChinese} returns the date. {@link explainChinese} returns the date
 * and everything that decided it, including how close each part came to being
 * something else.
 *
 * ```ts
 * toChinese(Temporal.PlainDate.from("2026-02-17"));
 * // { year: 2026, month: 1, isLeap: false, day: 1 } — 春节
 * ```
 *
 * ## A date is a claim with evidence
 *
 * Every rule of this calendar is a threshold comparison. A month begins on the
 * day containing a conjunction, month 11 is the month containing a solstice, and
 * a leap month is one containing no 中气. Each of those asks whether an
 * astronomical instant falls before or after a local midnight, so for every
 * boundary there is a computable distance from deciding the other way.
 *
 * A conjunction at 23:52 starts the month on the 3rd. Eight minutes later it
 * starts on the 4th, and the leap month and New Year can move with it. That
 * distance is the **margin**, and it is a duration in minutes. It is never a
 * probability that the answer is wrong.
 *
 * Measured against the runtime's own Chinese calendar over 1900-2100, the two
 * disagree on 15 dates out of 7,236. Every one of them has a margin under six
 * minutes, and nothing further than ten minutes from midnight disagrees at all.
 * The margin measures what it claims to measure.
 *
 * ## Evidence is per field
 *
 * The parts of an answer do not degrade together. Going back through history the
 * sexagenary day count stays exact, because it is a continuous count with no
 * astronomical input, while the month number around it depends on conjunctions
 * and solar terms and falls apart. One claim, three confidence levels. A single
 * figure for the whole answer would throw away the most useful thing this
 * library knows.
 *
 * {@link ChineseClaim.margin} carries the smallest of the three for callers who
 * only want to know whether a date is worth a second look.
 */

import type { LunarMonth } from "./lunar-months.js";

export type { LunarMonth } from "./lunar-months.js";
import {
  monthContaining,
  monthsOfYear,
  spanContaining,
} from "./lunar-lookup.js";
import type { Place } from "./place.js";
import type { ModelId } from "./models.js";
import { CHINA_STANDARD } from "./place.js";

export type { ModelId } from "./models.js";

/**
 * A date in the lunisolar calendar.
 *
 * This library's own type, and the reasoning is worth stating because the
 * obvious alternative fails quietly. A `Temporal.PlainDate` in the `chinese`
 * calendar routes its fields through ICU, so holding an answer in one converts
 * it to ICU's answer:
 *
 * ```ts
 * Temporal.PlainDate.from({ year: 2057, monthCode: "M08", day: 30,
 *                           calendar: "chinese" });   // ISO 2057-09-27
 * ```
 *
 * nongli means 2057-09-28 there, because the conjunction closing that month
 * falls 40 seconds after local midnight. The loss lands on exactly the dates
 * this library exists to talk about. Everything on the Gregorian side stays
 * `Temporal.PlainDate`.
 */
export interface LunisolarDate {
  /** The lunisolar year. Numbered by the Gregorian year its month 1 falls in. */
  readonly year: number;
  /** 1 to 12. A leap month carries the number of the month it follows. */
  readonly month: number;
  readonly isLeap: boolean;
  /** 1 to 30. Lunar months have no other lengths. */
  readonly day: number;
}

/**
 * A lunisolar date as an argument, where `isLeap` may be left out.
 *
 * Ordinary months far outnumber leap ones, and asking for 正月初一 should not
 * mean writing `isLeap: false` to say the ordinary case applies.
 */
export interface LunisolarDateLike {
  readonly year: number;
  readonly month: number;
  readonly isLeap?: boolean;
  readonly day: number;
}

/** Where and by which rules to convert. */
export interface Options {
  /** Defaults to {@link CHINA_STANDARD}, the meridian of the official 农历. */
  readonly place?: Place;
  /** Defaults to `"shixian"`. */
  readonly model?: ModelId;
}

/** The place to convert at, defaulting to the meridian of the official 农历. */
export function placeOf(options: Options | undefined): Place {
  return options?.place ?? CHINA_STANDARD;
}

/** Where a Gregorian date falls within a lunar month. */
export function dateIn(
  month: LunarMonth,
  date: Temporal.PlainDate,
): LunisolarDate {
  return {
    year: month.year,
    month: month.number,
    isLeap: month.isLeap,
    day: date.since(month.start).days + 1,
  };
}

/**
 * The lunisolar date of a Gregorian one.
 *
 * ```ts
 * toChinese(Temporal.PlainDate.from("2026-02-17"));
 * // { year: 2026, month: 1, isLeap: false, day: 1 }
 *
 * toChinese(Temporal.PlainDate.from("2033-12-22"));
 * // { year: 2033, month: 11, isLeap: true, day: 1 } — 闰十一月
 * ```
 *
 * Costs about a third less than {@link explainChinese}, because placing the leap
 * month needs only the Sun's position at each month start while reporting how
 * close that placement sat to flipping needs the 中气 instants themselves.
 *
 * @throws {RangeError} if the ephemeris does not reach the date.
 */
export function toChinese(
  date: Temporal.PlainDate,
  options?: Options,
): LunisolarDate {
  const place = placeOf(options);
  const span = spanContaining(date, place);
  const month = monthContaining(span, date);

  return dateIn(month, date);
}

/**
 * The Gregorian date of a lunisolar one.
 *
 * ```ts
 * fromChinese({ year: 2026, month: 1, day: 1 });
 * // 2026-02-17 — 春节
 * ```
 *
 * @throws {RangeError} if the year holds no such month, which happens when a
 * leap month is asked for in a year that has none, or when the day exceeds the
 * month's length.
 */
export function fromChinese(
  date: LunisolarDateLike,
  options?: Options,
): Temporal.PlainDate {
  const place = placeOf(options);
  const wantsLeap = date.isLeap ?? false;

  const month = monthsOfYear(date.year, place).find(
    (candidate) =>
      candidate.number === date.month && candidate.isLeap === wantsLeap,
  );

  if (month === undefined) {
    throw new RangeError(
      `Lunisolar year ${String(date.year)} has no ${wantsLeap ? "leap " : ""}month ${String(date.month)} at ${place.name}.`,
    );
  }

  if (date.day < 1 || date.day > month.length) {
    throw new RangeError(
      `Month ${String(date.month)} of ${String(date.year)} has ${String(month.length)} days; got day ${String(date.day)}.`,
    );
  }

  return month.start.add({ days: date.day - 1 });
}
