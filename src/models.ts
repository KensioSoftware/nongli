/**
 * Which rules produced an answer, when they were the calendar of record, and
 * whether anyone ever published the result.
 *
 * ## Why an answer needs this as well as a margin
 *
 * A margin says how close a date came to being a different date. It says
 * nothing about whether the date means anything, and the two fail
 * independently.
 *
 * A date in 2200 can sit twelve hours from any boundary, which is as
 * arithmetically safe as a date gets, and still be something nobody has ever
 * promulgated. A date in 1500 is worse than un-published: it is computed on
 * 时宪历, a rule that did not exist until 1645, so the answer is a modern
 * calendar run backwards past its own life. Neither of those shows up in a
 * margin, and a library whose pitch is telling you when not to trust it has to
 * say so.
 *
 * ## The three states, and why not two
 *
 * The design notes drew this as attested against computed. Two states turned
 * out to overclaim in the middle. The 农历 was genuinely published every year
 * from 1645 onwards, but nongli holds a source for six of those years, and
 * calling the rest "attested" asserts something the library cannot show you.
 *
 * So the middle is named for what is actually true of it. The calendar was in
 * force and was published at the time; nongli simply has no copy.
 */

/** Which rules produced an answer. */
export type ModelId = "shixian";

/**
 * Where a date sits relative to what anyone has published.
 *
 * | | meaning |
 * | --- | --- |
 * | `published` | nongli holds a published source covering this date, and names it |
 * | `in-force` | the model was the calendar in actual use, but nongli holds no source |
 * | `computed` | outside the model's life: rules run back before it was adopted, or forward past anything published |
 */
export type Basis = "published" | "in-force" | "computed";

/** A calendar model, and the span over which its answers mean anything. */
export interface CalendarModel {
  readonly id: ModelId;
  /** What the model is called, in its own script. */
  readonly name: string;
  /**
   * The first year the model was the calendar of record.
   *
   * Before this, an answer is the model's rules run backwards through a period
   * that used different ones.
   */
  readonly inForceFrom: number;
  /** The first year nongli holds a published source for. */
  readonly publishedFrom: number;
  /** The last year nongli holds a published source for. */
  readonly publishedTo: number;
  /** Who published it. */
  readonly publishedBy: string;
}

/**
 * 时宪历, adopted in 1645 and the rule the modern 农历 still follows.
 *
 * The published range is the Hong Kong Observatory's open data, which is what
 * `test/hko-corpus.json` holds and what the conformance suite checks against.
 * It is deliberately the range nongli can *show* rather than the much longer
 * range over which the calendar was published, because the point of the field
 * is to stop the library claiming more than it can demonstrate. It widens when
 * a deeper corpus lands.
 */
export const SHIXIAN: CalendarModel = {
  id: "shixian",
  name: "时宪历",
  inForceFrom: 1645,
  publishedFrom: 2023,
  publishedTo: 2028,
  publishedBy: "Hong Kong Observatory",
};

const MODELS: Readonly<Record<ModelId, CalendarModel>> = {
  shixian: SHIXIAN,
};

/** The model a `ModelId` names. */
export function modelFor(id: ModelId): CalendarModel {
  return MODELS[id];
}

/** What backs an answer for a year under a model. */
export interface BasisClaim {
  readonly kind: Basis;
  /**
   * The authority whose published tables cover this date.
   *
   * `undefined` for anything but `"published"`, because for the other two there
   * is nobody to name.
   */
  readonly source: string | undefined;
}

/**
 * Whether anyone published this year's calendar, under a given model.
 *
 * ```ts
 * basisFor(2026, "shixian"); // { kind: "published", source: "Hong Kong Observatory" }
 * basisFor(1800, "shixian"); // { kind: "in-force", source: undefined }
 * basisFor(1500, "shixian"); // { kind: "computed", source: undefined }
 * basisFor(2200, "shixian"); // { kind: "computed", source: undefined }
 * ```
 *
 * 1500 and 2200 are both computed, and the symmetry is the point. A promulgated
 * calendar is un-attested ahead of publication in exactly the way it is behind
 * the record.
 */
export function basisFor(isoYear: number, id: ModelId): BasisClaim {
  const model = MODELS[id];

  if (isoYear >= model.publishedFrom && isoYear <= model.publishedTo) {
    return { kind: "published", source: model.publishedBy };
  }

  // Anything at or after `publishedFrom` was caught above, so this is the band
  // between adoption and the published range. Past `publishedTo` an answer is
  // the rules run forward past anything promulgated, which is computed.
  if (isoYear >= model.inForceFrom && isoYear < model.publishedFrom) {
    return { kind: "in-force", source: undefined };
  }

  return { kind: "computed", source: undefined };
}
