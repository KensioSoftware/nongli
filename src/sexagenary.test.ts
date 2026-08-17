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

describe("the sexagenary cycle", () => {
  /** Every position in the cycle. Most of the properties below hold across all of them. */
  const positions = Array.from({ length: CYCLE_LENGTH }, (_, index) => index);

  describe("the rings", () => {
    it("has ten stems and twelve branches", () => {
      // Given the two rings the cycle is built from.
      // When their sizes are read.
      // Then they are ten and twelve. Sixty is the lowest common multiple.
      assertArrayLength(STEMS, 10);
      assertArrayLength(BRANCHES, 12);
    });

    it("meets again after sixty", () => {
      // Given rings of ten and twelve, which share a factor of two.
      // When the length of the combined cycle is read.
      // Then it is sixty. Coprime rings would have given a hundred and twenty.
      assertIdentical(CYCLE_LENGTH, 60);
    });
  });

  describe("sexagenary", () => {
    it("starts at 甲子 and ends at 癸亥", () => {
      // Given the first and last positions of the cycle.
      // When each is looked up.
      // Then they are the two terms every table of the cycle opens and closes with.
      assertObjectMatches(sexagenary(0), {
        index: 0,
        stem: "甲",
        branch: "子",
      });
      assertObjectMatches(sexagenary(59), {
        index: 59,
        stem: "癸",
        branch: "亥",
      });
    });

    it("turns both rings together", () => {
      // Given the two positions after the start.
      // When each is looked up.
      // Then both rings have advanced by one, not just the stem.
      assertObjectMatches(sexagenary(1), { stem: "乙", branch: "丑" });
      assertObjectMatches(sexagenary(2), { stem: "丙", branch: "寅" });
    });

    it("wraps forwards", () => {
      // Given positions past the end of one turn of the cycle.
      // When each is looked up.
      // Then it comes back round, and sixty lands on the start again.
      assertObjectMatches(sexagenary(CYCLE_LENGTH), {
        index: 0,
        stem: "甲",
        branch: "子",
      });
      assertObjectMatches(sexagenary(CYCLE_LENGTH * 3 + 7), { index: 7 });
    });

    it("wraps backwards", () => {
      // Given a position before the start of the cycle.
      // When it is looked up.
      // Then it comes back round from the far end. (A bare `%` would have
      // returned -1 here, because it keeps the sign of its operand in
      // JavaScript.)
      assertObjectMatches(sexagenary(-1), {
        index: 59,
        stem: "癸",
        branch: "亥",
      });
      assertObjectMatches(sexagenary(-CYCLE_LENGTH), { index: 0 });
    });

    it("repeats each stem every ten and each branch every twelve", () => {
      // Given every position in the cycle.
      // When the stem and branch at each are compared to the rings directly.
      // Then each ring has turned at its own rate throughout. An off-by-one in
      // either would show up somewhere in the sixty even if the ends looked right.
      for (const position of positions) {
        const term = sexagenary(position);
        assertIdentical(term.stem, STEMS[position % STEMS.length]);
        assertIdentical(term.branch, BRANCHES[position % BRANCHES.length]);
      }
    });

    it("gives sixty distinct pairings", () => {
      // Given every position in the cycle.
      // When the pairings are collected.
      // Then no two positions share one. A repeat would mean the cycle closed early.
      const seen = new Set(
        positions.map((position) => {
          const term = sexagenary(position);
          return term.stem + term.branch;
        }),
      );
      assertSetSize(seen, CYCLE_LENGTH);
    });

    it("refuses an index that is not a whole number", () => {
      // Given positions between the terms, and two that are no position at all.
      // When each is looked up.
      // Then the lookup refuses. There is no term two and a half places along,
      // and rounding to one would be a confident wrong answer.
      for (const bad of [2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        const error = assertThrowsError(() => sexagenary(bad));
        assertInstanceOf(error, RangeError);
      }
    });

    it("refuses what JavaScript would quietly coerce to a position", () => {
      // Given values only a JavaScript caller can pass, half of what this
      // package ships to. Each coerces to a whole number through `%`: `null`,
      // `""`, `[]` and `false` land on 0, the rest on a real position.
      // When each is looked up.
      // Then the lookup refuses. Without the guard they came back as 甲子 and
      // other terms that were never asked for.
      for (const bad of [null, undefined, "", "5", [], [3], false, {}]) {
        const error = assertThrowsError(() => sexagenary(bad as number));
        assertInstanceOf(error, RangeError);
      }
    });
  });

  describe("sexagenaryOf", () => {
    it("round trips every term of the cycle", () => {
      // Given every term, taken from the cycle itself.
      // When each is looked up by its stem and branch.
      // Then the position comes back. The two directions agree across all sixty.
      for (const position of positions) {
        const term = sexagenary(position);
        const found = sexagenaryOf(term.stem, term.branch);
        assertNonNullable(found);
        assertIdentical(found.index, position);
      }
    });

    it("finds a term whose rings have turned different numbers of times", () => {
      // Given 甲 at position 0 on its ring and 寅 at position 2 on its.
      // When the pairing is looked up.
      // Then it is fifty places along. A naive implementation returns two,
      // because it reads the branch offset and stops there.
      const found = sexagenaryOf("甲", "寅");
      assertNonNullable(found);
      assertIdentical(found.index, 50);
    });

    it("returns nothing for a pairing that never occurs", () => {
      // Given an even stem with an odd branch, and an odd stem with an even one.
      // When each pairing is looked up.
      // Then neither exists. Half of the hundred and twenty possible pairings
      // are like this.
      assertUndefined(sexagenaryOf("甲", "丑"));
      assertUndefined(sexagenaryOf("癸", "子"));
    });

    it("returns nothing for a stem or branch that is not one", () => {
      // Given a character from neither ring, passed the way a JavaScript caller
      // could pass it.
      // When the pairing is looked up.
      // Then the lookup reports absence.
      assertUndefined(sexagenaryOf("x" as Stem, "子"));
      assertUndefined(sexagenaryOf("甲", "x" as Branch));
    });

    it("agrees with the ring parity rule on every possible pairing", () => {
      // Given all hundred and twenty pairings of a stem with a branch.
      // When each is looked up.
      // Then it exists exactly when the two positions share a parity. This is
      // the rule that makes the cycle sixty long, asserted directly.
      for (const [stemIndex, stem] of STEMS.entries()) {
        for (const [branchIndex, branch] of BRANCHES.entries()) {
          const exists = sexagenaryOf(stem, branch) !== undefined;
          assertTrue(exists === (stemIndex % 2 === branchIndex % 2));
        }
      }
    });
  });
});
