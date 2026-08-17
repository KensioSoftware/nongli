import {
  assertArrayLength,
  assertIdentical,
  assertInstanceOf,
  assertNonNullable,
  assertNumberBetween,
  assertStringIncludes,
  assertThrowsError,
  assertTrue,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import { solarTermInstant, solarTermsIn } from "./solar-term-times.js";
import { SOLAR_TERMS, solarTermNamed, TERM_COUNT } from "./solar-terms.js";

describe("when the solar terms happen", () => {
  /** A year in the middle of the well attested range, for the timing checks. */
  const YEAR = 2026;

  /** Any term will do for the tests that are about the year, not the term. */
  const [someTerm] = SOLAR_TERMS;

  describe("solarTermInstant", () => {
    it("puts 冬至 in December of the year asked for", () => {
      // Given the December solstice, at 270 degrees.
      // When its instant in 2026 is computed.
      // Then it lands in that December, between the 20th and the 23rd. Every
      // year of the modern era puts it in that window. A term computed a whole
      // cycle out falls outside it.
      const dongzhi = solarTermNamed("冬至");
      assertNonNullable(dongzhi);
      const utc = solarTermInstant(dongzhi, YEAR).toZonedDateTimeISO("UTC");
      assertIdentical(utc.year, YEAR);
      assertIdentical(utc.month, 12);
      assertNumberBetween(utc.day, 20, 23);
    });

    it("puts 春分 in March of the year asked for", () => {
      // Given the March equinox, at 0 degrees. The circle of longitudes is
      // measured from there.
      // When its instant in 2026 is computed.
      // Then it lands in that March. The 0 degree case is worth its own test
      // because a wrapping error shows up there first.
      const chunfen = solarTermNamed("春分");
      assertNonNullable(chunfen);
      const utc = solarTermInstant(chunfen, YEAR).toZonedDateTimeISO("UTC");
      assertIdentical(utc.year, YEAR);
      assertIdentical(utc.month, 3);
      assertNumberBetween(utc.day, 19, 21);
    });

    it("puts each solstice and equinox in the month it belongs to", () => {
      // Given the four terms whose months everybody already knows.
      // When each is computed.
      // Then it lands in the expected month. This checks the names in the table
      // are attached to the right longitudes. That half of the module is data,
      // and the astronomy cannot catch a mistake in it.
      const cases = [
        ["春分", 3],
        ["夏至", 6],
        ["秋分", 9],
        ["冬至", 12],
      ] as const;
      for (const [name, month] of cases) {
        const term = solarTermNamed(name);
        assertNonNullable(term);
        const utc = solarTermInstant(term, YEAR).toZonedDateTimeISO("UTC");
        assertIdentical(utc.month, month);
      }
    });

    it("refuses an ISO year that is not a whole number", () => {
      // Given years between the years, and two that are no year at all.
      // When a term is computed for each.
      // Then it refuses.
      assertNonNullable(someTerm);
      for (const bad of [2026.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        const error = assertThrowsError(() => solarTermInstant(someTerm, bad));
        assertInstanceOf(error, RangeError);
      }
    });

    it("refuses what JavaScript would coerce to an ISO year", () => {
      // Given values only a JavaScript caller can pass. Four of the six
      // coerce to a whole number in the arithmetic that follows. (`undefined`
      // and `{}` give NaN, which the same check refuses for its own reason.)
      // When a term is computed for each.
      // Then it refuses. Answering would mean answering for a year nobody
      // asked about.
      assertNonNullable(someTerm);
      for (const bad of [null, undefined, "", "2026", [], {}]) {
        const error = assertThrowsError(() =>
          solarTermInstant(someTerm, bad as number),
        );
        assertInstanceOf(error, RangeError);
      }
    });

    it("still answers twenty thousand years either side of now", () => {
      // Given years far outside anything with a calendar, in both directions.
      // When a term is computed for each.
      // Then it answers, and the answer lands in the year asked for. The design
      // refuses only where the ephemeris stops being defined, never where
      // confidence runs out. Pinning the reach records where that is.
      assertNonNullable(someTerm);
      for (const year of [-20_000, -10_000, 10_000, 20_000]) {
        assertIdentical(
          solarTermInstant(someTerm, year).toZonedDateTimeISO("UTC").year,
          year,
        );
      }
    });

    it("says so rather than guessing once the ephemeris runs out", () => {
      // Given years past where the underlying search converges, somewhere
      // between twenty and fifty thousand out.
      // When a term is computed for each.
      // Then it refuses and says why. Here the result is absent, not merely
      // imprecise. That is the one case where refusal is the honest answer.
      assertNonNullable(someTerm);
      for (const year of [-50_000, 50_000]) {
        const error = assertThrowsError(() => solarTermInstant(someTerm, year));
        assertInstanceOf(error, RangeError);
        assertStringIncludes(error.message, "does not reach");
      }
    });
  });

  describe("solarTermsIn", () => {
    it("finds all twenty-four in a year", () => {
      // Given a year.
      // When every term in it is computed.
      // Then there are twenty-four. Each longitude is reached once a year. A
      // full set is the only right answer whatever year it is.
      assertArrayLength(solarTermsIn(YEAR), TERM_COUNT);
    });

    it("returns them in chronological order", () => {
      // Given every term in a year, which the table orders from 立春 rather
      // than from January.
      // When the instants are read in the order returned.
      // Then each is later than the one before it.
      const terms = solarTermsIn(YEAR);
      for (let i = 1; i < terms.length; i++) {
        const previous = terms[i - 1];
        const current = terms[i];
        assertNonNullable(previous);
        assertNonNullable(current);
        assertTrue(
          Temporal.Instant.compare(previous.instant, current.instant) < 0,
        );
      }
    });

    it("keeps every term inside the year asked for", () => {
      // Given a year.
      // When every term in it is computed.
      // Then none has escaped into a neighbouring year. 冬至 at 270 degrees is
      // the one at risk, because it falls in the December at the far end.
      for (const { instant } of solarTermsIn(YEAR)) {
        assertIdentical(instant.toZonedDateTimeISO("UTC").year, YEAR);
      }
    });

    it("spaces them about fifteen days apart", () => {
      // Given every term in a year.
      // When the gaps between consecutive terms are measured.
      // Then each is a fortnight or so. The gaps are uneven. (The Earth's orbit
      // is elliptical. The Sun covers 15 degrees faster at some times of year.)
      // They stay within a couple of days of the mean.
      const terms = solarTermsIn(YEAR);
      for (let i = 1; i < terms.length; i++) {
        const previous = terms[i - 1];
        const current = terms[i];
        assertNonNullable(previous);
        assertNonNullable(current);
        const gap =
          (current.instant.epochMilliseconds -
            previous.instant.epochMilliseconds) /
          86_400_000;
        assertNumberBetween(gap, 13.5, 16.5);
      }
    });

    it("works in a year far outside the modern era", () => {
      // Given years well before and well after the well attested range.
      // When every term in each is computed.
      // Then a full set comes back. Historically meaningful is a separate
      // question from computable, and this is the second one.
      assertArrayLength(solarTermsIn(1000), TERM_COUNT);
      assertArrayLength(solarTermsIn(-500), TERM_COUNT);
      assertArrayLength(solarTermsIn(2500), TERM_COUNT);
    });

    it("does not fall into the two-digit year trap", () => {
      // Given years in the range JavaScript treats specially. `Date.UTC(36, 0,
      // 1)` is 1936, because years 0 to 99 map onto 1900 to 1999.
      // When every term in each is computed.
      // Then each lands in the year asked for. Building the year through `Date`
      // put a whole century of the range nineteen hundred years out, and
      // returned a complete, plausible looking set of terms while doing it.
      for (const year of [0, 36, 99]) {
        const terms = solarTermsIn(year);
        assertArrayLength(terms, TERM_COUNT);
        for (const { instant } of terms) {
          assertIdentical(instant.toZonedDateTimeISO("UTC").year, year);
        }
      }
    });

    it("keeps every term inside its year across the whole range", () => {
      // Given years sampled across four millennia, on a stride that lands on
      // years no round number would.
      // When every term in each is computed.
      // Then none escapes its year. This is the sweep that caught the century
      // bug above, kept as a regression test.
      for (let year = -1000; year <= 3000; year += 149) {
        for (const { term, instant } of solarTermsIn(year)) {
          assertIdentical(
            instant.toZonedDateTimeISO("UTC").year,
            year,
            `${term.name} escaped ${String(year)}`,
          );
        }
      }
    });
  });
});
