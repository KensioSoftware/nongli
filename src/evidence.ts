/**
 * The astronomical instants an answer turned on, and how close each sat to
 * deciding otherwise.
 *
 * ## What a margin is
 *
 * Every rule of the calendar is a threshold comparison. A month begins on the
 * day containing a conjunction, month 11 is the month containing a solstice, and
 * a leap month is one containing no 中气. Each asks whether an astronomical
 * instant falls before or after a local midnight, so every boundary has a
 * computable distance from deciding the other way.
 *
 * A conjunction at 23:52 starts the month on the 3rd. Eight minutes later it
 * starts on the 4th, and the leap month and New Year can move with it. That
 * distance is the margin. It is a duration in minutes, and it is never a
 * probability that the answer is wrong.
 *
 * ## A margin measures the boundary that would change the answer
 *
 * Not simply the nearest midnight. For a conjunction those are the same thing,
 * because a month begins on the day containing it, so the deciding boundary is
 * local midnight.
 *
 * For a solar term they are not. Month 11 is the month *containing* 冬至, and a
 * leap month is one containing no 中气, so what matters is whether the term
 * crosses a **lunar month boundary**. A 中气 sitting a minute after midnight in
 * the middle of a month is not close to anything: the month containing it is the
 * same either way. Measuring solar terms against the nearest midnight reported
 * 10.3% of all dates as fragile, where measuring them against the boundary that
 * actually decides reports a small fraction of that.
 *
 * ## A margin is only as good as the set it minimises over
 *
 * The set has to be built by asking what would change the answer, and an
 * incomplete set fails quietly in the direction that flatters the library.
 * 2057-09-28 is the standing example. Its month *opens* 715 minutes from a
 * midnight and *closes* 40 seconds from one, and a claim carrying only the
 * opening conjunction called that date safe while the runtime was already
 * disagreeing with it.
 */

import type { LunarSpan } from "./lunar-months.js";
import {
  isCloser,
  marginToNearest,
  monthBoundaries,
  WIDEST_MARGIN,
} from "./margins.js";
import type { Place } from "./place.js";
import { localDateAt, marginFromMidnight } from "./place.js";
import { solarTermInstant } from "./solar-term-times.js";
import { MAJOR_TERMS } from "./solar-terms.js";

/** What an instant settled. */
export type DecidingRole =
  | "month start"
  | "month end"
  | "solstice"
  | "leap placement"
  | "year start";

/** An astronomical instant that decided part of an answer. */
export interface DecidingEvent {
  readonly kind: "new moon" | "solar term";
  readonly role: DecidingRole;
  /** What the instant is called, where it has a name. */
  readonly name: string | undefined;
  readonly instant: Temporal.Instant;
  /**
   * How far the instant sat from the local midnight that would have decided
   * differently.
   */
  readonly margin: Temporal.Duration;
}

/**
 * What backs one field of an answer.
 *
 * `margin` is the smallest distance among `deciding`.
 */
export interface Evidence {
  readonly margin: Temporal.Duration;
  readonly deciding: readonly DecidingEvent[];
}

/** A conjunction that decided something. */
export function newMoonEvent(
  role: DecidingRole,
  instant: Temporal.Instant,
  place: Place,
): DecidingEvent {
  return {
    kind: "new moon",
    role,
    name: undefined,
    instant,
    margin: marginFromMidnight(instant, place),
  };
}

/**
 * A solar term that decided something.
 *
 * `boundaries` are the month starts the term is measured against. What a term
 * decides is which lunar month contains it, so a term far from any month
 * boundary is deciding nothing marginally, however close to midnight it falls.
 */
export function solarTermEvent(
  role: DecidingRole,
  name: string,
  instant: Temporal.Instant,
  boundaries: readonly Temporal.Instant[],
): DecidingEvent {
  return {
    kind: "solar term",
    role,
    name,
    instant,
    margin: marginToNearest(instant, boundaries),
  };
}

/**
 * The 中气 falling inside a span, located rather than inferred.
 *
 * {@link ./lunar-months.js} places the leap month from 30° sectors of solar
 * longitude without locating a single term. That settles *whether* a month
 * contains a 中气 and leaves *how close* it came unmeasured, and the second is
 * what a margin reports. So the explaining path pays for the searches, and this
 * is where the two conversion paths differ in cost.
 */
export function majorTermsIn(span: LunarSpan): readonly DecidingEvent[] {
  const found: DecidingEvent[] = [];
  const boundaries = monthBoundaries(span);
  const opensOn = span.months.at(0)?.start;
  const closesOn = span.months.at(-1)?.end;

  if (opensOn === undefined || closesOn === undefined) {
    return found;
  }

  // A span always crosses a Gregorian year boundary, so these two years differ
  // and every term below is located once.
  for (const isoYear of [opensOn.year, closesOn.year]) {
    for (const term of MAJOR_TERMS) {
      const instant = solarTermInstant(term, isoYear);
      const on = localDateAt(instant, span.place);
      const inside =
        Temporal.PlainDate.compare(on, opensOn) >= 0 &&
        Temporal.PlainDate.compare(on, closesOn) < 0;

      if (inside) {
        found.push(
          solarTermEvent("leap placement", term.name, instant, boundaries),
        );
      }
    }
  }

  return found;
}

/** The smallest margin among some deciding instants. */
export function smallestMargin(
  events: readonly DecidingEvent[],
): Temporal.Duration {
  let best = WIDEST_MARGIN;

  for (const event of events) {
    if (isCloser(event.margin, best)) {
      best = event.margin;
    }
  }

  return best;
}

/** Evidence from a set of deciding instants. */
export function evidenceFrom(deciding: readonly DecidingEvent[]): Evidence {
  return { margin: smallestMargin(deciding), deciding };
}
