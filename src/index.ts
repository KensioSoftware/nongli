/**
 * Nongli: Chinese calendrical and historical chronology utilities for
 * JavaScript and Temporal.
 *
 * What exists so far is the sexagenary cycle (干支) and the twenty-four solar
 * terms (二十四节气) — the two halves of the calendar that can be stated
 * exactly. The cycle is pure arithmetic; the terms are moments the Sun reaches
 * a given longitude, and a moment is the same moment wherever you stand.
 *
 * What is deliberately absent is the step from either of those to a *date*.
 * That depends on which local midnight an instant falls between, which depends
 * on a place, and on conventions that have to be named rather than assumed.
 * Naming them is the work still to come.
 *
 * Requires a runtime with `Temporal`: Node 26 or later, or a browser that
 * implements it. Nongli reads the global rather than importing a polyfill, so
 * anywhere without one natively can load `temporal-polyfill` first and
 * everything here works untouched.
 */

export type { Branch, Sexagenary, Stem } from "./sexagenary.js";
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

export type { DatedSolarTerm } from "./ephemeris.js";
export { solarTermInstant, solarTermsIn } from "./ephemeris.js";
