import {
  assertIdentical,
  assertNumberBetween,
  assertTrue,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import { at } from "#test/instants.js";
import { on, randomDates } from "#test/calendar.js";

import {
  BEIJING_LOCAL,
  CHINA_STANDARD,
  KOREA_STANDARD,
  localDateAt,
  marginFromMidnight,
  startOfDayAt,
  VIETNAM_STANDARD,
} from "./place.js";

describe("place", () => {
  describe("localDateAt", () => {
    it("agrees with a fixed offset where the meridian is a whole hour", () => {
      // Given an instant late in the evening UTC.
      // When it is read at 120°E and at the +08:00 offset Temporal already
      // knows about.
      // Then both give the same day. 120 degrees is exactly eight hours of
      // rotation, which is why China Standard Time sits where it does.
      const instant = at("2026-02-16T20:00:00Z");

      assertIdentical(
        localDateAt(instant, CHINA_STANDARD).toString(),
        instant.toZonedDateTimeISO("+08:00").toPlainDate().toString(),
      );
    });

    it("puts an instant on different days either side of a meridian", () => {
      // Given an instant at 16:30 UTC, which is past midnight in Korea and
      // not yet midnight in Vietnam.
      // When it is read at both.
      // Then the two disagree by a day. This is the whole reason a place is a
      // parameter and not a constant.
      const instant = at("2026-02-16T16:30:00Z");

      assertIdentical(localDateAt(instant, KOREA_STANDARD).day, 17);
      assertIdentical(localDateAt(instant, VIETNAM_STANDARD).day, 16);
    });

    it("carries a meridian that is not a whole number of minutes", () => {
      // Given Beijing's own meridian, 116.4°E, which works out at 7 hours 45
      // minutes 36 seconds.
      // When an instant just before that local midnight is read.
      // Then it still falls on the earlier day. Offset identifiers would not
      // carry those seconds, which is why the shift is arithmetic.
      const midnight = startOfDayAt(on("1900-06-15"), BEIJING_LOCAL);

      assertIdentical(
        localDateAt(
          midnight.subtract({ seconds: 1 }),
          BEIJING_LOCAL,
        ).toString(),
        "1900-06-14",
      );
      assertIdentical(
        localDateAt(midnight, BEIJING_LOCAL).toString(),
        "1900-06-15",
      );
    });

    it("separates Beijing local from the standard meridian by 14 minutes", () => {
      // Given the same local date at both meridians.
      // When their midnights are compared.
      // Then Beijing's falls 14 minutes 24 seconds later, being that much
      // further west. Any deciding instant landing in that window produces a
      // different date under the two.
      const date = on("1900-06-15");
      const gap = startOfDayAt(date, BEIJING_LOCAL)
        .since(startOfDayAt(date, CHINA_STANDARD))
        .total("minutes");

      assertNumberBetween(gap, 14.3, 14.5);
    });
  });

  describe("startOfDayAt", () => {
    it("inverts localDateAt", () => {
      // Given dates drawn at random.
      // When each date's local midnight is taken and read back.
      // Then the same date comes back.
      for (const date of randomDates(1800, 2200, 50)) {
        assertIdentical(
          localDateAt(
            startOfDayAt(date, BEIJING_LOCAL),
            BEIJING_LOCAL,
          ).toString(),
          date.toString(),
        );
      }
    });
  });

  describe("marginFromMidnight", () => {
    it("gives zero at midnight itself", () => {
      // Given local midnight at a place.
      // When its margin is measured.
      // Then it is zero, because midnight is no distance from midnight.
      const midnight = startOfDayAt(on("2026-02-17"), CHINA_STANDARD);

      assertIdentical(
        marginFromMidnight(midnight, CHINA_STANDARD).total("minutes"),
        0,
      );
    });

    it("measures to the nearer midnight", () => {
      // Given an instant an hour before local midnight and one an hour after.
      // When each margin is measured.
      // Then both come out at an hour. The margin is a distance and carries no
      // sign, because what matters is how far the answer sat from flipping and
      // not which way it would have gone.
      const midnight = startOfDayAt(on("2026-02-17"), CHINA_STANDARD);

      assertIdentical(
        marginFromMidnight(
          midnight.subtract({ hours: 1 }),
          CHINA_STANDARD,
        ).total("minutes"),
        60,
      );
      assertIdentical(
        marginFromMidnight(midnight.add({ hours: 1 }), CHINA_STANDARD).total(
          "minutes",
        ),
        60,
      );
    });

    it("never exceeds twelve hours", () => {
      // Given instants spread through a day.
      // When each margin is measured.
      // Then none exceeds twelve hours, because the two midnights it could be
      // measured to are a day apart and the nearer one is taken.
      const midnight = startOfDayAt(on("2026-06-15"), CHINA_STANDARD);

      for (let minute = 0; minute < 1440; minute += 7) {
        assertNumberBetween(
          marginFromMidnight(
            midnight.add({ minutes: minute }),
            CHINA_STANDARD,
          ).total("minutes"),
          0,
          720,
          `minute ${String(minute)}`,
        );
      }
    });

    it("gives a different margin at a different meridian", () => {
      // Given one instant, which is one instant everywhere.
      // When its margin is measured at two meridians.
      // Then the two differ, because they are distances to different
      // midnights.
      const instant = at("2026-02-16T16:00:00Z");

      assertTrue(
        marginFromMidnight(instant, CHINA_STANDARD).total("minutes") !==
          marginFromMidnight(instant, VIETNAM_STANDARD).total("minutes"),
      );
    });
  });
});
