/**
 * ΔT, the gap between uniform time and the Earth's actual rotation.
 *
 * ΔT = TT − UT1. An ephemeris computes in Terrestrial Time, which ticks
 * uniformly. Local midnight follows the Earth, which does not. Every conversion
 * from an astronomical instant to a civil date runs through this difference, so
 * an error in it shifts every deciding instant in the library by the same
 * amount:
 *
 * > a ΔT error of E minutes puts roughly E/1440 of all dates on the wrong day.
 *
 * That makes ΔT the most consequential number in nongli for historical dates,
 * and the one term that comparing two ephemerides cannot reveal. The usual
 * candidates all inherit the same Espenak and Meeus polynomials, so a
 * cross-check between them is blind to exactly this step.
 *
 * ## What is published and what is nongli's
 *
 * {@link ./delta-t-smh2016.js} is the paper and nothing else.
 * {@link ./delta-t-table.js} is its Table S15, generated and provenanced. This
 * module is the arrangement, and the arrangement involves choices the authors
 * did not make.
 *
 * The spline covers −720 to 2016 and is fitted to Babylonian, Chinese, Greek
 * and Arab eclipse records and to lunar occultations. Inside that range nongli
 * reports it unchanged. {@link DeltaT.basis} always says which of the three
 * regimes produced a value.
 *
 * ## Before −720
 *
 * The paper's own long-term parabola, anchored to meet the spline at −720. The
 * authors are explicit that reaching back past their data rests on a roughly
 * 1500-year oscillation whose reality they call conjectural, and that they
 * assume tidal friction is unchanged only within −2000 to 2500. This is the
 * least trustworthy region the library has.
 *
 * ## After 2016
 *
 * The parabola is a *long-term* fit and is badly wrong near the present. At
 * 2026 it gives about −189 s where the true value is near 69, so using it
 * forward would wreck exactly the modern dates most callers ask about.
 *
 * Instead the shape comes from `astronomy-engine`'s Espenak and Meeus
 * polynomials, which are tuned for the modern era, shifted by a constant so
 * they meet the spline at 2016.
 *
 * **This part is nongli's arrangement and not SMH2016.** The future constrains
 * nothing. Eclipse records pin the past and there is no equivalent going
 * forward, so a projected ΔT is the weakest number this library produces, and
 * {@link DeltaT.uncertainty} understates it.
 */

import { DeltaT_EspenakMeeus } from "astronomy-engine";

import { parabola, spline, uncertainty } from "./delta-t-smh2016.js";
import { SPLINE_FROM_YEAR, SPLINE_TO_YEAR } from "./delta-t-table.js";

/** Days in the mean tropical year, matching `astronomy-engine`'s own constant. */
const DAYS_PER_TROPICAL_YEAR = 365.242189;

/**
 * `astronomy-engine` counts days from 2000-01-01T12:00Z, and its own Espenak
 * and Meeus code treats day 14 of that count as the year 2000.0.
 */
const J2000_YEAR_OFFSET_DAYS = 14;

/** How the value for a year was arrived at. */
export type DeltaTBasis =
  /** Inside the spline, which is fitted to observations. */
  | "fitted"
  /** Before the spline, on the paper's long-term parabola. */
  | "extrapolated"
  /** After the spline, on a modern model anchored to it. */
  | "projected";

/** ΔT for a year, and how much it is worth. */
export interface DeltaT {
  /** TT − UT1, in seconds. */
  readonly seconds: number;
  /**
   * How far the value could be out, in seconds.
   *
   * Propagated from the ± the paper states on its parabola coefficient, so it
   * is a published quantity rather than a guess. It grows as the square of the
   * distance from 1825.
   *
   * **It understates the future.** The past is constrained by eclipse records
   * and the future by nothing, so a `"projected"` value is worth less than this
   * number suggests.
   */
  readonly uncertainty: number;
  readonly basis: DeltaTBasis;
}

/** The modern polynomials, in years rather than in days from the epoch. */
function espenakMeeus(isoYear: number): number {
  return DeltaT_EspenakMeeus(
    (isoYear - 2000) * DAYS_PER_TROPICAL_YEAR + J2000_YEAR_OFFSET_DAYS,
  );
}

/**
 * The spline's own value at one of its endpoints.
 *
 * Only ever called with those two years, so the throw is unreachable unless the
 * generated table stops covering the range it declares.
 */
function splineEndpoint(isoYear: number): number {
  const value = spline(isoYear);
  if (value === undefined) {
    throw new Error(`The ΔT spline does not cover ${String(isoYear)}.`);
  }
  return value;
}

/**
 * Offsets that make each outer model meet the spline exactly at its endpoint.
 *
 * Neither the parabola nor the modern polynomials pass through the spline's
 * ends on their own. Anchoring shifts each curve without bending it, so the
 * shape stays the published one and ΔT stays continuous. A step here would be a
 * step in every deciding instant, and could flip a date for no reason but the
 * join between two models.
 */
const PROJECTION_OFFSET =
  splineEndpoint(SPLINE_TO_YEAR) - espenakMeeus(SPLINE_TO_YEAR);

const EXTRAPOLATION_OFFSET =
  splineEndpoint(SPLINE_FROM_YEAR) - parabola(SPLINE_FROM_YEAR);

/**
 * ΔT for a year, with its basis and its uncertainty.
 *
 * ```ts
 * deltaTFor(1600).seconds; // 89.38, fitted to eclipse records
 * deltaTFor(2026).basis; // "projected"
 * ```
 *
 * `isoYear` may be fractional. Total for every year, because refusing here
 * would refuse the whole library.
 */
export function deltaTFor(isoYear: number): DeltaT {
  const fitted = spline(isoYear);

  if (fitted !== undefined) {
    return {
      seconds: fitted,
      uncertainty: uncertainty(isoYear),
      basis: "fitted",
    };
  }

  const before = isoYear < SPLINE_FROM_YEAR;

  return {
    seconds: before
      ? parabola(isoYear) + EXTRAPOLATION_OFFSET
      : espenakMeeus(isoYear) + PROJECTION_OFFSET,
    uncertainty: uncertainty(isoYear),
    basis: before ? "extrapolated" : "projected",
  };
}

/**
 * ΔT in seconds for a count of days from the 2000.0 epoch.
 *
 * The shape `astronomy-engine` wants for `SetDeltaTFunction`, and the only
 * reason this module knows about days at all.
 */
export function deltaTSecondsFromEpochDays(days: number): number {
  return deltaTFor(
    2000 + (days - J2000_YEAR_OFFSET_DAYS) / DAYS_PER_TROPICAL_YEAR,
  ).seconds;
}
