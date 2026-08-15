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

describe("the terms themselves", () => {
  it("has twenty-four of them", () => {
    assertArrayLength(SOLAR_TERMS, TERM_COUNT);
    assertIdentical(TERM_COUNT, 24);
  });

  it("starts at 立春 and ends at 大寒", () => {
    assertObjectMatches(SOLAR_TERMS[0], { name: "立春", longitude: 315 });
    assertObjectMatches(SOLAR_TERMS[23], { name: "大寒", longitude: 300 });
  });

  it("steps fifteen degrees at a time, all the way round", () => {
    for (const [index, term] of SOLAR_TERMS.entries()) {
      assertIdentical(term.longitude, (315 + index * 15) % 360);
      assertIdentical(term.index, index);
    }
  });

  it("has twelve 中气, exactly those at a multiple of thirty degrees", () => {
    assertArrayLength(MAJOR_TERMS, 12);
    for (const term of SOLAR_TERMS) {
      assertIdentical(term.isMajor, term.longitude % 30 === 0);
    }
  });

  it("puts the solstices and equinoxes where they belong", () => {
    // These four are the whole reason the longitudes are what they are, so a
    // slip anywhere in the table shows up here.
    assertObjectMatches(solarTermNamed("春分"), { longitude: 0 });
    assertObjectMatches(solarTermNamed("夏至"), { longitude: 90 });
    assertObjectMatches(solarTermNamed("秋分"), { longitude: 180 });
    assertObjectMatches(solarTermNamed("冬至"), { longitude: 270 });
  });

  it("gives every term a distinct longitude and a distinct name", () => {
    assertSetSize(new Set(SOLAR_TERMS.map((t) => t.longitude)), 24);
    assertSetSize(new Set(SOLAR_TERMS.map((t) => t.name)), 24);
  });
});

describe("solarTermNamed", () => {
  it("finds a term by its simplified name", () => {
    assertObjectMatches(solarTermNamed("惊蛰"), { index: 2, longitude: 345 });
  });

  it("finds the same term by its traditional name", () => {
    const simplified = solarTermNamed("惊蛰");
    const traditional = solarTermNamed("驚蟄");
    assertNonNullable(simplified);
    assertNonNullable(traditional);
    assertIdentical(traditional.index, simplified.index);
  });

  it("returns nothing for a name that is not a term", () => {
    assertUndefined(solarTermNamed("大暑天"));
    assertUndefined(solarTermNamed(""));
  });
});
