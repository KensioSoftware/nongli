/**
 * The published ΔT formulae, written out independently of the model.
 *
 * `src/delta-t.ts` implements Stephenson, Morrison and Hohenkerk (2016). These
 * are the same published expressions typed out a second time so a test can
 * check the implementation against the paper rather than against itself.
 *
 * Pinning a value produced by the code under test only proves the code is
 * deterministic. It keeps passing once the code is wrong, as long as it is
 * wrong consistently. So the check has to come from somewhere else, and for a
 * published formula the honest somewhere else is the formula.
 */

/**
 * Equation (4.1), the long-term parabolic fit, in seconds.
 *
 * > ΔT = −320.0 + (32.5 ± 0.6) ((year − 1825)/100)² s
 */
export const smh2016Parabola = (isoYear: number): number =>
  -320 + 32.5 * ((isoYear - 1825) / 100) ** 2;

/**
 * The ΔT uncertainty implied by the ± 0.6 the paper states on its coefficient,
 * in seconds.
 */
export const smh2016Uncertainty = (isoYear: number): number =>
  0.6 * ((isoYear - 1825) / 100) ** 2;
