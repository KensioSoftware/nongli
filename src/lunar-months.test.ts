import {
  assertArrayEmpty,
  assertArrayLength,
  assertFalse,
  assertIdentical,
  assertInstanceOf,
  assertThrowsError,
  assertTrue,
  assertUndefined,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import { everySectorAdvancing, on } from "#test/calendar.js";

import { majorTermsIn } from "./evidence.js";
import { boundariesBetween, solsticeMonth } from "./lunar-boundaries.js";
import { monthContaining, spanContaining } from "./lunar-lookup.js";
import { leapIndexOf, spanFromSolsticeOf } from "./lunar-months.js";
import { CHINA_STANDARD } from "./place.js";

describe("the month engine", () => {
  describe("boundariesBetween", () => {
    it("returns one more boundary than there are months", () => {
      // Given the solstice months opening and closing a span.
      // When the boundaries between them are found.
      // Then there is one more than the span has months, because each month
      // needs a start and an end and consecutive months share one.
      const opening = solsticeMonth(2025, CHINA_STANDARD);
      const closing = solsticeMonth(2026, CHINA_STANDARD);

      const boundaries = boundariesBetween(opening, closing, CHINA_STANDARD);
      const span = spanFromSolsticeOf(2025, CHINA_STANDARD);

      assertArrayLength(boundaries, span.months.length + 1);
    });

    it("closes on the conjunction opening the next month 11", () => {
      // Given a span's opening and closing solstice months.
      // When the boundaries are found.
      // Then the last is the closing month 11's own conjunction. Comparing
      // dates rather than instants is what keeps this exact: the conjunction
      // search is only reproducible to a second, and comparing instants
      // admitted a fourteenth month that shifted eleven years over 1900-2100.
      const opening = solsticeMonth(2025, CHINA_STANDARD);
      const closing = solsticeMonth(2026, CHINA_STANDARD);
      const boundaries = boundariesBetween(opening, closing, CHINA_STANDARD);

      assertIdentical(
        boundaries.at(-1)?.instant.toString(),
        closing.opening.toString(),
      );
    });
  });

  describe("leapIndexOf", () => {
    it("finds no leap month in a twelve-month span", () => {
      // Given a common year's span.
      // When its months are examined.
      // Then none is leap. Twelve months between one month 11 and the next
      // leaves no room for one, whatever the sectors do.
      const span = spanFromSolsticeOf(2025, CHINA_STANDARD);

      assertArrayLength(span.months, 12);
      assertArrayEmpty(span.months.filter((month) => month.isLeap));
    });

    it("reports none when no month of a long span repeats a sector", () => {
      // Given thirteen months whose boundaries all advance a sector, which the
      // astronomy never actually produces but the rule has to answer for.
      // When the leap index is asked for.
      // Then it is undefined. Returning 0 here would make month 11 the leap
      // month, and month 11 contains the solstice by definition.
      assertUndefined(leapIndexOf(everySectorAdvancing(13)));
    });
  });

  describe("monthContaining", () => {
    it("refuses a date the span does not cover", () => {
      // Given a span built for one year and a date from a decade later.
      // When the month containing it is asked for.
      // Then it refuses rather than answering with the nearest month. A span
      // from spanContaining always holds its own date, so this is reachable
      // only by pairing the two by hand.
      const span = spanContaining(on("2026-06-15"), CHINA_STANDARD);

      const error = assertThrowsError(() =>
        monthContaining(span, on("2036-06-15")),
      );
      assertInstanceOf(error, RangeError);
    });

    it("covers every day between the span's first and last", () => {
      // Given a span.
      // When each of its month boundaries is looked up.
      // Then the month found is the one that starts there, with no gap between
      // consecutive months and no day claimed by two.
      const span = spanContaining(on("2033-06-15"), CHINA_STANDARD);

      for (const month of span.months) {
        assertIdentical(
          monthContaining(span, month.start).start.toString(),
          month.start.toString(),
        );
        assertIdentical(
          monthContaining(
            span,
            month.end.subtract({ days: 1 }),
          ).start.toString(),
          month.start.toString(),
        );
      }
    });
  });

  describe("majorTermsIn", () => {
    it("finds no terms in a span holding no months", () => {
      // Given a span whose months have been emptied.
      // When its 中气 are looked for.
      // Then none are found, because there is no interval to look in.
      const span = spanFromSolsticeOf(2025, CHINA_STANDARD);

      assertArrayEmpty(majorTermsIn({ ...span, months: [] }));
    });

    it("makes the leap month the first with no 中气, in 2033", () => {
      // Given 2033, the span that catches naive implementations.
      // When the months holding no 中气 are found from independently located
      // terms rather than from the sector shortcut the engine uses.
      // Then there are two of them, and the leap month is the first.
      //
      // This is why 2033 is the standing test case. A rule stated as "the
      // month with no 中气" has two answers here and needs the word *first* to
      // have one. Implementations that drop it produce 闰七月 where the
      // official calendar has 闰十一月.
      const span = spanFromSolsticeOf(2033, CHINA_STANDARD);
      const terms = majorTermsIn(span);

      const barren = span.months.filter(
        (month) =>
          !terms.some((term) => {
            const day = term.instant.toZonedDateTimeISO("+08:00").toPlainDate();
            return (
              Temporal.PlainDate.compare(day, month.start) >= 0 &&
              Temporal.PlainDate.compare(day, month.end) < 0
            );
          }),
      );

      assertArrayLength(barren, 2);
      assertTrue(barren.at(0)?.isLeap);
      assertIdentical(barren.at(0)?.number, 11);
      assertFalse(barren.at(1)?.isLeap);
    });
  });
});
