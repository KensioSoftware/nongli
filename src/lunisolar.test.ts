import {
  assertArrayIncludes,
  assertArrayLength,
  assertArrayMinLength,
  assertArrayNotIncludes,
  assertFalse,
  assertIdentical,
  assertInstanceOf,
  assertNonNullable,
  assertNumberBetween,
  assertObjectEquals,
  assertOneOf,
  assertThrowsError,
  assertTrue,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import {
  everyDayFrom,
  icuChineseDate,
  on,
  randomDates,
} from "#test/calendar.js";
import { GOLD } from "#test/gold-dates.js";

import { explainChinese } from "./claim.js";
import { spanFromSolsticeOf } from "./lunar-months.js";
import { fromChinese, toChinese } from "./lunisolar.js";
import { chineseNewYear, isLeapYear, lunisolarYear } from "./lunisolar-year.js";
import {
  BEIJING_LOCAL,
  CHINA_STANDARD,
  marginFromMidnight,
  VIETNAM_STANDARD,
} from "./place.js";
import { solarTermInstant } from "./solar-term-times.js";
import { solarTermNamed } from "./solar-terms.js";

describe("the lunisolar calendar", () => {
  /** Wide enough that a fault confined to one era shows up. */
  const FIRST_YEAR = 1900;
  const LAST_YEAR = 2100;

  /**
   * How long a sweep across the whole range is allowed.
   *
   * Every year of it costs a solstice search and a dozen conjunction searches,
   * and the default five seconds is comfortable here and not on a loaded CI
   * runner under coverage instrumentation. Raising the limit keeps the range
   * broad, which is the point of these tests.
   */
  const BROAD_SWEEP_TIMEOUT_MS = 60_000;

  describe("toChinese", () => {
    it("converts dates whose answer is published elsewhere", () => {
      // Given dates whose lunisolar value comes from outside this repository.
      // When each is converted.
      // Then it matches what was published. These are the only assertions here
      // that could catch the whole engine being confidently wrong.
      for (const { iso, expected, source } of GOLD) {
        assertObjectEquals(toChinese(on(iso)), expected, source);
      }
    });

    it("places 闰十一月 in 2033", () => {
      // Given 2033, the year naive implementations put the leap month in the
      // wrong place, usually calling it 闰七月.
      // When the months of that year are listed.
      // Then the leap month is the eleventh.
      const leap = lunisolarYear(2033).filter((month) => month.isLeap);

      assertArrayLength(leap, 1);
      assertIdentical(leap.at(0)?.number, 11);
    });

    it("numbers the day from the first day of the month", () => {
      // Given the first day of a month and the day after it.
      // When both are converted.
      // Then the day numbers are 1 and 2 within the same month.
      const first = on("2026-02-17");

      assertIdentical(toChinese(first).day, 1);
      assertIdentical(toChinese(first.add({ days: 1 })).day, 2);
      assertIdentical(toChinese(first.add({ days: 1 })).month, 1);
    });
  });

  describe("agreement with the runtime's own Chinese calendar", () => {
    it(
      "disagrees only where a deciding instant sits near midnight",
      () => {
        // Given every date nongli and ICU are both asked about across two
        // centuries.
        // When the two are compared and each disagreement's margin is read.
        // Then every disagreement sits within ten minutes of a local midnight.
        // This is the falsifiable prediction the whole design makes. Scattered
        // disagreements would mean the margin measures something else.
        for (const date of everyDayFrom("1900-01-01", 400)) {
          const mine = toChinese(date);
          const icu = icuChineseDate(date);
          const agrees =
            mine.month === icu.month &&
            mine.isLeap === icu.isLeap &&
            mine.day === icu.day;

          if (!agrees) {
            const margin = explainChinese(date).margin.total("minutes");
            assertTrue(
              margin < 10,
              `${date.toString()} disagrees at a margin of ${margin.toFixed(2)} min`,
            );
          }
        }
      },
      BROAD_SWEEP_TIMEOUT_MS,
    );
  });

  describe("structural invariants", () => {
    it(
      "gives every month 29 or 30 days, and every span 12 or 13 months",
      () => {
        // Given every solstice-to-solstice span of two centuries.
        // When each month length and each month count is measured.
        // Then a month is 29 or 30 days and a span holds 12 or 13 of them. Any
        // other answer means the span machinery has lost or gained a conjunction.
        //
        // Iterating spans rather than years is what keeps this affordable. A
        // lunisolar year straddles two spans, so asking for 201 years builds 402
        // spans where 201 cover the same ground.
        for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
          const span = spanFromSolsticeOf(year, CHINA_STANDARD);
          assertOneOf(
            span.months.length,
            [12, 13],
            `span from ${String(year)}`,
          );

          for (const month of span.months) {
            assertOneOf(
              month.length,
              [29, 30],
              `month ${String(month.number)} of ${String(year)}`,
            );
          }
        }
      },
      BROAD_SWEEP_TIMEOUT_MS,
    );

    it(
      "reports a leap year exactly when the year holds thirteen months",
      () => {
        // Given six decades of years, which is enough to hold about twenty leap
        // years and stay quick.
        // When the months are counted and isLeapYear is asked.
        // Then the two agree.
        for (let year = 1980; year <= 2040; year++) {
          const months = lunisolarYear(year);
          assertOneOf(months.length, [12, 13], `year ${String(year)}`);
          assertIdentical(
            isLeapYear(year),
            months.length === 13,
            `year ${String(year)}`,
          );
        }
      },
      BROAD_SWEEP_TIMEOUT_MS,
    );

    it(
      "puts the winter solstice in month 11, every year",
      () => {
        // Given the 冬至 of each year, read at the China meridian.
        // When the day containing it is converted.
        // Then it lands in month 11. That is the definition month numbering is
        // built from, so a failure is a failure of the implementation and never
        // of the assertion.
        const solstice = solarTermNamed("冬至");
        assertNonNullable(solstice);

        for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
          const day = solarTermInstant(solstice, year)
            .toZonedDateTimeISO("+08:00")
            .toPlainDate();

          assertIdentical(toChinese(day).month, 11, `冬至 ${String(year)}`);
        }
      },
      BROAD_SWEEP_TIMEOUT_MS,
    );

    it("numbers the months of a year consecutively from 1", () => {
      // Given the months of a leap year and of a common year.
      // When their numbers are read in order.
      // Then they run 1 to 12, with the leap month repeating its predecessor.
      for (const year of [2023, 2026, 2033]) {
        const numbers = lunisolarYear(year).map((month) => month.number);
        let previous = 0;

        for (const [index, number] of numbers.entries()) {
          const expected = index === 0 ? 1 : previous;
          assertTrue(
            number === expected || number === expected + 1,
            `${String(year)} month ${String(index)} jumped to ${String(number)}`,
          );
          previous = number;
        }
        assertIdentical(numbers.at(-1), 12, `${String(year)} ends at month 12`);
      }
    });
  });

  describe("round trips", () => {
    it(
      "returns the date it was given, for any date in the range",
      () => {
        // Given Gregorian dates drawn at random from three centuries.
        // When each is converted to the 农历 and back.
        // Then the original date comes back. This is the cheapest broad check
        // available, and it catches a whole class of off-by-one that the point
        // tests above would pass through.
        for (const date of randomDates(1850, 2150, 300)) {
          assertIdentical(
            fromChinese(toChinese(date)).toString(),
            date.toString(),
          );
        }
      },
      BROAD_SWEEP_TIMEOUT_MS,
    );

    it(
      "round trips consecutive days without gap or repeat",
      () => {
        // Given every day across a leap year, where month numbering shifts.
        // When each is converted and converted back.
        // Then every day maps to itself. Random sampling can step over a
        // boundary that consecutive days cannot.
        for (const date of everyDayFrom("2033-01-01", 500)) {
          assertIdentical(
            fromChinese(toChinese(date)).toString(),
            date.toString(),
          );
        }
      },
      BROAD_SWEEP_TIMEOUT_MS,
    );
  });

  describe("fromChinese", () => {
    it("finds 春节 for a year", () => {
      // Given the years 2020 to 2026, whose New Year dates are published.
      // When month 1 day 1 is asked for.
      // Then the published date comes back.
      const published = {
        2020: "2020-01-25",
        2024: "2024-02-10",
        2025: "2025-01-29",
        2026: "2026-02-17",
      };

      for (const [year, iso] of Object.entries(published)) {
        assertIdentical(chineseNewYear(Number(year)).toString(), iso);
      }
    });

    it("treats isLeap as optional and defaulting to an ordinary month", () => {
      // Given a year with a leap second month.
      // When month 2 is asked for without saying which.
      // Then the ordinary month 2 comes back, and asking for the leap one
      // gives a different, later date.
      const ordinary = fromChinese({ year: 2023, month: 2, day: 1 });
      const leap = fromChinese({ year: 2023, month: 2, isLeap: true, day: 1 });

      assertIdentical(ordinary.toString(), "2023-02-20");
      assertTrue(Temporal.PlainDate.compare(leap, ordinary) > 0);
    });

    it("refuses a leap month in a year that has none", () => {
      // Given 2026, a common year.
      // When a leap month 5 is asked for.
      // Then it refuses rather than returning a nearby date.
      const error = assertThrowsError(() =>
        fromChinese({ year: 2026, month: 5, isLeap: true, day: 1 }),
      );
      assertInstanceOf(error, RangeError);
    });

    it("refuses a day past the end of the month", () => {
      // Given a month of 29 days.
      // When day 30 is asked for.
      // Then it refuses rather than rolling into the next month.
      const month = lunisolarYear(2026).find((each) => each.length === 29);
      assertNonNullable(month);

      const error = assertThrowsError(() =>
        fromChinese({ year: 2026, month: month.number, day: 30 }),
      );
      assertInstanceOf(error, RangeError);
    });
  });

  describe("place is a parameter", () => {
    it("reproduces the 1985 divergence between 农历 and âm lịch", () => {
      // Given 21 January 1985, the day Vietnam and China began different
      // months. Vietnam kept Tết a day apart from 春节 that year.
      // When the same date is converted at each meridian.
      // Then Vietnam is already in month 1 and China is still in month 12.
      // One parameter, two traditions, and no second table.
      const date = on("1985-01-21");

      assertIdentical(toChinese(date, { place: CHINA_STANDARD }).month, 12);
      assertIdentical(toChinese(date, { place: VIETNAM_STANDARD }).month, 1);
    });

    it("defaults to the meridian the official calendar is computed on", () => {
      // Given a date converted with no place given.
      // When it is converted again naming China Standard explicitly.
      // Then both give the same answer.
      for (const date of randomDates(1900, 2100, 20)) {
        assertObjectEquals(
          toChinese(date),
          toChinese(date, { place: CHINA_STANDARD }),
        );
      }
    });

    it("computes a pre-1928 date on Beijing's own meridian", () => {
      // Given a date before China Standard Time was adopted in 1928.
      // When it is converted at Beijing local and at the modern meridian.
      // Then both answer, and the claim names the place it used. The two agree
      // on most dates and part company where a deciding instant falls in the
      // fourteen minutes between the meridians.
      const date = on("1900-06-15");
      const claim = explainChinese(date, { place: BEIJING_LOCAL });

      assertIdentical(claim.place.name, BEIJING_LOCAL.name);
      assertOneOf(claim.value.month, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });

  describe("explainChinese", () => {
    it("returns exactly what the plain conversion returns", () => {
      // Given dates drawn at random.
      // When both calls are made.
      // Then the claim's value is the plain answer. The detailed form has to
      // decompose the simple one, or the split between them is a lie.
      for (const date of randomDates(1900, 2100, 100)) {
        assertObjectEquals(explainChinese(date).value, toChinese(date));
      }
    });

    it("reports a small margin where the runtime disagrees", () => {
      // Given 2057-09-28, where the conjunction closing the month falls forty
      // seconds after local midnight and ICU therefore calls it the next
      // month.
      // When the claim is read.
      // Then the margin is under a minute, and the deciding event is the
      // conjunction that ends the month. Without that event in the set the
      // claim reported this date as safe at 715 minutes.
      const claim = explainChinese(on("2057-09-28"));

      assertTrue(claim.margin.total("minutes") < 1);
      assertTrue(
        claim.day.deciding.some((event) => event.role === "month end"),
      );
    });

    it("reports a large margin for a date nowhere near a boundary", () => {
      // Given a date in the middle of a month in a common year.
      // When the claim is read.
      // Then the margin is large. A library that called everything fragile
      // would be as useless as one that called nothing fragile.
      const claim = explainChinese(on("2026-06-15"));

      assertTrue(claim.margin.total("minutes") > 10);
    });

    it("names the deciding instants rather than only counting them", () => {
      // Given any date.
      // When the month's evidence is read.
      // Then it carries the conjunction opening the month and the solstice
      // anchoring the span, each with its own margin.
      const claim = explainChinese(on("2026-02-17"));
      const roles = claim.month.deciding.map((event) => event.role);

      assertArrayIncludes(roles, "month start");
      assertArrayIncludes(roles, "solstice");
    });

    it("measures a solar term against the month boundary, not midnight", () => {
      // Given a leap year, whose claim carries the 中气 that placed the leap
      // month.
      // When each of those terms is compared with the nearest lunar month
      // boundary.
      // Then its margin is that distance and not its distance from the nearest
      // midnight. What a 中气 decides is which month contains it, so one
      // sitting a minute after midnight in mid-month has decided nothing
      // marginally. Measuring these against midnight flagged one date in ten
      // as fragile.
      const claim = explainChinese(on("2033-06-15"));
      const terms = claim.month.deciding.filter(
        (event) => event.kind === "solar term",
      );

      assertArrayMinLength(terms, 1);

      for (const term of terms) {
        const midnightMargin = marginFromMidnight(
          term.instant,
          CHINA_STANDARD,
        ).total("minutes");

        assertTrue(
          term.margin.total("minutes") >= midnightMargin - 0.001,
          `${String(term.name)} measured against midnight`,
        );
      }
    });

    it("carries year-start evidence only for a date on that boundary", () => {
      // Given 春节 and a date in the middle of the same year.
      // When each claim's year evidence is read.
      // Then only the first carries the conjunction that opened the year. That
      // conjunction can only change the year of a date sitting on the
      // boundary, and carrying it everywhere reported one date in ten as
      // fragile, which is a signal nobody can act on.
      const newYear = explainChinese(on("2026-02-17"));
      const midYear = explainChinese(on("2026-06-15"));

      assertArrayIncludes(
        newYear.year.deciding.map((event) => event.role),
        "year start",
      );
      assertArrayNotIncludes(
        midYear.year.deciding.map((event) => event.role),
        "year start",
      );
    });

    it("carries no leap evidence in a common year", () => {
      // Given a common year, where no leap month is placed.
      // When the month evidence is read.
      // Then there is no leap placement among the deciding instants, because
      // there was no placement to be near.
      assertFalse(isLeapYear(2026));

      const roles = explainChinese(on("2026-06-15")).month.deciding.map(
        (event) => event.role,
      );
      assertArrayNotIncludes(roles, "leap placement");
    });

    it("measures every margin as a distance from a local midnight", () => {
      // Given dates drawn at random.
      // When every deciding instant of each claim is read.
      // Then no margin exceeds twelve hours, because a margin is a distance to
      // the nearer of two midnights and they are a day apart.
      for (const date of randomDates(1900, 2100, 50)) {
        for (const event of explainChinese(date).month.deciding) {
          assertNumberBetween(
            event.margin.total("minutes"),
            0,
            720,
            `${event.role} at ${date.toString()}`,
          );
        }
      }
    });
  });
});
