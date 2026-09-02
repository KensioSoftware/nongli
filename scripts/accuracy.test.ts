/**
 * The accuracy report.
 *
 * ```bash
 * pnpm accuracy
 * ```
 *
 * Accuracy in this repository is a build artifact and not an adjective in a
 * README. This script produces three reports, writes them to `ACCURACY.md`, and
 * exits non-zero if conformance slips, so a regression is a failure rather than
 * a paragraph nobody reread.
 *
 * **Conformance.** Agreement with the Hong Kong Observatory, which publishes the
 * tables people actually read. This is the only section that says nongli is
 * *right* rather than merely consistent with something else.
 *
 * **Disagreement.** Every date where nongli and the runtime's ICU calendar
 * differ, with nongli's margin beside it. The design predicts these cluster at
 * small margins. If they ever stop clustering, the margin has stopped measuring
 * what it claims to.
 *
 * **Fragility.** Every date whose deciding instant sits within ten minutes of a
 * local midnight, independent of any comparison. This is the list of dates where
 * two careful almanacs could reasonably disagree, and nothing else publishes it.
 *
 * ## Why this is a vitest file
 *
 * It has to resolve the library's own modules, and those import each other with
 * `.js` specifiers that Node's TypeScript support will not remap onto the `.ts`
 * files beside them. Vitest already resolves them, and it is a dependency this
 * repository has anyway.
 *
 * It is deliberately outside `vitest.config.ts`'s `include`, so `pnpm test`
 * never runs it and never writes a file as a side effect of running the suite.
 * `pnpm accuracy` names it explicitly.
 */

import { writeFileSync } from "node:fs";

import { assertArrayEmpty } from "@kensio/smartass";
import { describe, it } from "vitest";

import corpus from "../test/hko-corpus.json" with { type: "json" };

import { explainChinese } from "../src/claim.js";
import { deltaTFor } from "../src/delta-t.js";
import { toChinese } from "../src/lunisolar.js";

/** Below this many minutes from midnight, a date is worth flagging. */
const FRAGILE_MINUTES = 10;

/** The band the differential sweep covers. */
const SWEEP_FROM = 1900;
const SWEEP_TO = 2100;

/** How many rows of each list to print before summarising the rest. */
const MAX_ROWS = 40;

interface Divergence {
  readonly iso: string;
  readonly nongli: string;
  readonly other: string;
  readonly marginMinutes: number;
}

const format = (value: {
  month: number;
  isLeap: boolean;
  day: number;
}): string =>
  `${value.isLeap ? "leap " : ""}M${String(value.month)}-${String(value.day)}`;

function icuAt(date: Temporal.PlainDate): {
  month: number;
  isLeap: boolean;
  day: number;
} {
  const chinese = date.withCalendar("chinese");
  const code = chinese.monthCode;
  return {
    month: Number(code.replaceAll(/[ML]/gu, "")),
    isLeap: code.endsWith("L"),
    day: chinese.day,
  };
}

/** Conformance against the Observatory, over the band its tables cover. */
function conformance(): { checked: number; wrong: Divergence[] } {
  const wrong: Divergence[] = [];

  for (const entry of corpus.entries) {
    const date = Temporal.PlainDate.from(entry.iso);
    const mine = toChinese(date);

    if (
      mine.month !== entry.month ||
      mine.isLeap !== entry.isLeap ||
      mine.day !== entry.day
    ) {
      wrong.push({
        iso: entry.iso,
        nongli: format(mine),
        other: format(entry),
        marginMinutes: explainChinese(date).margin.total("minutes"),
      });
    }
  }

  return { checked: corpus.entries.length, wrong };
}

/** Differential against ICU, and the fragility list, in one sweep. */
function sweep(): {
  checked: number;
  divergences: Divergence[];
  fragile: Divergence[];
  bands: Map<string, { total: number; differing: number }>;
} {
  const divergences: Divergence[] = [];
  const fragile: Divergence[] = [];
  const bands = new Map<string, { total: number; differing: number }>();

  for (let year = SWEEP_FROM; year <= SWEEP_TO; year++) {
    const band = `${String(Math.floor(year / 50) * 50)}s`;
    const tally = bands.get(band) ?? { total: 0, differing: 0 };

    for (let month = 1; month <= 12; month++) {
      for (const day of [1, 11, 21]) {
        const date = Temporal.PlainDate.from({ year, month, day });
        const claim = explainChinese(date);
        const mine = claim.value;
        const other = icuAt(date);
        const marginMinutes = claim.margin.total("minutes");

        tally.total++;

        if (marginMinutes < FRAGILE_MINUTES) {
          fragile.push({
            iso: date.toString(),
            nongli: format(mine),
            other: format(other),
            marginMinutes,
          });
        }

        if (
          mine.month !== other.month ||
          mine.isLeap !== other.isLeap ||
          mine.day !== other.day
        ) {
          tally.differing++;
          divergences.push({
            iso: date.toString(),
            nongli: format(mine),
            other: format(other),
            marginMinutes,
          });
        }
      }
    }

    bands.set(band, tally);
  }

  return {
    checked: [...bands.values()].reduce((sum, b) => sum + b.total, 0),
    divergences,
    fragile,
    bands,
  };
}

