/**
 * The sexagenary cycle (干支), as a cycle.
 *
 * Sixty terms, each a Heavenly Stem (天干) paired with an Earthly Branch (地支).
 * The two rings turn together — 甲子, 乙丑, 丙寅 — and because ten and twelve
 * share a factor of two they meet again after sixty rather than after a hundred
 * and twenty. Half the pairings therefore never occur at all: a stem in an even
 * position only ever meets a branch in an even position, so 甲丑 is not a term
 * that exists.
 *
 * This module is the cycle and nothing else. *Which* term falls on a given
 * year, month, day or hour is a separate question and a much harder one,
 * because it depends on where the boundary between one unit and the next is
 * drawn and there is more than one convention in use. Those conversions belong
 * with the calendar, where the convention can be named, rather than buried in
 * the arithmetic here.
 */

/**
 * The ten Heavenly Stems (天干), in cycle order.
 */
export const STEMS = [
  "甲",
  "乙",
  "丙",
  "丁",
  "戊",
  "己",
  "庚",
  "辛",
  "壬",
  "癸",
] as const;

/** One of the ten Heavenly Stems (天干). */
export type Stem = (typeof STEMS)[number];

/**
 * The twelve Earthly Branches (地支), in cycle order.
 */
export const BRANCHES = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
] as const;

/** One of the twelve Earthly Branches (地支). */
export type Branch = (typeof BRANCHES)[number];

/** The number of terms in the cycle: the lowest common multiple of 10 and 12. */
export const CYCLE_LENGTH = 60;

/**
 * One term of the sexagenary cycle.
 *
 * `index` is zero based, so 甲子 is 0 and 癸亥 is 59. Traditional tables number
 * the terms from one; this does not, because it is an offset into a cycle
 * rather than a label, and every piece of arithmetic below would otherwise have
 * to add and subtract one around it.
 */
export interface Sexagenary {
  readonly index: number;
  readonly stem: Stem;
  readonly branch: Branch;
}

/**
 * The term at a position in the cycle, counting 甲子 as 0.
 *
 * The cycle wraps in both directions, which is the whole point of a cycle: 60
 * is 甲子 again, and -1 is 癸亥. That makes ordinary arithmetic on positions
 * work without the caller reducing anything first.
 *
 * @throws {RangeError} if `index` is not a whole number. There is no sensible
 * term two and a half places along, and quietly rounding to one would be worse
 * than refusing.
 */
export function sexagenary(index: number): Sexagenary {
  // Not `index % CYCLE_LENGTH` alone: that keeps the sign of the operand in
  // JavaScript, so -1 would come back as -1 rather than as 癸亥.
  const position = ((index % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH;

  const stem = STEMS[position % STEMS.length];
  const branch = BRANCHES[position % BRANCHES.length];

  // Reachable, and the only validation this needs. A whole number always lands
  // on both rings, so the lookups can only come back empty when `index` was
  // fractional or not a number at all — which is exactly what is being refused.
  if (stem === undefined || branch === undefined) {
    throw new RangeError(
      `A sexagenary index must be a whole number; got ${index}.`,
    );
  }

  return { index: position, stem, branch };
}

/**
 * The term pairing a given stem with a given branch, or `undefined` when the
 * two never meet.
 *
 * Only sixty of the hundred and twenty possible pairings are terms of the
 * cycle, and the sixty are exactly those whose positions share a parity.
 * `undefined` rather than a thrown error, because asking whether a pairing
 * exists is a reasonable question with a real negative answer, and rather than
 * a sentinel index because -1 is a number that arithmetic will happily carry.
 */
export function sexagenaryOf(
  stem: Stem,
  branch: Branch,
): Sexagenary | undefined {
  const stemIndex = STEMS.indexOf(stem);
  const branchIndex = BRANCHES.indexOf(branch);

  // Unreachable from TypeScript, which is not the only caller this ships to.
  if (stemIndex === -1 || branchIndex === -1) {
    return undefined;
  }

  const offset = branchIndex - stemIndex;
  if (offset % 2 !== 0) {
    return undefined;
  }

  // The cycle position is the solution to `p ≡ stemIndex (mod 10)` and
  // `p ≡ branchIndex (mod 12)`. Halving the offset takes out the factor the two
  // moduli share, and 5 is the inverse of 5 modulo 6, which is what turns the
  // halved offset into the number of whole turns of the stem ring.
  const turns = (((5 * (offset / 2)) % 6) + 6) % 6;

  return sexagenary(stemIndex + STEMS.length * turns);
}
