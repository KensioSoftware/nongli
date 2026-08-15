/**
 * Nongli: Chinese calendrical and historical chronology utilities for
 * JavaScript and Temporal.
 *
 * What exists so far is the sexagenary cycle (干支) on its own — the ring of
 * sixty, without any claim about which term falls on a given date. That
 * ordering is deliberate. The cycle is settled and can be written down exactly;
 * mapping it onto dates depends on conventions that have to be named rather
 * than assumed, and naming them is the work still to come.
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