function rows(list: readonly Divergence[], otherName: string): string {
  const shown = list
    .slice(0, MAX_ROWS)
    .map(
      (row) =>
        `| ${row.iso} | ${row.nongli} | ${row.other} | ${row.marginMinutes.toFixed(2)} |`,
    )
    .join("\n");

  const rest =
    list.length > MAX_ROWS
      ? `\n\n${String(list.length - MAX_ROWS)} further rows not shown.`
      : "";

  return list.length === 0
    ? "None.\n"
    : `| Date | nongli | ${otherName} | Margin (min) |\n| --- | --- | --- | --- |\n${shown}${rest}\n`;
}

/**
 * The report itself.
 *
 * A module-level function so the markdown in the template literal below sits at
 * column zero. Indenting it inside a test block indents the generated file.
 */
function buildReport(
  conform: ReturnType<typeof conformance>,
  differential: ReturnType<typeof sweep>,
): string {
  const worstDivergence = Math.max(
    0,
    ...differential.divergences.map((row) => row.marginMinutes),
  );
  const bandRows = [...differential.bands.entries()]
    .map(
      ([band, tally]) =>
        `| ${band} | ${String(tally.total)} | ${String(tally.differing)} | ${((tally.differing / tally.total) * 100).toFixed(2)}% |`,
    )
    .join("\n");

  return `# Accuracy

Generated by \`pnpm accuracy\`. Every figure here is measured on the code in
this repository at the time it ran, and none of it is hand-written.

## 1. Conformance: the Hong Kong Observatory

The only section here that says nongli is **right** rather than merely
consistent with something else. The Observatory publishes the Gregorian-Lunar
conversion tables people actually read, so where nongli and any other
implementation disagree, this is what adjudicates.

- Dates checked: **${String(conform.checked)}**
- Range: **${corpus.coversFrom} to ${corpus.coversTo}**
- Agreement: **${(((conform.checked - conform.wrong.length) / conform.checked) * 100).toFixed(3)}%**

${rows(conform.wrong, "HKO")}
**This is one band and not a claim about centuries.** The Observatory's open
data covers ${corpus.coversFrom.slice(0, 4)} to ${corpus.coversTo.slice(0, 4)} and no more. A corpus reaching back through
the historical record, against 紫金山天文台 or Academia Sinica's two-thousand-year
converter, is what this repository still owes, and until it exists nothing here
supports a conformance claim before ${corpus.coversFrom.slice(0, 4)}.

## 2. Disagreement: the runtime's ICU calendar

A differential test. It finds where two implementations part company and says
nothing about which is right. It earns its place because of what the margins do.

- Dates checked: **${String(differential.checked)}** (${String(SWEEP_FROM)} to ${String(SWEEP_TO)})
- Disagreements: **${String(differential.divergences.length)}**
- Largest margin among them: **${worstDivergence.toFixed(2)} minutes**

| Band | Checked | Differing | Rate |
| --- | --- | --- | --- |
${bandRows}

${rows(differential.divergences, "ICU")}
**The prediction this library rests on** is that disagreements cluster at small
margins. A disagreement at a large margin would mean the margin is not measuring
distance-to-flipping, and the whole design would need rethinking.

## 3. Fragility: dates that could reasonably go either way

Every date in the sweep whose deciding instant sits within ${String(FRAGILE_MINUTES)} minutes of a
local midnight. Independent of any comparison, and nothing else publishes it.

- Fragile dates found: **${String(differential.fragile.length)}** of ${String(differential.checked)}

${rows(differential.fragile, "ICU")}
## ΔT

Every instant above is computed with nongli's own ΔT, from Stephenson, Morrison
and Hohenkerk (2016), rather than the ephemeris library's default.

| Year | ΔT (s) | Uncertainty (s) | Basis |
| --- | --- | --- | --- |
${[-3000, -720, 0, 1000, 1600, 1900, 2000, 2026, 2100]
  .map((year) => {
    const value = deltaTFor(year);
    return `| ${String(year)} | ${value.seconds.toFixed(1)} | ${value.uncertainty.toFixed(1)} | ${value.basis} |`;
  })
  .join("\n")}

## Sources

Gregorian-Lunar calendar conversion table, Hong Kong Observatory, from
DATA.GOV.HK. Contains information from DATA.GOV.HK. The intellectual property
rights in the data belong to the Government of the Hong Kong Special
Administrative Region and the relevant organisations.

Stephenson, F.R., Morrison, L.V. and Hohenkerk, C.Y. (2016), "Measurement of the
Earth's rotation: 720 BC to AD 2015", Proc. R. Soc. A 472:20160404.
`;
}

describe("accuracy", () => {
  it("measures accuracy and writes ACCURACY.md", () => {
    const conform = conformance();
    const differential = sweep();

    writeFileSync("ACCURACY.md", buildReport(conform, differential));

    console.log(
      `Conformance ${String(conform.checked - conform.wrong.length)}/${String(conform.checked)}, ` +
        `${String(differential.divergences.length)} ICU disagreements, ` +
        `${String(differential.fragile.length)} fragile dates. Wrote ACCURACY.md.`,
    );

    // The report is the artifact; this is the gate. A conformance slip has to
    // fail rather than be written quietly into a file nobody rereads.
    assertArrayEmpty(conform.wrong.map((row) => `${row.iso}: ${row.other}`));
  }, 300_000);
});
