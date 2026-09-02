/**
 * Nongli: Chinese calendrical and historical chronology utilities for
 * JavaScript and Temporal.
 *
 * The astronomy is here (new moons and the twenty-four solar terms), the
 * sexagenary cycle is here, and the calendar built on them is here.
 * {@link toChinese} converts a Gregorian date to the 农历 and
 * {@link explainChinese} converts it and shows its working.
 *
 * ```ts
 * toChinese(Temporal.PlainDate.from("2026-02-17"));
 * // { year: 2026, month: 1, isLeap: false, day: 1 } — 春节
 * ```
 *
 * ## The step from an instant to a date needs a place
 *
 * A new moon happens at one moment, the same moment everywhere. Which *day*
 * that moment falls on depends on the meridian whose midnight it is measured
 * against, so every conversion takes a {@link Place} and defaults to
 * {@link CHINA_STANDARD}. Change it and the same engine produces âm lịch or
 * 음력.
 *
 * Because every rule of the calendar is a comparison against a local midnight,
 * every answer has a computable distance from being a different answer.
 * {@link explainChinese} reports it.
 *
 * ΔT, the term that turns an instant into a civil date, is nongli's own rather
 * than the ephemeris library's default. {@link deltaTFor} exposes it with the
 * uncertainty the source paper states.
 *
 * Requires a runtime with `Temporal`: Node 26 or later, or a browser that
 * implements it. Nongli reads the global rather than importing a polyfill, so
 * anywhere without one natively can load `temporal-polyfill` first and
 * everything here works untouched.
 */

export type { Branch, Sexagenary, Stem } from "./sexagenary.js";
export type { SexagenaryOptions, YearBoundary } from "./sexagenary-dates.js";
export { sexagenaryYearOf, zodiacOf } from "./sexagenary-dates.js";
export type { ZodiacAnimal } from "./zodiac.js";
export { ZODIAC, zodiacFor, zodiacNamed } from "./zodiac.js";
export {
  BRANCHES,
  CYCLE_LENGTH,
  sexagenary,
  sexagenaryOf,
  STEMS,
} from "./sexagenary.js";

export type { SolarTerm } from "./solar-terms.js";
export {
  MAJOR_TERMS,
  SOLAR_TERMS,
  solarTermNamed,
  TERM_COUNT,
} from "./solar-terms.js";

export type { DatedSolarTerm } from "./solar-term-times.js";
export { solarTermInstant, solarTermsIn } from "./solar-term-times.js";

export { newMoonFrom, newMoonsBetween } from "./new-moons.js";

export type { DeltaT, DeltaTBasis } from "./delta-t.js";
export { deltaTFor } from "./delta-t.js";

export type { Place } from "./place.js";
export {
  BEIJING_LOCAL,
  CHINA_STANDARD,
  KOREA_STANDARD,
  marginFromMidnight,
  VIETNAM_STANDARD,
} from "./place.js";

export type {
  LunarMonth,
  LunisolarDate,
  LunisolarDateLike,
  Options,
} from "./lunisolar.js";

export type { Basis, BasisClaim, CalendarModel, ModelId } from "./models.js";
export { basisFor, modelFor, SHIXIAN } from "./models.js";
export { fromChinese, toChinese } from "./lunisolar.js";
export { chineseNewYear, isLeapYear, lunisolarYear } from "./lunisolar-year.js";

export type { ChineseClaim } from "./claim.js";
export { explainChinese } from "./claim.js";

export type { DecidingEvent, DecidingRole, Evidence } from "./evidence.js";
