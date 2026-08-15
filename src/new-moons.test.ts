import {
  assertArrayLength,
  assertIdentical,
  assertInstanceOf,
  assertNonNullable,
  assertNumberBetween,
  assertThrowsError,
  assertTrue,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import { newMoonFrom, newMoonsBetween } from "./new-moons.js";

const at = (iso: string): Temporal.Instant => Temporal.Instant.from(iso);

/** The meridian the modern 农历 is computed against, as an offset. */
const CHINA = "+08:00";

const MS_PER_DAY = 86_400_000;

/** Midsummer of a given ISO year, for the range checks. */
const instantAtYear = (isoYear: number): Temporal.Instant =>
  Temporal.PlainDate.from({ year: isoYear, month: 6, day: 1 })
    .toZonedDateTime("UTC")
    .toInstant();

describe("newMoonFrom", () => {
  it("finds the new moon that opens 春节 2026", () => {
    // Chinese New Year 2026 falls on 17 February, so the new moon that starts
    // that month is on the 17th in China.
    const moon = newMoonFrom(at("2026-02-01T00:00:00Z"));
    const inChina = moon.toZonedDateTimeISO(CHINA);
    assertIdentical(inChina.toPlainDate().toString(), "2026-02-17");
  });

  it("returns a moon at or after the instant asked for, never before", () => {
    for (const start of [
      "2026-01-01T00:00:00Z",
      "2026-06-15T12:00:00Z",
      "1900-03-01T00:00:00Z",
    ]) {
      const from = at(start);
      assertTrue(Temporal.Instant.compare(newMoonFrom(from), from) >= 0);
    }
  });

  it("finds one within a synodic month, wherever it starts", () => {
    for (let day = 0; day < 40; day++) {
      const from = at("2026-01-01T00:00:00Z").add({ hours: day * 24 });
      const days =
        (newMoonFrom(from).epochMilliseconds - from.epochMilliseconds) /
        MS_PER_DAY;
      assertNumberBetween(days, 0, 30);
    }
  });

  it("reaches far outside the modern era", () => {
    for (const start of ["1000-06-01T00:00:00Z", "-000500-06-01T00:00:00Z"]) {
      const from = at(start);
      assertTrue(Temporal.Instant.compare(newMoonFrom(from), from) >= 0);
    }
  });

  it("reaches further back than the solar search does", () => {
    // The Moon search still answers at -50,000, where the Sun's has already
    // given up. Worth pinning: the two halves of the calendar do not have the
    // same reach, so whichever runs out first sets the limit for a date.
    const from = instantAtYear(-50_000);
    assertTrue(Temporal.Instant.compare(newMoonFrom(from), from) >= 0);
  });

  it("says so rather than guessing once the ephemeris runs out", () => {
    const error = assertThrowsError(() => newMoonFrom(instantAtYear(50_000)));
    assertInstanceOf(error, RangeError);
  });
});

describe("newMoonsBetween", () => {
  it("finds thirteen or fourteen in a Gregorian year", () => {
    // Twelve synodic months are about eleven days short of a year, so a year
    // holds twelve or thirteen — and a fourteenth only if the first lands in
    // the opening hours of January.
    for (const year of [2024, 2025, 2026, 2033]) {
      const from = at(`${String(year)}-01-01T00:00:00Z`);
      const to = at(`${String(year + 1)}-01-01T00:00:00Z`);
      assertNumberBetween(newMoonsBetween(from, to).length, 12, 14);
    }
  });

  it("returns them in order, spaced by a synodic month", () => {
    const moons = newMoonsBetween(
      at("2026-01-01T00:00:00Z"),
      at("2027-01-01T00:00:00Z"),
    );
    for (let i = 1; i < moons.length; i++) {
      const previous = moons[i - 1];
      const current = moons[i];
      assertNonNullable(previous);
      assertNonNullable(current);
      const gap =
        (current.epochMilliseconds - previous.epochMilliseconds) / MS_PER_DAY;
      assertNumberBetween(gap, 29.2, 29.9);
    }
  });

  it("is half open at both ends", () => {
    const moon = newMoonFrom(at("2026-02-01T00:00:00Z"));

    // Starting exactly on a new moon includes it.
    const including = newMoonsBetween(moon, moon.add({ hours: 24 }));
    assertArrayLength(including, 1);

    // Ending exactly on one excludes it.
    const excluding = newMoonsBetween(moon.subtract({ hours: 24 }), moon);
    assertArrayLength(excluding, 0);
  });

  it("tiles without gaps or duplicates across a boundary", () => {
    // The property half-open ranges exist for: splitting a span anywhere gives
    // back exactly the moons of the whole span, each once.
    const from = at("2020-01-01T00:00:00Z");
    const split = at("2023-07-01T00:00:00Z");
    const to = at("2027-01-01T00:00:00Z");

    const whole = newMoonsBetween(from, to).map((m) => m.toString());
    const halves = [
      ...newMoonsBetween(from, split),
      ...newMoonsBetween(split, to),
    ].map((m) => m.toString());

    assertIdentical(halves.join("|"), whole.join("|"));
  });

  it("returns nothing for an empty or reversed span", () => {
    const instant = at("2026-06-01T00:00:00Z");
    assertArrayLength(newMoonsBetween(instant, instant), 0);
    assertArrayLength(
      newMoonsBetween(instant, instant.subtract({ hours: 24 * 60 })),
      0,
    );
  });

  it("agrees with ICU on where months begin", () => {
    // The strongest check available without any of nongli's own calendar code.
    // A lunar month begins on the day containing the new moon, so bucketing
    // these instants into civil days at the modern meridian should land exactly
    // on the days Temporal's Chinese calendar calls day 1.
    //
    // Not expected to be perfect: spike 2 measured five disagreements with ICU
    // across 1900-2100, all of them new moons within six minutes of midnight.
    // Over this shorter span there should be none.
    const from = at("2000-01-01T00:00:00Z");
    const to = at("2040-01-01T00:00:00Z");

    let checked = 0;
    for (const moon of newMoonsBetween(from, to)) {
      const day = moon.toZonedDateTimeISO(CHINA).toPlainDate();
      assertIdentical(
        day.withCalendar("chinese").day,
        1,
        `${day.toString()} should be the first of a Chinese month`,
      );
      checked++;
    }
    assertNumberBetween(checked, 480, 510);
  });
});
