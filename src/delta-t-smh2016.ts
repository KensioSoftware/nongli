/**
 * The published Stephenson, Morrison and Hohenkerk (2016) formulae, and
 * nothing else.
 *
 * Everything here is the paper. {@link ./delta-t.js} decides how to arrange it,
 * where to hand over between the pieces, and what to do outside the range the
 * authors covered. Keeping the two apart means a reader can see exactly where
 * the published work stops and nongli's own judgement starts, which for a
 * library whose whole claim is showing its working is worth a module boundary.
 *
 * Stephenson, F.R., Morrison, L.V. and Hohenkerk, C.Y. (2016), "Measurement of
 * the Earth's rotation: 720 BC to AD 2015", Proc. R. Soc. A 472:20160404,
 * https://doi.org/10.1098/rspa.2016.0404
 */

import type { DeltaTSegment } from "./delta-t-table.js";
import { DELTA_T_SPLINE } from "./delta-t-table.js";

/** The apex year of the long-term parabola, equation (4.1). */
const PARABOLA_EPOCH = 1825;

/** The constant term of equation (4.1), in seconds. */
const PARABOLA_CONSTANT = -320;

/** The coefficient of equation (4.1), in seconds per century squared. */
const PARABOLA_COEFFICIENT = 32.5;

/**
 * The stated error on {@link PARABOLA_COEFFICIENT}.
 *
 * The paper writes the coefficient as 32.5 ± 0.6, and that ± is the whole
 * reason nongli can report a ΔT uncertainty as a number rather than a caveat.
 */
const PARABOLA_COEFFICIENT_ERROR = 0.6;

/** Centuries from the parabola's apex, which both formulae below are in terms of. */
function centuriesFromEpoch(isoYear: number): number {
  return (isoYear - PARABOLA_EPOCH) / 100;
}

/**
 * Equation (4.1), the long-term parabolic fit, in seconds.
 *
 * > ΔT = −320.0 + (32.5 ± 0.6) ((year − 1825)/100)² s
 *
 * A fit across nearly three millennia. It is a poor guide near its own apex,
 * where the spline is fitted to observations instead, and it is what remains
 * once the observations run out.
 */
export function parabola(isoYear: number): number {
  const centuries = centuriesFromEpoch(isoYear);
  return PARABOLA_CONSTANT + PARABOLA_COEFFICIENT * centuries * centuries;
}

/**
 * The uncertainty on ΔT for a year, in seconds, from the ± on the coefficient.
 *
 * About 3 seconds at 1600, 3.3 minutes at year 0, and 23 minutes at −3000. Read
 * against *E/1440 of dates on the wrong day*, that is well under half a percent
 * of dates at risk back to −720, which is a great deal better than the raw
 * hours of ΔT suggest. Never confuse the value with its uncertainty.
 */
export function uncertainty(isoYear: number): number {
  const centuries = centuriesFromEpoch(isoYear);
  return PARABOLA_COEFFICIENT_ERROR * centuries * centuries;
}

/** The segment covering a year, or `undefined` if the spline does not reach it. */
export function segmentFor(isoYear: number): DeltaTSegment | undefined {
  return DELTA_T_SPLINE.find(([from, to]) => isoYear >= from && isoYear <= to);
}

/**
 * The spline value for a year, or `undefined` outside the fitted range.
 *
 * The paper's own instruction for reading Table S15:
 *
 * > t = (Y - K_i)/(K_{i+1} - K_i), where 0 <= t < 1, and thus calculate
 * > DT = a_0 + a_1 t + a_2 t^2 + a_3 t^3 seconds.
 */
export function spline(isoYear: number): number | undefined {
  const segment = segmentFor(isoYear);
  if (segment === undefined) {
    return undefined;
  }

  const [from, to, a0, a1, a2, a3] = segment;
  const t = (isoYear - from) / (to - from);
  return a0 + a1 * t + a2 * t * t + a3 * t * t * t;
}
