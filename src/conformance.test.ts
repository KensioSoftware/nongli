import {
  assertArrayEmpty,
  assertArrayMinLength,
  assertIdentical,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import corpus from "#test/hko-corpus.json" with { type: "json" };

import { sexagenary } from "./sexagenary.js";
import { toChinese } from "./lunisolar.js";

/**
 * Conformance against the Hong Kong Observatory.
 *
 * Every other calendar check in this repository compares nongli with the
 * runtime's ICU calendar. That is a differential test: it finds where two
 * implementations part company and says nothing about which is right, and two
 * descendants of the same theory can agree perfectly while both are wrong.
 *
 * These are different. The Observatory publishes the tables people in Hong Kong
 * actually read, so where nongli and ICU disagree it is the Observatory that
 * adjudicates. Failing here means nongli is wrong, not merely different.
 *
 * The published tables cover 2023 to 2028 and no more, so this is one band and
 * not a claim about centuries. The report says so, and a corpus reaching
 * further back is what this repository still owes.
 *
 * Contains information from DATA.GOV.HK. The intellectual property rights in
 * the data belong to the Government of the Hong Kong Special Administrative
 * Region and the relevant organisations.
 */
describe("conformance with the Hong Kong Observatory", () => {
  /**
   * How long a sweep across the whole corpus is allowed.
   *
   * Every entry costs a conversion, and a conversion costs a solstice search
   * and a dozen conjunction searches. The default five seconds is comfortable
   * locally and not on a loaded CI runner under coverage instrumentation.
   */
  const CORPUS_SWEEP_TIMEOUT_MS = 60_000;

  /** 1984 was 甲子, the first year of the cycle. */
  const GANZHI_EPOCH_YEAR = 1984;
  const CYCLE_LENGTH = 60;

  it("has a corpus to check against", () => {
    // Given the generated corpus.
    // When its size is read.
    // Then it holds six years of daily entries. A conformance suite that
    // quietly emptied itself would pass every assertion below.
    assertArrayMinLength(corpus.entries, 2000);
    assertIdentical(corpus.coversFrom, "2023-01-01");
    assertIdentical(corpus.coversTo, "2028-12-31");
  });

  it(
    "agrees on the lunar month and day for every published date",
    () => {
      // Given every date the Observatory publishes a conversion for.
      // When nongli converts it.
      // Then the month, the leap flag and the day of month all match. The three
      // leap months in this range (2023, 2025 and 2028) are the part most worth
      // having an authority for.
      const wrong = corpus.entries.filter((entry) => {
        const mine = toChinese(Temporal.PlainDate.from(entry.iso));
        return (
          mine.month !== entry.month ||
          mine.isLeap !== entry.isLeap ||
          mine.day !== entry.day
        );
      });

      assertArrayEmpty(
        wrong.map(
          (entry) =>
            `${entry.iso}: HKO says ${entry.isLeap ? "leap " : ""}month ${String(entry.month)} day ${String(entry.day)}`,
        ),
      );
    },
    CORPUS_SWEEP_TIMEOUT_MS,
  );

  it(
    "agrees on the sexagenary year for every published date",
    () => {
      // Given the same dates, whose 干支 year the Observatory also prints.
      // When the cycle is counted from 1984, which was 甲子.
      // Then every year name matches. This checks two things at once: that the
      // cycle arithmetic is right, and that nongli puts the year boundary where
      // the Observatory does, which is the New Year and not 立春.
      const wrong = corpus.entries.filter((entry) => {
        const { year } = toChinese(Temporal.PlainDate.from(entry.iso));
        const index =
          (((year - GANZHI_EPOCH_YEAR) % CYCLE_LENGTH) + CYCLE_LENGTH) %
          CYCLE_LENGTH;
        const { stem, branch } = sexagenary(index);
        return stem + branch !== entry.ganzhiYear;
      });

      assertArrayEmpty(
        wrong.map((entry) => `${entry.iso}: ${entry.ganzhiYear}`),
      );
    },
    CORPUS_SWEEP_TIMEOUT_MS,
  );
});
