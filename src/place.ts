/**
 * Where a calendar is being computed for.
 *
 * ## Why a place is a parameter at all
 *
 * The lunisolar rules never mention China. They say "the day containing the new
 * moon", and *which day* depends entirely on the meridian whose midnight the
 * instant is measured against. A conjunction at 23:50 in Beijing is 15:50 the
 * same day in London, and near midnight the two fall on different dates.
 *
 * Vary that one parameter and the same engine produces the whole East Asian
 * family. 农历, âm lịch and 음력 differ from each other by their meridian and by
 * very little else, and where they diverge, this library can say which
 * conjunction did it and by how many minutes. Other implementations ship the
 * divergences as separate hardcoded tables.
 *
 * ## Why a location and not a meridian
 *
 * The calendar reads {@link Place.longitude} and nothing else. Latitude is
 * carried anyway because the night watches (更) divide the night into five equal
 * parts of however long the night is, so they need dusk and dawn, so they need
 * latitude. Anything built on sunrise or twilight will want it too.
 *
 * Adding the field now costs a line. Adding it later is a breaking change to
 * every signature in the library.
 */

/** Hours of rotation per degree of longitude. */
const HOURS_PER_DEGREE = 1 / 15;

const NS_PER_HOUR = 3_600_000_000_000;

/** A location on the Earth, and the name it is known by. */
export interface Place {
  /** Degrees east of Greenwich. Negative for west. */
  readonly longitude: number;
  /** Degrees north of the equator. Negative for south. */
  readonly latitude: number;
  /** What to call this place in output. */
  readonly name: string;
}

/**
 * 120°E, the meridian of China Standard Time, standardised in 1928.
 *
 * The official 农历 is computed here by 紫金山天文台 under GB/T 33661-2017, and
 * it is the default everywhere in this library. Latitude is Beijing's, which
 * matters only for the parts of the library that look at the Sun's altitude.
 */
export const CHINA_STANDARD: Place = {
  longitude: 120,
  latitude: 39.9,
  name: "China Standard (120°E)",
};

/**
 * Beijing's own meridian, roughly 116.4°E.
 *
 * What the calendar was computed on before 1928, and 14 minutes 24 seconds west
 * of {@link CHINA_STANDARD}. Any deciding instant falling in that window
 * produces a different date under the two, which makes this the cheapest
 * historical correction available and one that most implementations skip.
 */
export const BEIJING_LOCAL: Place = {
  longitude: 116.4,
  latitude: 39.9,
  name: "Beijing local (116.4°E)",
};

/** 105°E (UTC+7), the meridian of the Vietnamese âm lịch. */
export const VIETNAM_STANDARD: Place = {
  longitude: 105,
  latitude: 21,
  name: "Vietnam Standard (105°E)",
};

/** 135°E (UTC+9), the meridian of the Korean 음력. */
export const KOREA_STANDARD: Place = {
  longitude: 135,
  latitude: 37.6,
  name: "Korea Standard (135°E)",
};

/**
 * How far a place's local time runs ahead of UTC, in nanoseconds.
 *
 * Derived from longitude by rotation alone, with no political time zone
 * involved. 120°E comes out at exactly eight hours, which is why the modern
 * 农历 and China Standard Time agree.
 */
function offsetNanoseconds(place: Place): bigint {
  return BigInt(Math.round(place.longitude * HOURS_PER_DEGREE * NS_PER_HOUR));
}

/**
 * The local date an instant falls on at a place.
 *
 * Shifted arithmetically and read in UTC, without going through a time zone
 * identifier. Offset identifiers are limited in the precision they accept, and
 * a meridian like Beijing's 116.4°E lands on 7 hours 45 minutes 36 seconds. The
 * arithmetic carries it exactly.
 */
export function localDateAt(
  instant: Temporal.Instant,
  place: Place,
): Temporal.PlainDate {
  return instant
    .add({ nanoseconds: Number(offsetNanoseconds(place)) })
    .toZonedDateTimeISO("UTC")
    .toPlainDate();
}

/** The instant local midnight begins on a date at a place. */
export function startOfDayAt(
  date: Temporal.PlainDate,
  place: Place,
): Temporal.Instant {
  return date
    .toZonedDateTime({ timeZone: "UTC" })
    .toInstant()
    .subtract({ nanoseconds: Number(offsetNanoseconds(place)) });
}

/**
 * How far an instant sits from the nearest local midnight at a place.
 *
 * This is the margin the whole library turns on. Every rule of the calendar
 * asks whether an instant falls before or after a local midnight, so for every
 * boundary there is a real distance from deciding the other way. A conjunction
 * at 23:52 starts the month on the 3rd, and eight minutes later it starts on the
 * 4th.
 *
 * The result is a duration and carries no other meaning. It is never a
 * probability that an answer is wrong.
 */
export function marginFromMidnight(
  instant: Temporal.Instant,
  place: Place,
): Temporal.Duration {
  const day = localDateAt(instant, place);
  const since = instant.since(startOfDayAt(day, place));
  const until = startOfDayAt(day.add({ days: 1 }), place).since(instant);

  return Temporal.Duration.compare(since, until, {
    relativeTo: Temporal.PlainDate.from("2000-01-01"),
  }) <= 0
    ? since
    : until;
}
