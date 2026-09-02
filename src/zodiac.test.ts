import {
  assertArrayLength,
  assertIdentical,
  assertInstanceOf,
  assertNonNullable,
  assertThrowsError,
  assertUndefined,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import { BRANCHES } from "./sexagenary.js";
import { ZODIAC, zodiacFor, zodiacNamed } from "./zodiac.js";

describe("the zodiac", () => {
  it("has one animal per Earthly Branch, in the same order", () => {
    // Given the twelve branches and the twelve animals.
    // When they are lined up.
    // Then each animal names the branch at its own index. The animals are a
    // naming of the branches rather than a cycle of their own, so any drift
    // between the two lists would be a bug in the table.
    assertArrayLength(ZODIAC, BRANCHES.length);

    for (const [index, animal] of ZODIAC.entries()) {
      assertIdentical(animal.index, index);
      assertIdentical(animal.branch, BRANCHES[index]);
    }
  });

  it("puts the rat at 子 and the pig at 亥", () => {
    // Given the two ends of the cycle.
    // When each branch is asked for its animal.
    // Then the traditional pairing comes back. These are the two everyone
    // knows, so an off-by-one anywhere in the table shows here.
    assertIdentical(zodiacFor("子").english, "rat");
    assertIdentical(zodiacFor("亥").english, "pig");
    assertIdentical(zodiacFor("午").name, "马");
  });

  it("carries both scripts, and they differ only where simplification did", () => {
    // Given the dragon and the ox.
    // When their two scripts are compared.
    // Then the dragon differs and the ox does not. An animal whose characters
    // were never simplified has the same string twice, which is the same
    // convention the solar terms use.
    assertIdentical(zodiacFor("辰").name, "龙");
    assertIdentical(zodiacFor("辰").traditional, "龍");
    assertIdentical(zodiacFor("丑").name, zodiacFor("丑").traditional);
  });

  describe("zodiacNamed", () => {
    it("finds an animal by either script or by English", () => {
      // Given the horse, whose name is written differently in each script.
      // When it is looked up three ways.
      // Then all three find it. A caller holding a name from a traditional
      // source should not have to convert it first.
      for (const name of ["马", "馬", "horse"]) {
        const animal = zodiacNamed(name);
        assertNonNullable(animal, name);
        assertIdentical(animal.branch, "午");
      }
    });

    it("matches English whatever the case", () => {
      // Given an English name typed with a capital.
      // When it is looked up.
      // Then it is found. Nobody types "Rat" the same way twice.
      assertIdentical(zodiacNamed("Rabbit")?.branch, "卯");
      assertIdentical(zodiacNamed("ROOSTER")?.branch, "酉");
    });

    it("returns nothing for a name that is not an animal", () => {
      // Given a word that is not one of the twelve.
      // When it is looked up.
      // Then nothing comes back, rather than a nearby guess.
      assertUndefined(zodiacNamed("dragonfly"));
      assertUndefined(zodiacNamed("甲"));
    });
  });

  describe("zodiacFor", () => {
    it("refuses something that is not a branch", () => {
      // Given a Heavenly Stem, which is the easiest thing to pass here by
      // mistake.
      // When an animal is asked for.
      // Then it refuses rather than returning the animal at some index the
      // stem happens to share.
      const error = assertThrowsError(() =>
        // @ts-expect-error 甲 is a Stem, and the point of the test is what
        // happens when the type is ignored.
        zodiacFor("甲"),
      );
      assertInstanceOf(error, RangeError);
    });
  });
});
