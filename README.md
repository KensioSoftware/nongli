# Nongli

Chinese calendrical and historical chronology utilities for JavaScript and
Temporal.

New to the vocabulary — new moons, solar terms, why an instant is not a date?
**[Start with the concepts guide](docs/concepts/).** It assumes no astronomy.

## Install

```bash
pnpm add @kensio/nongli
```

Node 26 or later, or a browser with `Temporal`. The package reads the global
rather than bundling a polyfill, so anywhere without one natively can load
`temporal-polyfill` first and everything here works untouched.

## What is in it so far

The calendar, the astronomy it is built from, and the sexagenary cycle.

### Converting dates

```ts
import { chineseNewYear, fromChinese, toChinese } from "@kensio/nongli";

toChinese(Temporal.PlainDate.from("2026-02-17"));
// { year: 2026, month: 1, isLeap: false, day: 1 } — 春节

fromChinese({ year: 2026, month: 1, day: 1 }).toString();
// "2026-02-17"

chineseNewYear(2033).toString(); // "2033-01-31"
```

Leap months are placed by the 时宪历 rule, so 2033 comes out as 闰十一月:

```ts
import { isLeapYear, lunisolarYear } from "@kensio/nongli";

isLeapYear(2033); // true
lunisolarYear(2033).filter((month) => month.isLeap);
// [{ number: 11, isLeap: true, start: 2033-12-22, ... }]
```

2033 is the case naive implementations get wrong. Its year has **two** months
containing no 中气, so a rule stated as "the month with no 中气" has two answers
and needs the word _first_ to have one. Implementations that drop it produce
闰七月.

### Showing its working

Every rule of this calendar asks whether an astronomical instant falls before or
after a local midnight, so every answer has a computable distance from being a
different answer. `explainChinese` reports it.

```ts
import { explainChinese } from "@kensio/nongli";

const claim = explainChinese(Temporal.PlainDate.from("2057-09-28"));

claim.value; // { year: 2057, month: 8, isLeap: false, day: 30 }
claim.margin.total("minutes"); // 0.67

claim.day.deciding.map((event) => [event.role, event.margin.total("minutes")]);
// [["month start", 715.1], ["month end", 0.67]]
```

Your runtime says month 9 day 1 for that date. Both answers are defensible, and
nongli can say why they part company. The conjunction closing the month falls
**40 seconds** after local midnight in Beijing.

Measured across 1900 to 2100, nongli and the runtime's ICU calendar disagree on
15 dates out of 7,236. Every one has a margin under six minutes, and out of
7,023 dates more than ten minutes from a midnight, none disagrees at all.

The margin is a duration, and a duration is all it is. It never estimates a
probability of being wrong.

### Whether anyone published the answer

A margin says how close a date came to being a different date. It says nothing
about whether the date means anything, and the two fail independently.

```ts
import { explainChinese } from "@kensio/nongli";

const ancient = explainChinese(Temporal.PlainDate.from("1500-06-15"));
ancient.margin.total("minutes"); // 472 — nowhere near a boundary
ancient.basis; // { kind: "computed", source: undefined }
```

That date is as arithmetically safe as a date gets, and the answer is still
worth very little. 时宪历 was not adopted until 1645. This is a modern rule run
backwards through 145 years that used a different one.

Three states:

| `basis.kind` | meaning                                                                         |
| ------------ | ------------------------------------------------------------------------------- |
| `published`  | nongli holds a published source covering this date, and names it                |
| `in-force`   | the calendar was in actual use, but nongli holds no source                      |
| `computed`   | rules run back before the model was adopted, or forward past anything published |

`computed` covers both directions on purpose. The 农历 is _promulgated_. A date
in 2200 is un-attested in exactly the way one in 200 CE is, and nobody has
published either.

### Its own ΔT

ΔT is the gap between the uniform time an ephemeris computes in and the Earth's
actual rotation, which is what local midnight follows. Every conversion from an
instant to a date runs through it. An error of E minutes puts roughly E/1440 of
all dates on the wrong day.

It is also the one term that comparing two ephemerides cannot reveal, because
the usual candidates all inherit the same polynomials. So nongli supplies its
own, from Stephenson, Morrison and Hohenkerk (2016), fitted to Babylonian,
Chinese, Greek and Arab eclipse records.

```ts
import { deltaTFor } from "@kensio/nongli";

deltaTFor(1600); // { seconds: 89.4, uncertainty: 3.0, basis: "fitted" }
deltaTFor(-1000); // { seconds: 25437.3, uncertainty: 478.8, basis: "extrapolated" }
deltaTFor(2100); // { seconds: 201.3, uncertainty: 4.5, basis: "projected" }
```

`basis` says whether a value is fitted to observations, extrapolated behind them
or projected ahead of them. `uncertainty` comes from the ± the paper states on
its own coefficient. That makes it a published quantity.

### One engine, one parameter, the whole family

The lunisolar rules never mention China. They say "the day containing the new
moon", and which day that is depends on the meridian whose midnight it is
measured against. So the meridian is a parameter, and the same engine produces
âm lịch and 음력.

```ts
import { toChinese, VIETNAM_STANDARD } from "@kensio/nongli";

const date = Temporal.PlainDate.from("1985-01-21");

toChinese(date); // { year: 1984, month: 12, isLeap: false, day: 1 }
toChinese(date, { place: VIETNAM_STANDARD });
// { year: 1985, month: 1, isLeap: false, day: 1 }
```

That is the real 1985 divergence, when Tết fell a day apart from 春节. Other
implementations ship it as a second hardcoded table. Here it falls out of the
one computation, and the margin says in advance which dates are at risk of it.

