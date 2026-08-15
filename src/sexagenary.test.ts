import {
  assertArrayLength,
  assertIdentical,
  assertInstanceOf,
  assertNonNullable,
  assertObjectMatches,
  assertSetSize,
  assertThrowsError,
  assertTrue,
  assertUndefined,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import type { Branch, Stem } from "./sexagenary.js";
import {
  BRANCHES,
  CYCLE_LENGTH,
  sexagenary,
  sexagenaryOf,
  STEMS,
} from "./sexagenary.js";

/** Every position in the cycle, which most of the properties below hold across. */
const positions = Array.from({ length: CYCLE_LENGTH }, (_, index) => index);

describe("the rings", () => {
  it("has ten stems and twelve branches", () => {
    assertArrayLength(STEMS, 10);
    assertArrayLength(BRANCHES, 12);
  });

  it("meets again after sixty", () => {
    assertIdentical(CYCLE_LENGTH, 60);
  });
});

describe("sexagenary", () => {
  it("starts at 甲子 and ends at 癸亥", () => {
    assertObjectMatches(sexagenary(0), { index: 0, stem: "甲", branch: "子" });
    assertObjectMatches(sexagenary(59), {
      index: 59,
      stem: "癸",
      branch: "亥",
    });
  });

  it("turns both rings together", () => {
    assertObjectMatches(sexagenary(1), { stem: "乙", branch: "丑" });
    assertObjectMatches(sexagenary(2), { stem: "丙", branch: "寅" });
  });

  it("wraps forwards", () => {
    assertObjectMatches(sexagenary(CYCLE_LENGTH), {
      index: 0,
      stem: "甲",
      branch: "子",
    });
    assertObjectMatches(sexagenary(CYCLE_LENGTH * 3 + 7), { index: 7 });
  });

  it("wraps backwards", () => {
    // The reason the reduction cannot be a bare `%`, which keeps its operand's
    // sign in JavaScript.
    assertObjectMatches(sexagenary(-1), {
      index: 59,
      stem: "癸",
      branch: "亥",
    });
    assertObjectMatches(sexagenary(-CYCLE_LENGTH), { index: 0 });
  });

  it("repeats each stem every ten and each branch every twelve", () => {
    for (const position of positions) {
      const term = sexagenary(position);
      assertIdentical(term.stem, STEMS[position % STEMS.length]);
      assertIdentical(term.branch, BRANCHES[position % BRANCHES.length]);
    }
  });

  it("gives sixty distinct pairings", () => {
    const seen = new Set(
      positions.map((position) => {
        const term = sexagenary(position);
        return term.stem + term.branch;
      }),
    );
    assertSetSize(seen, CYCLE_LENGTH);
  });

  it("refuses an index that is not a whole number", () => {
    for (const bad of [2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const error = assertThrowsError(() => sexagenary(bad));
      assertInstanceOf(error, RangeError);
    }
  });

  it("refuses what JavaScript would quietly coerce to a position", () => {
    // Only reachable from JavaScript, which is half of what this package ships
    // to. Every one of these coerces to a whole number through `%` — `null`,
    // `""`, `[]` and `false` to 0, and the rest to a real position — so without
    // the guard they come back as confident, wrong terms rather than errors.
    for (const bad of [null, undefined, "", "5", [], [3], false, {}]) {
      const error = assertThrowsError(() => sexagenary(bad as number));
      assertInstanceOf(error, RangeError);
    }
  });
});

describe("sexagenaryOf", () => {
  it("round trips every term of the cycle", () => {
    for (const position of positions) {
      const term = sexagenary(position);
      const found = sexagenaryOf(term.stem, term.branch);
      assertNonNullable(found);
      assertIdentical(found.index, position);
    }
  });

  it("finds a term whose rings have turned different numbers of times", () => {
    // 甲 is at 0 and 寅 at 2, so this one is fifty places along rather than two.
    const found = sexagenaryOf("甲", "寅");
    assertNonNullable(found);
    assertIdentical(found.index, 50);
  });

  it("returns nothing for a pairing that never occurs", () => {
    // An even stem with an odd branch. Half of the hundred and twenty possible
    // pairings are like this and none of them is a term.
    assertUndefined(sexagenaryOf("甲", "丑"));
    assertUndefined(sexagenaryOf("癸", "子"));
  });

  it("returns nothing for a stem or branch that is not one", () => {
    // Only reachable from JavaScript, which is half of what this package
    // ships to.
    assertUndefined(sexagenaryOf("x" as Stem, "子"));
    assertUndefined(sexagenaryOf("甲", "x" as Branch));
  });

  it("agrees with the ring parity rule on every possible pairing", () => {
    for (const [stemIndex, stem] of STEMS.entries()) {
      for (const [branchIndex, branch] of BRANCHES.entries()) {
        const exists = sexagenaryOf(stem, branch) !== undefined;
        assertTrue(exists === (stemIndex % 2 === branchIndex % 2));
      }
    }
  });
});
