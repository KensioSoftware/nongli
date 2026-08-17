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

import {
  at,
  CHINA,
  midsummerOf,
  moonsFrom,
  MS_PER_DAY,
} from "#test/instants.js";

import { newMoonFrom, newMoonsBetween } from "./new-moons.js";

describe("new moons", () => {
  /** Eras spread widely enough that an era-specific fault shows up. */
  const ERAS = [
    "1000-06-01T00:00:00Z",
    "1900-06-01T00:00:00Z",
    "1969-06-01T00:00:00Z",
    "2026-06-01T00:00:00Z",
  ];

  describe("newMoonFrom", () => {
    it("finds the conjunction that opens 春节 2026", () => {
      // Given the start of February 2026, before that month's conjunction.
      // When the next new moon is found and read at the China meridian.
      // Then it falls on 17 February. That is Chinese New Year 2026, a date
      // published independently of anything computed here.
      const moon = newMoonFrom(at("2026-02-01T00:00:00Z"));
      assertIdentical(
        moon.toZonedDateTimeISO(CHINA).toPlainDate().toString(),
        "2026-02-17",
      );
    });

    it("agrees with the runtime's own Chinese calendar on the day", () => {
      // Given the same conjunction.
      // When the day containing it is asked of ICU through Temporal.
      // Then ICU calls it the first of a month. This is the assertion above
      // checked against something that computed it a different way.
      const moon = newMoonFrom(at("2026-02-01T00:00:00Z"));
      const day = moon.toZonedDateTimeISO(CHINA).toPlainDate();
      assertIdentical(day.withCalendar("chinese").day, 1);
    });

    it("returns a moon at or after the instant asked for", () => {
      // Given instants scattered through a month and across eras.
      // When the next new moon is found from each.
      // Then it never precedes the instant asked for.
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
      // Given every starting day across a forty day stretch, so some fall just
      // before a conjunction and some just after.
      // When the next new moon is found from each.
      // Then it is at most a synodic month away. A search that skipped one
      // would show up as a gap of nearly sixty days.
      for (let day = 0; day < 40; day++) {
        const from = at("2026-01-01T00:00:00Z").add({ hours: day * 24 });
        const days =
          (newMoonFrom(from).epochMilliseconds - from.epochMilliseconds) /
          MS_PER_DAY;
        assertNumberBetween(days, 0, 30);
      }
    });

    it("returns the same moon when asked from that moon", () => {
      // Given a conjunction this module itself returned, at every moon across
      // four eras.
      // When the next new moon is found from it.
      // Then it is that same conjunction, to within a second. Without the
      // boundary tolerance this skipped a month for 133 of 240 moons, because
      // the search lands a few milliseconds either side depending on where it
      // started. Exact equality is not a property the ephemeris offers.
      for (const era of ERAS) {
        for (const moon of moonsFrom(era, 15)) {
          const again = newMoonFrom(moon);
          const apart = Math.abs(
            again.epochMilliseconds - moon.epochMilliseconds,
          );
          assertNumberBetween(
            apart,
            0,
            1000,
            `newMoonFrom skipped ${moon.toString()}, landing ${String(apart)} ms away`,
          );
        }
      }
    });

    it("still moves on when asked from just after a moon", () => {
      // Given an instant five seconds past a conjunction, outside the boundary
      // tolerance.
      // When the next new moon is found.
      // Then it is the following one, a synodic month later. The tolerance must
      // not reach so far back that it returns a moon already past.
      const moon = newMoonFrom(at("2026-02-01T00:00:00Z"));
      const next = newMoonFrom(moon.add({ seconds: 5 }));
      assertTrue(Temporal.Instant.compare(next, moon) > 0);
      const gap =
        (next.epochMilliseconds - moon.epochMilliseconds) / MS_PER_DAY;
      assertNumberBetween(gap, 29.2, 29.9);
    });

    it("reaches further back than the solar search does", () => {
      // Given a year fifty thousand before now.
      // When the next new moon is found.
      // Then it answers, where the solar term search has already given up. The
      // two halves of the calendar have different reach, and whichever runs out
      // first sets the limit for a date.
      const from = midsummerOf(-50_000);
      assertTrue(Temporal.Instant.compare(newMoonFrom(from), from) >= 0);
    });

    it("says so rather than guessing once the ephemeris runs out", () => {
      // Given a year fifty thousand ahead, past where the search converges.
      // When the next new moon is found.
      // Then it refuses.
      const error = assertThrowsError(() => newMoonFrom(midsummerOf(50_000)));
      assertInstanceOf(error, RangeError);
    });
  });

  describe("newMoonsBetween", () => {
    it("finds twelve or thirteen in a Gregorian year", () => {
      // Given each of several Gregorian years, including 2033 (which carries a
      // leap month).
      // When the new moons in each are enumerated.
      // Then there are twelve or thirteen. Twelve synodic months fall about
      // eleven days short of a year. Some years fit a thirteenth.
      for (const year of [2024, 2025, 2026, 2033]) {
        const from = at(`${String(year)}-01-01T00:00:00Z`);
        const to = at(`${String(year + 1)}-01-01T00:00:00Z`);
        assertNumberBetween(newMoonsBetween(from, to).length, 12, 13);
      }
    });

    it("returns them in order, spaced by a synodic month", () => {
      // Given the new moons of a year.
      // When consecutive gaps are measured.
      // Then each is between 29.2 and 29.9 days. The spread is real (both
      // orbits are elliptical) and it is why lunar months run 29 or 30 days.
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

    it("includes a moon at the start of the span, at every moon in four eras", () => {
      // Given a span beginning exactly on a conjunction, tried at every moon
      // across four eras.
      // When the span is enumerated.
      // Then the moon at the start is in it. Written for one moon this passed
      // while more than half of all moons were being dropped, because the
      // property fails on roughly a coin toss.
      for (const era of ERAS) {
        for (const moon of moonsFrom(era, 15)) {
          assertArrayLength(
            newMoonsBetween(moon, moon.add({ hours: 24 })),
            1,
            `${moon.toString()} should be included as an inclusive start`,
          );
        }
      }
    });

    it("excludes a moon at the end of the span, at every moon in four eras", () => {
      // Given a span ending exactly on a conjunction, tried at every moon
      // across four eras.
      // When the span is enumerated.
      // Then the moon at the end is left out. Half open at both ends is what
      // lets consecutive spans tile.
      for (const era of ERAS) {
        for (const moon of moonsFrom(era, 15)) {
          assertArrayLength(
            newMoonsBetween(moon.subtract({ hours: 24 }), moon),
            0,
            `${moon.toString()} should be excluded as an exclusive end`,
          );
        }
      }
    });

    it("tiles without gaps or duplicates across a boundary", () => {
      // Given a seven year span and an arbitrary point inside it.
      // When the whole span is enumerated, and then the two halves separately.
      // Then the halves reassemble into the whole, each moon once. These become
      // month boundaries, and a duplicated or dropped one shifts every month
      // after it.
      const from = at("2020-01-01T00:00:00Z");
      const split = at("2023-07-01T00:00:00Z");
      const to = at("2027-01-01T00:00:00Z");

      const whole = newMoonsBetween(from, to).map((moon) => moon.toString());
      const halves = [
        ...newMoonsBetween(from, split),
        ...newMoonsBetween(split, to),
      ].map((moon) => moon.toString());

      assertIdentical(halves.join("|"), whole.join("|"));
    });

    it("returns nothing for an empty or reversed span", () => {
      // Given a span of no width, and one that runs backwards.
      // When each is enumerated.
      // Then both come back empty. A reversed span has an obvious empty answer,
      // so it needs no error.
      const instant = at("2026-06-01T00:00:00Z");
      assertArrayLength(newMoonsBetween(instant, instant), 0);
      assertArrayLength(
        newMoonsBetween(instant, instant.subtract({ hours: 24 * 60 })),
        0,
      );
    });

    it("agrees with the runtime's own Chinese calendar on where months begin", () => {
      // Given every new moon over forty years.
      // When the day containing each is asked of ICU through Temporal.
      // Then ICU calls every one of them the first of a month. This is the
      // strongest check available without any of nongli's own calendar code,
      // because ICU computed the same boundaries from a different
      // implementation.
      //
      // Perfect agreement is not guaranteed everywhere. Spike 2 found five
      // disagreements across 1900 to 2100, all at conjunctions within six
      // minutes of midnight. This shorter span contains none of them.
      const moons = newMoonsBetween(
        at("2000-01-01T00:00:00Z"),
        at("2040-01-01T00:00:00Z"),
      );
      for (const moon of moons) {
        const day = moon.toZonedDateTimeISO(CHINA).toPlainDate();
        assertIdentical(
          day.withCalendar("chinese").day,
          1,
          `${day.toString()} should be the first of a Chinese month`,
        );
      }
      assertNumberBetween(moons.length, 480, 510);
    });
  });
});
