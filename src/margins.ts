/**
 * Measuring how close a deciding instant sat to deciding otherwise.
 *
 * {@link ./evidence.js} says what counts as evidence. This says how far from
 * flipping a piece of it was, which is a different question and turns on
 * knowing *which* boundary would have changed the answer.
 *
 * ## Two kinds of boundary
 *
 * For a **conjunction** the boundary is local midnight, because a month begins
 * on the day containing the new moon. {@link ../place.js} measures that.
 *
 * For a **solar term** it is a lunar month boundary. Month 11 is the month
 * *containing* 冬至, and a leap month is one containing no 中气, so what decides
 * is whether the term crosses from one month into another. A 中气 a minute after
 * midnight in the middle of a month has decided nothing marginally, and
 * measuring it against midnight anyway reported 10.3% of all dates as fragile
 * where the true figure is around 2%.
 */

import type { LunarSpan } from "./lunar-months.js";
import { startOfDayAt } from "./place.js";

/**
 * The largest margin there is.
 *
 * A margin against midnight is a distance to the nearer of two midnights and
 * those are a day apart, so nothing can sit further than twelve hours from one.
 * This is also what an empty set of deciders reports, which is the honest answer
 * for a field nothing came near deciding.
 */
export const WIDEST_MARGIN = Temporal.Duration.from({ hours: 12 });

/** Durations need a reference point to be compared. Any date will do. */
export const COMPARISON_EPOCH = Temporal.PlainDate.from("2000-01-01");

/** Whether the first duration is the shorter of the two. */
export function isCloser(
  candidate: Temporal.Duration,
  best: Temporal.Duration,
): boolean {
  return (
    Temporal.Duration.compare(candidate, best, {
      relativeTo: COMPARISON_EPOCH,
    }) < 0
  );
}

/**
 * The instants at which a span's months begin.
 *
 * These are the boundaries a solar term has to cross to change which month
 * contains it, and therefore the only boundaries that can change what it
 * decides.
 */
export function monthBoundaries(span: LunarSpan): readonly Temporal.Instant[] {
  const boundaries = span.months.map((month) =>
    startOfDayAt(month.start, span.place),
  );
  const last = span.months.at(-1);

  return last === undefined
    ? boundaries
    : [...boundaries, startOfDayAt(last.end, span.place)];
}

/** How far an instant sits from the nearest of some boundaries. */
export function marginToNearest(
  instant: Temporal.Instant,
  boundaries: readonly Temporal.Instant[],
): Temporal.Duration {
  let best = WIDEST_MARGIN;

  for (const boundary of boundaries) {
    const gap = Temporal.Duration.from({
      milliseconds: Math.abs(
        instant.epochMilliseconds - boundary.epochMilliseconds,
      ),
    });

    if (isCloser(gap, best)) {
      best = gap;
    }
  }

  return best;
}
