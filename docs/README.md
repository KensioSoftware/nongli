# nongli documentation

The long form of the [README](../README.md). The README is the tour; these pages
are the same material with room to explain itself, one topic at a time.

They are also the source for [nongli.dev](https://nongli.dev), which copies each
`docs/<path>/README.md` here to a page there. **Edit them here.** A change made
on the site is a change that will be overwritten.

## Start here

- [Concepts](concepts/): what a new moon actually is, what the solar terms
  measure, why an instant is not a date, and the three rules the whole calendar
  is built from. **Written for developers rather than astronomers** — if any of
  the vocabulary in the API surprises you, it is defined here.

## Status

Early. There is a published package, and what these pages describe is what is in
it: the sexagenary cycle, the twenty-four solar terms, and new moons.

Pages documenting a Gregorian ↔ 农历 conversion are deliberately absent, because
that conversion does not exist yet. It needs a meridian and the month-numbering
rules on top of the astronomy that is here — see
[Concepts](concepts/#how-the-calendar-is-assembled) for what remains. A
documented function that does not exist is worse than an undocumented one that
does.

## How these pages work

The site scaffold has a contract, and `pnpm docs:check` enforces it here so that
a break is found in review rather than at deploy time.

- **One page per directory.** `docs/<path>/README.md` becomes the page at
  `<path>` on the site.
- **This file is the exception.** The docs root README is an index for people
  browsing the repo on GitHub; the site has its own home page, so this one is not
  copied.
- **The H1 becomes the page title** and is lifted out of the body.
- **Link between pages relatively** — `[concepts](../concepts/)` — so the same
  link resolves both on GitHub and on the site.
- **Every page ends with a `<!-- card -->` comment** holding the code snippet its
  social image shows. It renders nowhere, and the scaffold fails on a page
  without one. Six lines of about sixty characters is what the image holds, and
  hanzi are drawn wide, so keep a card to two or three of them per line.