`CHINA_STANDARD` (the default), `BEIJING_LOCAL` (the pre-1928 meridian),
`VIETNAM_STANDARD` and `KOREA_STANDARD` are provided, and a `Place` is just a
longitude, a latitude and a name.

### The twenty-four solar terms (二十四节气)

Twenty-four moments spread through the year, a fortnight apart, marking the
seasons. Twelve of them — the 中气 — are what the leap-month rule reads.

```ts
import { solarTermsIn, solarTermNamed } from "@kensio/nongli";

const terms = solarTermsIn(2026);
terms.length; // 24
terms[0]?.term.name; // "小寒"
terms[0]?.instant.toZonedDateTimeISO("+08:00").toPlainDate().toString();
// "2026-01-05"

solarTermNamed("冬至")?.longitude; // 270 — the December solstice
solarTermNamed("驚蟄")?.name; // "惊蛰" — either script works
```

### New moons (朔)

The moment the Moon passes between Earth and Sun. A lunar month begins on the
day containing one.

```ts
import { newMoonFrom, newMoonsBetween } from "@kensio/nongli";

const moon = newMoonFrom(Temporal.Instant.from("2026-02-01T00:00:00Z"));
moon.toZonedDateTimeISO("+08:00").toPlainDate().toString();
// "2026-02-17" — which is 春节 2026

newMoonsBetween(
  Temporal.Instant.from("2026-01-01T00:00:00Z"),
  Temporal.Instant.from("2027-01-01T00:00:00Z"),
).length; // 12
```

### The sexagenary cycle (干支)

Ten Heavenly Stems and twelve Earthly Branches turning together, meeting again
after sixty.

```ts
import { sexagenary, sexagenaryOf } from "@kensio/nongli";

sexagenary(0); // { index: 0, stem: "甲", branch: "子" }
sexagenary(-1); // { index: 59, stem: "癸", branch: "亥" } — it wraps
sexagenaryOf("甲", "寅")?.index; // 50 — the rings turn at different rates
sexagenaryOf("甲", "丑"); // undefined — that pairing never occurs
```

Ask a date for its year and its animal:

```ts
import { sexagenaryYearOf, zodiacOf } from "@kensio/nongli";

const date = Temporal.PlainDate.from("2026-06-15");
sexagenaryYearOf(date); // { index: 42, stem: "丙", branch: "午" }
zodiacOf(date).name; // "马"
zodiacOf(date).english; // "horse"
```

### Where the 干支 year turns, and why you get a say

Two traditions put the boundary in different places and both are in use. The
calendar turns the year at 正月初一, the lunisolar New Year. 四柱 and the
practices built on it turn it at 立春, the solar term at 315°.

They disagree for the days in between, which can be a fortnight apart:

```ts
// 2024: 立春 fell on 4 February, New Year on the 10th.
const between = Temporal.PlainDate.from("2024-02-06");

zodiacOf(between).english; // "rabbit" — the calendar's answer
zodiacOf(between, { boundary: "lichun" }).english; // "dragon"
```

Neither is a mistake, and someone born on that day has two defensible animals.
The default is the calendar's, because that is what this library converts and
what the Observatory prints. Anyone wanting the other has to say so.

## Why the astronomy returns instants

The solar term and new moon functions return a `Temporal.Instant`, never a date.
That is deliberate and it is the idea the whole library turns on.

A new moon happens at one moment, the same moment for everyone. But **which day
that moment falls on depends on where you are.** A conjunction at 23:50 in
Beijing is 15:50 the same day in London — usually the same date, and sometimes
not. So an instant is a fact, and a date is a fact plus a place.

Turning one into the other needs a meridian, which is why `toChinese` takes a
`Place` and the astronomy functions do not.
[The concepts guide](docs/concepts/) explains why it matters more here than it
sounds like it should.

## Accuracy is measured, not asserted

`pnpm accuracy` regenerates [ACCURACY.md](ACCURACY.md) from the code as it
stands. Three reports:

- **Conformance** against the Hong Kong Observatory, which publishes the tables
  people actually read. **100% on all 2,192 published dates**, 2023 to 2028,
  including three leap months, and on the sexagenary year of every one. This is
  the only figure that says nongli is _right_. The other two say it is
  consistent.
- **Disagreement** with the runtime's ICU calendar over 1900 to 2100. Fifteen
  dates out of 7,236, every one at a margin under six minutes.
- **Fragility**: the 145 dates whose deciding instant sits within ten minutes of
  the boundary that would move it. Nothing else publishes this.

## Status

Small, and honest about it. Still to come:

- **Historical calendar models.** Only 时宪历 is implemented, the rule in force
  since 1645. A date before then is modern rules run backwards, and `basis`
  now says so, but the calendars actually in use at the time are still absent.
- **A conformance corpus with any depth.** The Observatory's open data covers
  2023 to 2028 and no more. Nothing here supports a conformance claim before 2023. A corpus traced to 紫金山天文台 or Academia Sinica's two-thousand-year
  converter is the next thing this repository owes you.
- **四柱**, the hours of the day (时辰, 刻, the night watches), and regnal dates.
- **The 干支 of a _day_**. The year is here. The day is a continuous count with
  a contested boundary at 子时, and nongli holds no authority to check an epoch
  for it against. Guessing one would be the sort of unmeasured claim the rest of
  this README exists to avoid.

## Documentation

- **[Concepts](docs/concepts/)** — the vocabulary, and the three rules the
  calendar is assembled from. Written for developers rather than astronomers.

## Licence

Apache-2.0
