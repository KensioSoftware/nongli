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
after sixty. Pure arithmetic — this makes no claim about which term falls on a
given date.

```ts
import { sexagenary, sexagenaryOf } from "@kensio/nongli";

sexagenary(0); // { index: 0, stem: "甲", branch: "子" }
sexagenary(-1); // { index: 59, stem: "癸", branch: "亥" } — it wraps
sexagenaryOf("甲", "寅")?.index; // 50 — the rings turn at different rates
sexagenaryOf("甲", "丑"); // undefined — that pairing never occurs
```

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

## Status

Small, and honest about it. The modern calendar works and is measured against
the runtime across 1900 to 2100. Still to come:

- **Historical calendar models.** Only 时宪历 is implemented, the rule in force
  since 1645. Ask for a date before then and you get modern rules run backwards,
  with the answer still silent about it.
- **nongli's own ΔT.** Every instant currently carries `astronomy-engine`'s
  default Espenak & Meeus polynomials. ΔT is what turns an instant into a civil
  date, and it reaches 2.9 hours by 1 CE, so historical answers are worth much
  less than modern ones until this lands.
- **干支 for a date**, 四柱, the hours of the day, and regnal dates.

Accuracy has not been measured against 紫金山天文台 or the Hong Kong Observatory,
only against ICU. That is a differential test, and two implementations sharing a
mistake would agree just as well. A conformance suite against a published
authority is the next thing this repository owes you.

## Documentation

- **[Concepts](docs/concepts/)** — the vocabulary, and the three rules the
  calendar is assembled from. Written for developers rather than astronomers.

## Licence

Apache-2.0
