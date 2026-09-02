import { assertIdentical, assertTrue } from "@kensio/smartass";
import { describe, it } from "vitest";

import { on, randomDates } from "#test/calendar.js";

import { BEIJING_LOCAL, VIETNAM_STANDARD } from "./place.js";
import { sexagenaryYearOf, zodiacOf } from "./sexagenary-dates.js";

describe("the sexagenary year of a date", () => {
  /**
   * Years whose 干支 name is published everywhere.
   *
   * 1900 is here for two reasons. It is 庚子, the year the 庚子事变 is named
   * after, so the pairing is a matter of historical record rather than
   * arithmetic. And it is 84 years before the 1984 anchor, which is what
   * exercises the wrap for a negative offset.
   */
  const PUBLISHED: readonly (readonly [number, string, string])[] = [
    [1900, "庚子", "rat"],
    [1984, "甲子", "rat"],
    [2023, "癸卯", "rabbit"],
    [2024, "甲辰", "dragon"],
    [2026, "丙午", "horse"],
  ];

  it("names years whose 干支 is a matter of record", () => {
    // Given years everyone publishes a name for, read in the middle of the
    // year so no boundary convention is in play.
    // When each is asked of the library.
    // Then the published name comes back, with its animal.
    for (const [year, expected, animal] of PUBLISHED) {
      const date = Temporal.PlainDate.from({ year, month: 6, day: 15 });
      const { stem, branch } = sexagenaryYearOf(date);

      assertIdentical(stem + branch, expected, String(year));
      assertIdentical(zodiacOf(date).english, animal, String(year));
    }
  });

  it("wraps rather than going negative before the anchor", () => {
    // Given dates centuries before 1984.
    // When each is converted.
    // Then the index is a real position in the cycle. A single modulo would
    // give a negative here, and the cycle has no negative positions.
    for (const date of randomDates(1700, 1900, 40)) {
      const index = sexagenaryYearOf(date).index;
      assertTrue(
        Number.isInteger(index) && index >= 0 && index < 60,
        `${date.toString()} gave ${String(index)}`,
      );
    }
  });

  it("advances by exactly one a year, and comes back after sixty", () => {
    // Given a run of consecutive years, read at midsummer.
    // When their indices are compared.
    // Then each is one past the last, and the sixtieth is the first again.
    // The cycle is a count, and a gap or a repeat would mean the year
    // numbering underneath it had slipped.
    const first = sexagenaryYearOf(on("1950-06-15")).index;

    for (let offset = 1; offset <= 60; offset++) {
      const date = Temporal.PlainDate.from({
        year: 1950 + offset,
        month: 6,
        day: 15,
      });

      assertIdentical(
        sexagenaryYearOf(date).index,
        (first + offset) % 60,
        String(1950 + offset),
      );
    }
  });

  describe("where the year turns", () => {
    /**
     * 2024 is the clearest recent case. 立春 fell on 4 February and New Year on
     * the 10th, so the six days between them have two defensible answers.
     */
    const BETWEEN = on("2024-02-06");

    it("defaults to the calendar's own boundary, the New Year", () => {
      // Given a date after 立春 but before New Year.
      // When it is converted with nothing said about the boundary.
      // Then it is still the old year. That is what the calendar does and what
      // the Observatory prints, and the conformance suite checks the default
      // against 2,192 of its dates.
      assertIdentical(sexagenaryYearOf(BETWEEN).stem, "癸");
      assertIdentical(sexagenaryYearOf(BETWEEN).branch, "卯");
      assertIdentical(zodiacOf(BETWEEN).english, "rabbit");
    });

    it("turns at 立春 when asked to", () => {
      // Given the same date.
      // When the 四柱 boundary is asked for.
      // Then the year has already turned. Someone born on this day has two
      // defensible animals, and the library's job is to name both rather than
      // to pick.
      const claim = sexagenaryYearOf(BETWEEN, { boundary: "lichun" });

      assertIdentical(claim.stem, "甲");
      assertIdentical(claim.branch, "辰");
      assertIdentical(
        zodiacOf(BETWEEN, { boundary: "lichun" }).english,
        "dragon",
      );
    });

    it("agrees with itself away from the gap", () => {
      // Given dates before both boundaries and after both.
      // When each is read under both conventions.
      // Then they agree. The two only ever differ between 立春 and New Year,
      // and a difference anywhere else would mean one of them is wrong.
      for (const iso of ["2024-01-15", "2024-03-01", "2024-08-01"]) {
        const date = on(iso);
        assertIdentical(
          sexagenaryYearOf(date).index,
          sexagenaryYearOf(date, { boundary: "lichun" }).index,
          iso,
        );
      }
    });
  });

  describe("place", () => {
    it("reads the year at the meridian it is given", () => {
      // Given 1985-01-21, the day Vietnam and China were in different lunar
      // months.
      // When the year is read at each meridian.
      // Then Vietnam has already turned and China has not. The 干支 year
      // follows the calendar, and the calendar follows the meridian.
      const date = on("1985-01-21");

      assertIdentical(
        sexagenaryYearOf(date).stem + sexagenaryYearOf(date).branch,
        "甲子",
      );
      const vietnam = sexagenaryYearOf(date, { place: VIETNAM_STANDARD });
      assertIdentical(vietnam.stem + vietnam.branch, "乙丑");
    });

    it("accepts a historical meridian", () => {
      // Given a pre-1928 date at Beijing's own meridian.
      // When the year is read.
      // Then it answers. The option is the same one the conversions take, so
      // anything the calendar supports this supports too.
      assertIdentical(
        sexagenaryYearOf(on("1900-06-15"), { place: BEIJING_LOCAL }).stem +
          sexagenaryYearOf(on("1900-06-15"), { place: BEIJING_LOCAL }).branch,
        "庚子",
      );
    });
  });
});
