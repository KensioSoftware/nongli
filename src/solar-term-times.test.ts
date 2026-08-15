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

/** A year in the middle of the well-attested range, for the timing checks. */
const YEAR = 2026;

describe("solarTermInstant", () => {
  it("puts 冬至 in December of the year asked for", () => {
    const dongzhi = solarTermNamed("冬至");
    assertNonNullable(dongzhi);
    const instant = solarTermInstant(dongzhi, YEAR);
    const utc = instant.toZonedDateTimeISO("UTC");
    assertIdentical(utc.year, YEAR);
    assertIdentical(utc.month, 12);
    // Between the 20th and the 23rd in every year of the modern era.
    assertNumberBetween(utc.day, 20, 23);
  });

  it("puts 春分 in March of the year asked for", () => {
    const chunfen = solarTermNamed("春分");
    assertNonNullable(chunfen);
    const utc = solarTermInstant(chunfen, YEAR).toZonedDateTimeISO("UTC");
    assertIdentical(utc.year, YEAR);
    assertIdentical(utc.month, 3);
    assertNumberBetween(utc.day, 19, 21);
  });

  it("agrees with Temporal's own equinoxes and solstices", () => {
    // Not an independent check of the astronomy — it is a check that the
    // longitudes in the table are attached to the right names, which is the
    // part of this module that is data rather than computation.
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
    const term = SOLAR_TERMS[0];
    assertNonNullable(term);
    for (const bad of [2026.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const error = assertThrowsError(() => solarTermInstant(term, bad));
      assertInstanceOf(error, RangeError);
    }
  });

  it("refuses what JavaScript would coerce to an ISO year", () => {
    const term = SOLAR_TERMS[0];
    assertNonNullable(term);
    for (const bad of [null, undefined, "", "2026", [], {}]) {
      const error = assertThrowsError(() =>
        solarTermInstant(term, bad as number),
      );
      assertInstanceOf(error, RangeError);
    }
  });

  it("still answers twenty thousand years either side of now", () => {
    // The design refuses only where the ephemeris is undefined, never where
    // confidence merely runs out — so the range that matters is where the
    // arithmetic stops, not where the history does. It reaches far past any
    // date anyone will ask about.
    const term = SOLAR_TERMS[0];
    assertNonNullable(term);
    for (const year of [-20_000, -10_000, 10_000, 20_000]) {
      assertIdentical(
        solarTermInstant(term, year).toZonedDateTimeISO("UTC").year,
        year,
      );
    }
  });

  it("says so rather than guessing once the ephemeris runs out", () => {
    // Somewhere between twenty and fifty thousand years out the search stops
    // converging. That is the one place refusal is the honest answer: the
    // result is not imprecise, it does not exist.
    const term = SOLAR_TERMS[0];
    assertNonNullable(term);
    for (const year of [-50_000, 50_000]) {
      const error = assertThrowsError(() => solarTermInstant(term, year));
      assertInstanceOf(error, RangeError);
      assertStringIncludes(error.message, "does not reach");
    }
  });
});

describe("solarTermsIn", () => {
  it("finds all twenty-four in a year", () => {
    assertArrayLength(solarTermsIn(YEAR), TERM_COUNT);
  });

  it("returns them in chronological order", () => {
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
    for (const { instant } of solarTermsIn(YEAR)) {
      assertIdentical(instant.toZonedDateTimeISO("UTC").year, YEAR);
    }
  });

  it("spaces them about fifteen days apart", () => {
    // The Sun's speed along the ecliptic varies with the Earth's orbit, so the
    // gaps are not equal — but they stay within a couple of days of the mean,
    // which is enough to catch a term computed a whole cycle out.
    const terms = solarTermsIn(YEAR);
    for (let i = 1; i < terms.length; i++) {
      const previous = terms[i - 1];
      const current = terms[i];
      assertNonNullable(previous);
      assertNonNullable(current);
      const days =
        current.instant.epochMilliseconds - previous.instant.epochMilliseconds;
      const asDays = days / 86_400_000;
      assertNumberBetween(asDays, 13.5, 16.5);
    }
  });

  it("works in a year far outside the modern era", () => {
    // The design commits to answering as far as the astronomy reaches rather
    // than refusing, so a distant year has to produce a full set like any
    // other. What it does not have to be is historically meaningful.
    assertArrayLength(solarTermsIn(1000), TERM_COUNT);
    assertArrayLength(solarTermsIn(-500), TERM_COUNT);
    assertArrayLength(solarTermsIn(2500), TERM_COUNT);
  });

  it("does not fall into the two-digit year trap", () => {
    // `Date.UTC(36, 0, 1)` is 1936, not 36 — JavaScript maps years 0 to 99
    // onto 1900 to 1999. Building the year through `Date` rather than Temporal
    // put a whole century of the supported range nineteen hundred years out,
    // silently and with a full set of plausible-looking terms.
    for (const year of [0, 36, 99]) {
      const terms = solarTermsIn(year);
      assertArrayLength(terms, TERM_COUNT);
      for (const { instant } of terms) {
        assertIdentical(instant.toZonedDateTimeISO("UTC").year, year);
      }
    }
  });

  it("keeps every term inside its year across the whole range", () => {
    // The sweep that caught the century bug, kept as a regression test. Steps
    // through by a stride coprime with anything cyclical here, so it lands on
    // years no round number would.
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
