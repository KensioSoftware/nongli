/**
 * The sexagenary year (干支) and zodiac animal (生肖) of a date.
 *
 * {@link ./sexagenary.js} is the cycle arithmetic and says nothing about dates,
 * deliberately, because the mapping is where the contested conventions live.
 * This is that mapping, with the contested part made an argument.
 *
 * ```ts
 * sexagenaryYearOf(Temporal.PlainDate.from("2026-06-15"));
 * // { index: 42, stem: "丙", branch: "午" } — 丙午年
 *
 * zodiacOf(Temporal.PlainDate.from("2026-06-15")).name; // "马"
 * ```
 *
 * ## Where the year turns, and why it is an argument
 *
 * Two traditions put the boundary in different places, and both are in use.
 *
 * | `boundary` | The year turns at | Used by |
 * | --- | --- | --- |
 * | `"new-year"` | 正月初一, the lunisolar New Year | the calendar itself, and the almanacs printed from it |
 * | `"lichun"` | 立春, the solar term at 315° | 四柱 and the practices built on it |
 *
 * They disagree for the days between the two, which can be a fortnight apart.
 * 2024 is the clearest recent case: 立春 fell on 4 February and New Year on the
 * 10th, so the six days between them are 甲辰 under one convention and 癸卯
 * under the other. Neither is a mistake.
 *
 * The default is `"new-year"`, because that is what the calendar this library
 * converts does, and it is what the Hong Kong Observatory prints in the tables
 * the conformance suite checks against. Anyone wanting the other has to say so,
 * which is the point: the library resolves nothing by picking quietly.
 *
 * ## The anchor
 *
 * 1984 was 甲子, the first year of the cycle, under both conventions. The
 * conformance suite checks the resulting names against 2,192 dates the
 * Observatory published, so the anchor is measured rather than asserted.
 */

import type { Options } from "./lunisolar.js";
import { placeOf, toChinese } from "./lunisolar.js";
import type { Sexagenary } from "./sexagenary.js";
import { CYCLE_LENGTH, sexagenary } from "./sexagenary.js";
import { localDateAt } from "./place.js";
import { solarTermInstant } from "./solar-term-times.js";
import { solarTermNamed } from "./solar-terms.js";
import type { ZodiacAnimal } from "./zodiac.js";
import { zodiacFor } from "./zodiac.js";

/** The year 1984, which was 甲子 and so sits at index 0 of the cycle. */
const CYCLE_EPOCH_YEAR = 1984;

/** 立春, the term the 四柱 year turns on. */
const START_OF_SPRING = solarTermNamed("立春");

/** Where the sexagenary year begins. */
export type YearBoundary =
  /** 正月初一, the lunisolar New Year. What the calendar does. */
  | "new-year"
  /** 立春, the solar term at 315°. What 四柱 does. */
  | "lichun";

/** Where and by which conventions to read a date. */
export interface SexagenaryOptions extends Options {
  /** Defaults to `"new-year"`. See this module's header. */
  readonly boundary?: YearBoundary;
}

/** The sexagenary year under the 立春 convention. */
function lichunYear(date: Temporal.PlainDate, options: Options): number {
  if (START_OF_SPRING === undefined) {
    throw new Error("The solar term table is missing 立春.");
  }

  const place = placeOf(options);
  // 立春 falls in early February, so the only question is whether this date has
  // reached its own Gregorian year's one yet.
  const turning = localDateAt(
    solarTermInstant(START_OF_SPRING, date.year),
    place,
  );

  return Temporal.PlainDate.compare(date, turning) >= 0
    ? date.year
    : date.year - 1;
}

/**
 * The sexagenary year (干支) a date falls in.
 *
 * ```ts
 * sexagenaryYearOf(Temporal.PlainDate.from("2026-06-15"));
 * // { index: 42, stem: "丙", branch: "午" }
 *
 * // The six days between 立春 and New Year in 2024, where the two conventions
 * // part company.
 * const between = Temporal.PlainDate.from("2024-02-06");
 * sexagenaryYearOf(between).stem; // "癸" — 癸卯, the calendar's answer
 * sexagenaryYearOf(between, { boundary: "lichun" }).stem; // "甲" — 甲辰
 * ```
 *
 * Named for the pillar it returns rather than called `sexagenaryOf`, which is
 * already the stem-and-branch lookup, and because the day and hour pillars want
 * the same room when they arrive.
 *
 * @throws {RangeError} if the ephemeris does not reach the date.
 */
export function sexagenaryYearOf(
  date: Temporal.PlainDate,
  options?: SexagenaryOptions,
): Sexagenary {
  const year =
    options?.boundary === "lichun"
      ? lichunYear(date, options)
      : toChinese(date, options).year;

  // Modulo twice, because the first can be negative for a year before the
  // anchor and the cycle has no negative positions.
  const index =
    (((year - CYCLE_EPOCH_YEAR) % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;

  return sexagenary(index);
}

/**
 * The zodiac animal (生肖) of a date's year.
 *
 * ```ts
 * zodiacOf(Temporal.PlainDate.from("2026-06-15")).name; // "马"
 * zodiacOf(Temporal.PlainDate.from("2026-06-15")).english; // "horse"
 * ```
 *
 * The animal names the year's Earthly Branch, so it turns wherever the year
 * does and takes the same `boundary` option. Someone born in the days between
 * 立春 and New Year has two defensible animals, which is a real and common
 * source of confusion rather than an edge case.
 *
 * @throws {RangeError} if the ephemeris does not reach the date.
 */
export function zodiacOf(
  date: Temporal.PlainDate,
  options?: SexagenaryOptions,
): ZodiacAnimal {
  return zodiacFor(sexagenaryYearOf(date, options).branch);
}
