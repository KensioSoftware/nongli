/**
 * The twenty-four solar terms (二十四节气).
 *
 * Each term is the moment the Sun's apparent geocentric ecliptic longitude
 * reaches a multiple of 15°. They are the solar half of a lunisolar calendar:
 * the months come from the Moon, and these keep those months tied to the
 * seasons.
 *
 * Twelve of them are 中气 — the major terms, at multiples of 30° — and those do
 * the calendrical work. A month containing no 中气 is what the leap rule looks
 * for, and 冬至 at 270° is what fixes month 11. The other twelve, the 节气
 * proper, mark the divisions between them.
 *
 * ## What this module returns, and what it does not
 *
 * A term is an **instant**, and an instant is objective: it does not depend on
 * where you are standing. The *date* a term falls on very much does, because
 * that is a question about which local midnight the instant sits between, and
 * two places either side of a meridian can disagree by a day.
 *
 * So this module returns instants only. Turning one into a date is a separate
 * operation that has to be told a place, and it is deliberately not here.
 */

/** Degrees of apparent solar longitude between one term and the next. */
const DEGREES_PER_TERM = 15;

/** Terms at a multiple of this are 中气, the major terms. */
const DEGREES_PER_MAJOR_TERM = 30;

/** The number of terms in a full circuit of the ecliptic. */
export const TERM_COUNT = 24;

/**
 * One of the twenty-four solar terms.
 *
 * `longitude` is the defining property — the term *is* that solar longitude,
 * and the names are labels for it.
 */
export interface SolarTerm {
  /** Position in the cycle, counting 立春 as 0. */
  readonly index: number;
  /** Simplified Chinese name, e.g. `"惊蛰"`. */
  readonly name: string;
  /** Traditional Chinese name, e.g. `"驚蟄"`. Equal to `name` for most terms. */
  readonly traditional: string;
  /** Apparent solar longitude in degrees, in `[0, 360)`. */
  readonly longitude: number;
  /**
   * Whether this is a 中气 (major term).
   *
   * True for the twelve terms at multiples of 30°. These are the ones the
   * calendar is built on: a lunar month containing none of them is the leap
   * month, and the month containing 冬至 is month 11.
   */
  readonly isMajor: boolean;
}

/**
 * The terms in cycle order, beginning at 立春 (315°) as tradition does rather
 * than at 0°.
 *
 * Listed as [simplified, traditional] pairs. Where a term's two forms are the
 * same string, it has none of the characters that were simplified.
 */
const NAMES: readonly (readonly [string, string])[] = [
  ["立春", "立春"],
  ["雨水", "雨水"],
  ["惊蛰", "驚蟄"],
  ["春分", "春分"],
  ["清明", "清明"],
  ["谷雨", "穀雨"],
  ["立夏", "立夏"],
  ["小满", "小滿"],
  ["芒种", "芒種"],
  ["夏至", "夏至"],
  ["小暑", "小暑"],
  ["大暑", "大暑"],
  ["立秋", "立秋"],
  ["处暑", "處暑"],
  ["白露", "白露"],
  ["秋分", "秋分"],
  ["寒露", "寒露"],
  ["霜降", "霜降"],
  ["立冬", "立冬"],
  ["小雪", "小雪"],
  ["大雪", "大雪"],
  ["冬至", "冬至"],
  ["小寒", "小寒"],
  ["大寒", "大寒"],
];

/** 立春 sits here, which is where the traditional listing starts. */
const FIRST_TERM_LONGITUDE = 315;

/**
 * The twenty-four solar terms, in cycle order from 立春.
 *
 * Derived from {@link NAMES} rather than written out, so the longitude and the
 * 中气 flag cannot drift from the position in the list — both are functions of
 * the index and neither is typed twice.
 */
export const SOLAR_TERMS: readonly SolarTerm[] = NAMES.map(
  ([name, traditional], index) => {
    const longitude = (FIRST_TERM_LONGITUDE + index * DEGREES_PER_TERM) % 360;
    return {
      index,
      name,
      traditional,
      longitude,
      isMajor: longitude % DEGREES_PER_MAJOR_TERM === 0,
    };
  },
);

/** The twelve 中气, in cycle order. The terms the calendar is built on. */
export const MAJOR_TERMS: readonly SolarTerm[] = SOLAR_TERMS.filter(
  (term) => term.isMajor,
);

/**
 * The term with a given name, in either script, or `undefined` if there is no
 * such term.
 */
export function solarTermNamed(name: string): SolarTerm | undefined {
  return SOLAR_TERMS.find(
    (term) => term.name === name || term.traditional === name,
  );
}
