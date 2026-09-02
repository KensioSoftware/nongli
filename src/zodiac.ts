/**
 * The twelve animals of the zodiac (生肖).
 *
 * One animal per Earthly Branch, in a fixed and uncontested mapping: 子 is the
 * rat, 丑 the ox, and so on round to 亥 the pig. The animals are a naming of the
 * branches rather than a cycle of their own, which is why this module holds no
 * arithmetic. Ask a date for its branch and the animal follows.
 *
 * ```ts
 * zodiacFor("午"); // { name: "马", english: "horse", ... }
 * ```
 *
 * What *is* contested is where the zodiac year begins, and that question
 * belongs to the year rather than to the animal. See
 * {@link ./sexagenary-dates.js}.
 */

import type { Branch } from "./sexagenary.js";

/** One of the twelve animals. */
export interface ZodiacAnimal {
  /** Position in the cycle, counting 鼠 as 0, matching its branch. */
  readonly index: number;
  /** The Earthly Branch this animal names. */
  readonly branch: Branch;
  /** Simplified Chinese, e.g. `"马"`. */
  readonly name: string;
  /** Traditional Chinese, e.g. `"馬"`. Equal to `name` for most animals. */
  readonly traditional: string;
  /** The usual English name, e.g. `"horse"`. */
  readonly english: string;
}

/**
 * The animals, as [branch, simplified, traditional, English] rows.
 *
 * The branch is in the row rather than taken from {@link BRANCHES} by position,
 * so the pairing can be read off a single line. A test checks the order against
 * `BRANCHES`, which is what catches the two drifting apart.
 *
 * Where an animal's two scripts are the same string, it has none of the
 * characters that were simplified.
 */
const NAMES: readonly (readonly [Branch, string, string, string])[] = [
  ["子", "鼠", "鼠", "rat"],
  ["丑", "牛", "牛", "ox"],
  ["寅", "虎", "虎", "tiger"],
  ["卯", "兔", "兔", "rabbit"],
  ["辰", "龙", "龍", "dragon"],
  ["巳", "蛇", "蛇", "snake"],
  ["午", "马", "馬", "horse"],
  ["未", "羊", "羊", "goat"],
  ["申", "猴", "猴", "monkey"],
  ["酉", "鸡", "雞", "rooster"],
  ["戌", "狗", "狗", "dog"],
  ["亥", "猪", "豬", "pig"],
];

/** The twelve animals, in branch order from 鼠. */
export const ZODIAC: readonly ZodiacAnimal[] = NAMES.map(
  ([branch, name, traditional, english], index) => ({
    index,
    branch,
    name,
    traditional,
    english,
  }),
);

/** The animal naming a branch. */
export function zodiacFor(branch: Branch): ZodiacAnimal {
  const animal = ZODIAC.find((each) => each.branch === branch);

  if (animal === undefined) {
    throw new RangeError(`${branch} is not an Earthly Branch.`);
  }

  return animal;
}

/**
 * The animal with a given name, in either script or in English, or `undefined`
 * if there is no such animal.
 *
 * Matching English is case-insensitive, because nobody types `"Rat"` the same
 * way twice.
 */
export function zodiacNamed(name: string): ZodiacAnimal | undefined {
  const wanted = name.toLowerCase();

  return ZODIAC.find(
    (animal) =>
      animal.name === name ||
      animal.traditional === name ||
      animal.english === wanted,
  );
}
