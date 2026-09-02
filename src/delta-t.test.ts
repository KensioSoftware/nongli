import {
  assertIdentical,
  assertNumberBetween,
  assertTrue,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import { smh2016Parabola, smh2016Uncertainty } from "#test/delta-t-formulae.js";

import { deltaTFor } from "./delta-t.js";
import { SPLINE_FROM_YEAR, SPLINE_TO_YEAR } from "./delta-t-table.js";

describe("ΔT", () => {
  /**
   * TT − UT1 at decade boundaries, in seconds.
   *
   * These are bookkeeping rather than theory. TT − TAI is fixed at 32.184 s,
   * TAI − UTC is the published leap second count, and UT1 − UTC was measured
   * and published by the IERS. So they are an independent check on the spline
   * and not a restatement of it.
   */
  const OBSERVED: readonly (readonly [number, number])[] = [
    [1980, 50.54],
    [1990, 56.86],
    [2000, 63.83],
    [2010, 66.07],
  ];

  describe("against observation", () => {
    it("lands within a fifth of a second of the observed modern values", () => {
      // Given years where TT − UT1 is known from measurement.
      // When ΔT is computed.
      // Then it agrees to well under a second. A second of ΔT moves every
      // deciding instant in the library by a second, so this is the check that
      // the spline is wired up the right way round and in the right units.
      for (const [year, observed] of OBSERVED) {
        assertNumberBetween(
          deltaTFor(year).seconds,
          observed - 0.2,
          observed + 0.2,
          `ΔT ${String(year)}`,
        );
      }
    });

    it("puts the 1900 value near zero, as the definition requires", () => {
      // Given 1900, where ΔT is near zero by the historical definition of the
      // scale rather than by coincidence.
      // When it is computed.
      // Then it is within a few seconds of zero. A model that missed this
      // would be miscalibrated everywhere.
      assertNumberBetween(deltaTFor(1900).seconds, -5, 5);
    });

    it("reaches hours in antiquity and a day in deep antiquity", () => {
      // Given years where the Earth's accumulated rotation error is large.
      // When ΔT is computed.
      // Then it is hours at 1 CE and most of a day at -3000. These are the
      // figures that make historical dates hard, and a model that returned
      // small numbers here would be silently useless.
      assertNumberBetween(deltaTFor(1).seconds / 3600, 2.5, 3.5);
      assertNumberBetween(deltaTFor(-1000).seconds / 3600, 6.5, 7.5);
      assertNumberBetween(deltaTFor(-3000).seconds / 3600, 19, 22);
    });
  });

  describe("basis", () => {
    it("calls the fitted range fitted, at both ends and inside", () => {
      // Given the first year of the spline, a year inside it, and the last.
      // When each is computed.
      // Then all three report a fitted value, because the spline is closed at
      // both ends.
      for (const year of [SPLINE_FROM_YEAR, 1000, SPLINE_TO_YEAR]) {
        assertIdentical(deltaTFor(year).basis, "fitted", String(year));
      }
    });

    it("extrapolates before the spline and projects after it", () => {
      // Given a year either side of the fitted range.
      // When each is computed.
      // Then the basis names which kind of answer it is. A caller weighing a
      // date in 200 BCE against one in 2200 needs to know that the first rests
      // on eclipse records and the second on nothing.
      assertIdentical(deltaTFor(SPLINE_FROM_YEAR - 1).basis, "extrapolated");
      assertIdentical(deltaTFor(SPLINE_TO_YEAR + 1).basis, "projected");
    });
  });

  describe("the seams", () => {
    it("does not step where one model hands over to the next", () => {
      // Given years a thousandth either side of each seam.
      // When ΔT is computed at both.
      // Then the values differ by a small fraction of a second. A step here
      // would be a step in every deciding instant, and could flip a date for
      // no reason but the join between two models.
      for (const seam of [SPLINE_FROM_YEAR, SPLINE_TO_YEAR]) {
        const before = deltaTFor(seam - 0.001).seconds;
        const after = deltaTFor(seam + 0.001).seconds;

        assertNumberBetween(
          Math.abs(after - before),
          0,
          0.1,
          `seam at ${String(seam)}`,
        );
      }
    });

    it("keeps the parabola's shape before the spline", () => {
      // Given two years before the fitted range.
      // When the difference between their ΔT values is compared with the same
      // difference under the paper's equation (4.1), computed here rather than
      // taken from the code under test.
      // Then they match. The extrapolation is anchored to meet the spline, and
      // anchoring must shift the curve without bending it.
      const measured = deltaTFor(-2000).seconds - deltaTFor(-1000).seconds;
      const expected = smh2016Parabola(-2000) - smh2016Parabola(-1000);

      assertNumberBetween(measured - expected, -0.01, 0.01);
    });

    it("never uses the long-term parabola for a modern year", () => {
      // Given 2026, which the parabola would put near -189 seconds.
      // When ΔT is computed.
      // Then it is near 70. Equation (4.1) is a fit across three millennia and
      // is badly wrong near its own apex, so reaching for it after 2016 would
      // wreck exactly the dates most callers ask about.
      assertNumberBetween(deltaTFor(2026).seconds, 60, 90);
    });
  });

  describe("uncertainty", () => {
    it("propagates the paper's stated error on the parabola coefficient", () => {
      // Given the ± 0.6 the paper quotes on its coefficient of 32.5.
      // When the uncertainty is computed for years far from the 1825 apex.
      // Then it matches that error carried through, recomputed here from the
      // published figure rather than read back from the code.
      for (const year of [1600, 0, -3000]) {
        assertNumberBetween(
          deltaTFor(year).uncertainty - smh2016Uncertainty(year),
          -0.01,
          0.01,
          `uncertainty ${String(year)}`,
        );
      }
    });

    it("stays small enough that deep history is not hopeless", () => {
      // Given the uncertainty at year 0 and at -720.
      // When it is read against E/1440 of dates on the wrong day.
      // Then under half a percent of dates are at risk. The raw ΔT of nearly
      // three hours at 1 CE makes antiquity look worse than it is, and this is
      // the distinction between the value and its uncertainty.
      for (const year of [0, SPLINE_FROM_YEAR]) {
        const atRisk = deltaTFor(year).uncertainty / 60 / 1440;
        assertTrue(atRisk < 0.005, `${String(year)}: ${String(atRisk)}`);
      }
    });

    it("grows with distance from the parabola's apex", () => {
      // Given years progressively further from 1825.
      // When their uncertainties are compared.
      // Then each is larger than the last. The apex is where the length of the
      // mean solar day matched the SI day, and confidence falls away from it in
      // both directions.
      const years = [1800, 1500, 1000, 0, -720, -2000];
      const uncertainties = years.map((year) => deltaTFor(year).uncertainty);

      for (const [index, value] of uncertainties.entries()) {
        if (index > 0) {
          assertTrue(
            value > (uncertainties[index - 1] ?? 0),
            `${String(years[index])} not more uncertain than ${String(years[index - 1])}`,
          );
        }
      }
    });
  });
});
