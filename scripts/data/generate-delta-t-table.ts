/**
 * Regenerates `src/delta-t-table.ts` from the Stephenson, Morrison and
 * Hohenkerk (2016) supplementary data.
 *
 * The coefficients are published data rather than anything this repository
 * derives, so they are generated from the source file and never hand-edited.
 * Run with the path to `Table-S15.txt` from the paper's electronic
 * supplementary material:
 *
 * ```bash
 * node scripts/data/generate-delta-t-table.ts path/to/Table-S15.txt
 * ```
 *
 * The archive is `rspa20160404_si_002.zip`, published by the Royal Society with
 * MD5 `322c18c812171a2c0c959509e093faf4`. Node 26 runs this file directly, so
 * there is no build step to keep in sync.
 */

import { readFileSync, writeFileSync } from "node:fs";

const ROW =
  /^\s*\d+\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s*$/u;

const OUTPUT = "src/delta-t-table.ts";

function coefficientRows(source: string): number[][] {
  const rows = readFileSync(source, "utf8")
    .split("\n")
    .map((line) => ROW.exec(line))
    .filter((match) => match !== null)
    .map((match) => match.slice(1).map(Number));

  if (rows.length === 0) {
    throw new Error(`No coefficient rows matched in ${source}.`);
  }

  // The segments have to tile without gap, or a year between two of them would
  // have no polynomial and would fall through to the extrapolation without
  // saying so.
  for (const [index, row] of rows.entries()) {
    const next = rows[index + 1];
    if (next !== undefined && row[1] !== next[0]) {
      throw new Error(
        `Knot gap between rows ${String(index + 1)} and ${String(index + 2)}.`,
      );
    }
  }

  return rows;
}

function render(rows: readonly number[][]): string {
  const first = rows.at(0);
  const last = rows.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("No rows to render.");
  }

  const entries = rows.map((row) => `  [${row.join(", ")}],`).join("\n");

  return `/**
 * The Stephenson, Morrison and Hohenkerk (2016) cubic spline for ΔT.
 *
 * **Generated. Do not edit.** Run \`scripts/data/generate-delta-t-table.ts\`
 * against the paper's own \`Table-S15.txt\` to rebuild it.
 *
 * ## Provenance
 *
 * Table S15 of the electronic supplementary material to Stephenson, F.R.,
 * Morrison, L.V. and Hohenkerk, C.Y. (2016), "Measurement of the Earth's
 * rotation: 720 BC to AD 2015", Proc. R. Soc. A 472:20160404,
 * https://doi.org/10.1098/rspa.2016.0404
 *
 * Retrieved from the Royal Society's figshare record as
 * \`rspa20160404_si_002.zip\`, MD5 \`322c18c812171a2c0c959509e093faf4\`.
 *
 * ## Reading a row
 *
 * Each row is \`[fromYear, toYear, a0, a1, a2, a3]\`. For a year \`Y\` with
 * \`fromYear <= Y <= toYear\`, the paper's own instruction is
 *
 * > t = (Y - K_i)/(K_{i+1} - K_i), where 0 <= t < 1, and thus calculate
 * > DT = a_0 + a_1 t + a_2 t^2 + a_3 t^3 seconds.
 *
 * so \`t\` is the fraction of the way through a segment and never the year
 * itself. The segments tile ${String(first[0])} to ${String(last[1])} without gap.
 */

/** One spline segment: \`[fromYear, toYear, a0, a1, a2, a3]\`. */
export type DeltaTSegment = readonly [
  from: number,
  to: number,
  a0: number,
  a1: number,
  a2: number,
  a3: number,
];

/** The first year the spline covers. */
export const SPLINE_FROM_YEAR = ${String(first[0])};

/** The last year the spline covers. */
export const SPLINE_TO_YEAR = ${String(last[1])};

/** The ${String(rows.length)} segments, in order, tiling the whole range. */
export const DELTA_T_SPLINE: readonly DeltaTSegment[] = [
${entries}
];
`;
}

const source = process.argv[2];
if (source === undefined) {
  throw new Error("Usage: generate-delta-t-table.ts <path to Table-S15.txt>");
}

const rows = coefficientRows(source);
writeFileSync(OUTPUT, render(rows));
console.log(
  `Wrote ${OUTPUT}: ${String(rows.length)} segments, ${String(rows.at(0)?.[0])} to ${String(rows.at(-1)?.[1])}.`,
);
