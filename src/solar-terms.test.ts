import {
  assertArrayLength,
  assertIdentical,
  assertNonNullable,
  assertObjectMatches,
  assertSetSize,
  assertUndefined,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import {
  MAJOR_TERMS,
  SOLAR_TERMS,
  solarTermNamed,
  TERM_COUNT,
} from "./solar-terms.js";

describe("the twenty-four solar terms", () => {
  describe("the table", () => {
    it("has twenty-four of them", () => {
      // Given the table of terms.
      // When its length is read.
      // Then there are twenty-four, one for each 15 degrees of the circle.
      assertArrayLength(SOLAR_TERMS, TERM_COUNT);
      assertIdentical(TERM_COUNT, 24);
    });

    it("starts at 立春 and ends at 大寒", () => {
      // Given the table, ordered the way tradition orders it.
      // When the first and last entries are read.
      // Then the cycle opens at 立春, on 315 degrees. (Tradition starts the
      // listing there. The circle of longitudes is measured from 0.)
      assertObjectMatches(SOLAR_TERMS[0], { name: "立春", longitude: 315 });
      assertObjectMatches(SOLAR_TERMS[23], { name: "大寒", longitude: 300 });
    });

    it("steps fifteen degrees at a time, all the way round", () => {
      // Given every entry in the table.
      // When its longitude and index are read.
      // Then each sits 15 degrees past the last, wrapping through 360. A term
      // inserted or dropped anywhere shifts every entry after it.
      for (const [index, term] of SOLAR_TERMS.entries()) {
        assertIdentical(term.longitude, (315 + index * 15) % 360);
        assertIdentical(term.index, index);
      }
    });

    it("has twelve 中气, exactly those at a multiple of thirty degrees", () => {
      // Given every entry in the table.
      // When the major flag is compared against the longitude.
      // Then the twelve 中气 are precisely those on a 30 degree multiple. The
      // leap month rule reads this flag. A term wrongly marked moves a leap
      // month.
      assertArrayLength(MAJOR_TERMS, 12);
      for (const term of SOLAR_TERMS) {
        assertIdentical(term.isMajor, term.longitude % 30 === 0);
      }
    });

    it("puts the solstices and equinoxes where they belong", () => {
      // Given the four terms that are also astronomical events with fixed
      // longitudes, known independently of this table.
      // When each is looked up by name.
      // Then its longitude matches the definition. These four anchor the whole
      // table, and a slip anywhere in it shows up in at least one of them.
      assertObjectMatches(solarTermNamed("春分"), { longitude: 0 });
      assertObjectMatches(solarTermNamed("夏至"), { longitude: 90 });
      assertObjectMatches(solarTermNamed("秋分"), { longitude: 180 });
      assertObjectMatches(solarTermNamed("冬至"), { longitude: 270 });
    });

    it("gives every term a distinct longitude and a distinct name", () => {
      // Given every entry in the table.
      // When longitudes and names are collected.
      // Then none repeats. A copy-paste slip in a twenty-four line table is
      // easy to make and hard to see by eye.
      assertSetSize(new Set(SOLAR_TERMS.map((term) => term.longitude)), 24);
      assertSetSize(new Set(SOLAR_TERMS.map((term) => term.name)), 24);
    });
  });

  describe("solarTermNamed", () => {
    it("finds a term by its simplified name", () => {
      // Given a term written in simplified Chinese.
      // When it is looked up.
      // Then the entry comes back with its position and longitude.
      assertObjectMatches(solarTermNamed("惊蛰"), { index: 2, longitude: 345 });
    });

    it("finds the same term by its traditional name", () => {
      // Given one of the five terms whose two written forms differ.
      // When it is looked up under each form.
      // Then both reach the same entry. A reader working from a traditional
      // text should get the same answer as one working from a simplified text.
      const simplified = solarTermNamed("惊蛰");
      const traditional = solarTermNamed("驚蟄");
      assertNonNullable(simplified);
      assertNonNullable(traditional);
      assertIdentical(traditional.index, simplified.index);
    });

    it("returns nothing for a name that is not a term", () => {
      // Given a plausible near miss (大暑天 contains a real term) and an empty
      // string.
      // When each is looked up.
      // Then the lookup reports absence.
      assertUndefined(solarTermNamed("大暑天"));
      assertUndefined(solarTermNamed(""));
    });
  });
});
