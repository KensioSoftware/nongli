# Concepts

The vocabulary this library uses, for developers who do not happen to be
astronomers. Nothing here assumes any background beyond knowing what a calendar
is for.

Read this once and the rest of the API reads plainly.

## The 农历 is decided by two moving things

The Chinese calendar is **lunisolar**: its months follow the Moon and its year
follows the Sun. That is the whole shape of it, and every term below is a detail
of one of those two.

- The **Moon** decides where months begin and end.
- The **Sun** decides which month is which, and which years get an extra one.

A purely lunar calendar drifts against the seasons, roughly eleven days a year.
A purely solar one has no months worth the name. The 农历 keeps both, and the
price is the leap-month rule further down.

## New moon, and why the code says "conjunction"

A **new moon** is not "when you can first see a thin crescent". It is the moment
the Moon passes between the Earth and the Sun — so the side facing us is
unlit, and the Moon is invisible.

Astronomers call that moment the **conjunction**: the Moon and the Sun are in the
same direction from Earth. It is a precise instant, computable to the second, and
it is what this library means every time it says "new moon".

**This distinction matters and is a common way to be a day or two wrong.** Some
lunar calendars — the Islamic one traditionally among them — begin a month at
_first visibility of the crescent_, which happens a day or two after the
conjunction and depends on where the observer is standing, how clear the sky is,
and how good their eyes are. The 农历 does not work that way. It uses the
conjunction, which is the same instant for everyone on Earth.

> **A lunar month begins on the day containing the new moon.**

Two consecutive new moons are a **synodic month** apart — about 29.5 days, but
genuinely variable between roughly 29.3 and 29.8 because neither the Moon's orbit
around Earth nor Earth's around the Sun is a circle. That is why lunar months are
sometimes 29 days and sometimes 30, and why you cannot compute them by
multiplication.

## Ecliptic longitude, or: where the Sun is in the year

Over a year the Sun appears to travel a full circle against the background stars.
The path it traces is the **ecliptic**, and its position along that path is
measured in degrees from 0 to 360. That angle is its **ecliptic longitude**.

You can read it as "how far through the year the Sun is", measured in degrees
rather than days:

| Longitude | Moment            |
| --------- | ----------------- |
| 0°        | March equinox     |
| 90°       | June solstice     |
| 180°      | September equinox |
| 270°      | December solstice |

Degrees rather than days because days are what we are trying to work out. The
seasons are fixed points in the Sun's circuit; the calendar dates they land on
are the answer, not the question.

"**Apparent**" and "**geocentric**", when the code says them, mean _as seen from
Earth, including the small corrections for light taking time to arrive and for
the Earth's motion_. They matter for accuracy and never change what the number
means.

## Solar terms (二十四节气)

Cut that 360° circle into twenty-four equal slices of 15° and you have the
**solar terms** — twenty-four moments spread through the year, about a fortnight
apart, each with a name describing the season: 立春 "start of spring", 大雪
"heavy snow", 冬至 the December solstice.

They are a **solar** feature living inside a lunisolar calendar, which is why
they fall on nearly the same Gregorian date every year while lunar months wander.

Every other one — the twelve at multiples of 30° — is a **中气**, a _major_ term.
That distinction sounds like trivia and is load-bearing:

> **A lunar month containing no 中气 is a leap month.**

## Why an instant is not a date

This is the single most important idea in the library, and the reason so many
functions return `Temporal.Instant` rather than a date.

A new moon happens at one moment, the same moment for everybody. But **which day
that moment falls on depends on where you are.** A conjunction at 23:50 in
Beijing is 15:50 the same day in London and 10:50 in New York — usually the same
date, but not always, and the exceptions are exactly the interesting cases.

So an instant is a fact, and a date is a fact _plus a place_. This library keeps
them apart:

- Astronomy returns **instants** — objective, no place needed.
- Turning one into a **date** requires a meridian, and is a separate step.

The modern 农历 is computed against **UTC+8**, the meridian at 120°E, fixed by
China in 1928. Before that it used Beijing local time, about a quarter of an hour
different — which is enough to move a date. Vietnam's calendar uses UTC+7 and
Korea's UTC+9, which is why those calendars occasionally disagree with the
Chinese one despite following identical rules.

## How the calendar is assembled

Three rules, using everything above:

1. **A month begins on the day containing a new moon.**
2. **Month 11 is the month containing 冬至**, the December solstice, at 270°.
3. **If thirteen months fall between one month 11 and the next, one is a leap
   month — the first of them containing no 中气.** It takes the number of the
   month before it, marked 闰.

Everything else the library computes is a consequence of those three.

## Why boundaries are the hard part

Notice that every rule above turns on _which day contains_ something. That makes
the whole calendar a set of threshold comparisons against local midnight — and a
new moon at 23:58 is eight minutes from starting its month a day later.

This is nongli's central concern rather than an edge case. Most dates are
comfortably clear of a boundary; a small, identifiable minority are not, and
those are precisely where implementations disagree with each other. The library
is designed to be able to tell you which is which.

<!-- card
```ts
// A new moon is a conjunction: one instant, the same for everyone.
const moon = newMoonFrom(Temporal.Instant.from("2026-02-01T00:00:00Z"));
moon.toZonedDateTimeISO("+08:00").toPlainDate().toString();
// "2026-02-17" — the day that contains it, in China
```
-->
