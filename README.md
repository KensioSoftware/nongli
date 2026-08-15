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

Early days. The astronomy the calendar is built from, and the sexagenary cycle.
A Gregorian ↔ 农历 conversion is **not here yet** — see [status](#status).

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

## Why instants and not dates

Every function above returns a `Temporal.Instant`, never a date. That is
deliberate and it is the idea the whole library turns on.

A new moon happens at one moment, the same moment for everyone. But **which day
that moment falls on depends on where you are.** A conjunction at 23:50 in
Beijing is 15:50 the same day in London — usually the same date, and sometimes
not. So an instant is a fact, and a date is a fact plus a place.

Turning one into the other needs a meridian, and that is a separate step this
library has not yet taken. [The concepts guide](docs/concepts/) explains why it
matters more here than it sounds like it should.

## Status

Published, small, and honest about it. What exists is the astronomy and the
cycle; what does not is the calendar built on top of them — month numbering,
leap months, and therefore Gregorian ↔ 农历 conversion.

If you need that conversion today, your runtime already has one:

```ts
Temporal.PlainDate.from("2026-02-17").withCalendar("chinese").monthCode; // "M01"
```

What that cannot tell you is how close the answer came to being a different one,
which meridian it assumed, or whether it means anything as history. Those are
what this library is being built to answer.

## Documentation

- **[Concepts](docs/concepts/)** — the vocabulary, and the three rules the
  calendar is assembled from. Written for developers rather than astronomers.

## Licence

Apache-2.0
