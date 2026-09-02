/**
 * Builds `test/hko-corpus.json` from the Hong Kong Observatory's published
 * Gregorian-Lunar calendar conversion tables.
 *
 * ```bash
 * node scripts/data/generate-hko-corpus.ts path/to/csv/directory
 * ```
 *
 * ## Why this exists
 *
 * Agreement with the runtime's ICU calendar is a differential test. Two
 * implementations can share a mistake and agree perfectly while both are wrong,
 * and neither of them is an authority. The Observatory is one. Its tables are
 * what people in Hong Kong actually read, and where nongli and ICU disagree it
 * is the Observatory that adjudicates.
 *
 * ## Provenance and licence
 *
 * Gregorian-Lunar calendar conversion table, Hong Kong Observatory, published
 * on DATA.GOV.HK at
 * https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table
 *
 * DATA.GOV.HK's terms allow the data to be downloaded, reproduced and
 * distributed for commercial and non-commercial purposes free of charge,
 * provided the source is identified and the Government's and the relevant
 * organisations' ownership of the intellectual property is acknowledged. The
 * generated file carries that acknowledgement, and so does the report the
 * corpus feeds.
 *
 * The published tables run 2023 to 2028. That is the whole modern band and no
 * more, and the report says so rather than implying centuries of conformance.
 *
 * ## Why `scripts/` is outside the complexity cap
 *
 * `fta.json` excludes this directory, on the same grounds it already excludes
 * `*.test.ts`. The cap exists to keep shipped code maintainable, and nothing
 * here ships. A generator is also checked differently from library code: its
 * output is committed and validated by the conformance suite, so a mistake in
 * it fails a test rather than hiding.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUTPUT = "test/hko-corpus.json";

/** 正月 through 十二月, in order. A leap month carries the 閏 prefix. */
const MONTH_NAMES = [
  "正月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];

const LEAP_PREFIX = "閏";

/**
 * The thirty day names, indexed by the day they mean.
 *
 * A lunar month has 29 or 30 days and the naming is irregular in three places
 * (初十, 二十, 三十), so enumerating them is shorter and clearer than decoding
 * the numerals. Index 0 is unused so the index is the day number.
 */
const DAY_NAMES = [
  "",
  "初一",
  "初二",
  "初三",
  "初四",
  "初五",
  "初六",
  "初七",
  "初八",
  "初九",
  "初十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "廿一",
  "廿二",
  "廿三",
  "廿四",
  "廿五",
  "廿六",
  "廿七",
  "廿八",
  "廿九",
  "三十",
];

const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface CorpusEntry {
  /** ISO date, e.g. `"2026-02-17"`. */
  readonly iso: string;
  /** 1 to 12. */
  readonly month: number;
  readonly isLeap: boolean;
  /** 1 to 30. */
  readonly day: number;
  /** The sexagenary year as the Observatory prints it, e.g. `"丙午"`. */
  readonly ganzhiYear: string;
  /** The zodiac animal as the Observatory prints it, in traditional script. */
  readonly zodiac: string;
}

function parseMonth(text: string): { month: number; isLeap: boolean } {
  const isLeap = text.startsWith(LEAP_PREFIX);
  const name = isLeap ? text.slice(LEAP_PREFIX.length) : text;
  const index = MONTH_NAMES.indexOf(name);

  if (index === -1) {
    throw new Error(`Unrecognised lunar month "${text}".`);
  }
  return { month: index + 1, isLeap };
}

function parseDay(text: string): number {
  const day = DAY_NAMES.indexOf(text);
  if (day < 1) {
    throw new Error(`Unrecognised lunar day "${text}".`);
  }
  return day;
}

/** `"17-Feb-26"` in a file for 2026 becomes `"2026-02-17"`. */
function parseGregorian(text: string, fileYear: number): string {
  const parts = text.split("-");
  const day = Number(parts[0]);
  const month = MONTH_ABBREVIATIONS.indexOf(parts[1] ?? "") + 1;

  if (!Number.isInteger(day) || month === 0) {
    throw new Error(`Unrecognised Gregorian date "${text}".`);
  }

  return `${String(fileYear)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function entriesFrom(csv: string, fileYear: number): CorpusEntry[] {
  // The files are CRLF and at least one has no trailing newline, so rows are
  // trimmed individually rather than the file being split naively.
  return csv
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [date, ganzhi, zodiac, month, day] = line.split(",");
      if (
        date === undefined ||
        ganzhi === undefined ||
        zodiac === undefined ||
        month === undefined ||
        day === undefined
      ) {
        throw new Error(`Short row in ${String(fileYear)}: "${line}"`);
      }

      const { month: number, isLeap } = parseMonth(month);
      return {
        iso: parseGregorian(date, fileYear),
        month: number,
        isLeap,
        day: parseDay(day),
        // The Observatory writes "丙午年"; the year name is the first two.
        ganzhiYear: ganzhi.replace("年", ""),
        zodiac,
      };
    });
}

const directory = process.argv[2];
if (directory === undefined) {
  throw new Error("Usage: generate-hko-corpus.ts <directory of HKO CSV files>");
}

const entries = readdirSync(directory)
  .filter((name) => name.endsWith(".csv"))
  .toSorted()
  .flatMap((name) => {
    const year = Number(/(\d{4})/u.exec(name)?.[1]);
    if (!Number.isInteger(year)) {
      throw new TypeError(`Cannot read a year from the filename "${name}".`);
    }
    return entriesFrom(readFileSync(path.join(directory, name), "utf8"), year);
  });

if (entries.length === 0) {
  throw new Error(`No rows parsed from ${directory}.`);
}

const corpus = {
  source: "Gregorian-Lunar calendar conversion table, Hong Kong Observatory",
  url: "https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table",
  acknowledgement:
    "Contains information from DATA.GOV.HK. The intellectual property rights " +
    "in the data belong to the Government of the Hong Kong Special " +
    "Administrative Region and the relevant organisations.",
  retrieved: new Date().toISOString().slice(0, 10),
  coversFrom: entries.at(0)?.iso,
  coversTo: entries.at(-1)?.iso,
  entries,
};

writeFileSync(OUTPUT, `${JSON.stringify(corpus, undefined, 2)}\n`);
console.log(
  `Wrote ${OUTPUT}: ${String(entries.length)} dates, ${String(corpus.coversFrom)} to ${String(corpus.coversTo)}.`,
);
