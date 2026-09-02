import {
  assertIdentical,
  assertNonNullable,
  assertTrue,
  assertUndefined,
} from "@kensio/smartass";
import { describe, it } from "vitest";

import corpus from "#test/hko-corpus.json" with { type: "json" };
import { on } from "#test/calendar.js";

import { explainChinese } from "./claim.js";
import { basisFor, modelFor, SHIXIAN } from "./models.js";

describe("what backs an answer", () => {
  describe("basisFor", () => {
    it("names the authority for a year nongli holds a source for", () => {
      // Given a year inside the published range.
      // When its basis is read.
      // Then it is published and the authority is named. A caller who wants to
      // check the answer needs somewhere to go.
      const basis = basisFor(2026, "shixian");

      assertIdentical(basis.kind, "published");
      assertIdentical(basis.source, "Hong Kong Observatory");
    });

    it("says in-force where the calendar was used but nongli holds nothing", () => {
      // Given 1800, when 时宪历 had been the calendar of record for 155 years.
      // When its basis is read.
      // Then it is in-force with nobody named. The calendar was published that
      // year and nongli has no copy, and saying "attested" would claim
      // something the library cannot show.
      const basis = basisFor(1800, "shixian");

      assertIdentical(basis.kind, "in-force");
      assertUndefined(basis.source);
    });

    it("calls a date before the model was adopted computed", () => {
      // Given 1500, when 时宪历 did not exist.
      // When its basis is read.
      // Then it is computed. An answer here is a modern rule run backwards
      // through a period that used a different one, which is a worse failure
      // than merely having no published copy.
      assertIdentical(basisFor(1500, "shixian").kind, "computed");
      assertIdentical(
        basisFor(SHIXIAN.inForceFrom - 1, "shixian").kind,
        "computed",
      );
      assertIdentical(
        basisFor(SHIXIAN.inForceFrom, "shixian").kind,
        "in-force",
      );
    });

    it("treats the far future exactly like the far past", () => {
      // Given a year beyond anything published and one before the model.
      // When both are read.
      // Then both are computed. The 农历 is promulgated, so a date nobody has
      // published yet is un-attested in precisely the way an ancient one is.
      // That symmetry is the whole reason this field is not called "historical".
      assertIdentical(basisFor(2200, "shixian").kind, "computed");
      assertIdentical(basisFor(200, "shixian").kind, "computed");
    });

    it("changes state exactly at the published boundaries", () => {
      // Given the years either side of the published range.
      // When each is read.
      // Then the range is closed at both ends. An off-by-one here would have
      // the library claiming a source it does not hold.
      assertIdentical(
        basisFor(SHIXIAN.publishedFrom - 1, "shixian").kind,
        "in-force",
      );
      assertIdentical(
        basisFor(SHIXIAN.publishedFrom, "shixian").kind,
        "published",
      );
      assertIdentical(
        basisFor(SHIXIAN.publishedTo, "shixian").kind,
        "published",
      );
      assertIdentical(
        basisFor(SHIXIAN.publishedTo + 1, "shixian").kind,
        "computed",
      );
    });
  });

  describe("the published range is the one nongli can show", () => {
    it("matches the corpus the conformance suite checks against", () => {
      // Given the model's published range and the corpus.
      // When the two are compared.
      // Then they agree. The field would be a lie if the library claimed a
      // published source for a year the corpus does not cover, and this is the
      // assertion that keeps the two from drifting apart.
      assertIdentical(
        SHIXIAN.publishedFrom,
        Number(corpus.coversFrom.slice(0, 4)),
      );
      assertIdentical(SHIXIAN.publishedTo, Number(corpus.coversTo.slice(0, 4)));
    });
  });

  describe("on a claim", () => {
    it("is carried on every claim, alongside the margin", () => {
      // Given a date the library answers for.
      // When its claim is read.
      // Then it carries a basis as well as a margin.
      const claim = explainChinese(on("2026-02-17"));

      assertIdentical(claim.basis.kind, "published");
      assertIdentical(claim.model, "shixian");
    });

    it("flags a safe-looking ancient date as computed", () => {
      // Given 1500-06-15, which sits hours from any boundary and is therefore
      // as arithmetically safe as a date gets.
      // When the claim is read.
      // Then the margin is large and the basis is computed. This is the case
      // the whole field exists for: the two measure different things and fail
      // independently, and a margin alone would have called this date sound.
      const claim = explainChinese(on("1500-06-15"));

      assertTrue(claim.margin.total("minutes") > 60);
      assertIdentical(claim.basis.kind, "computed");
    });

    it("reads the basis from the lunisolar year and not the Gregorian one", () => {
      // Given a January date whose lunisolar year is the one before it.
      // When the claim is read.
      // Then the basis follows the lunisolar year. The model is a calendar and
      // its range is in that calendar's own years.
      const claim = explainChinese(on("2023-01-10"));

      assertIdentical(claim.value.year, 2022);
      assertIdentical(claim.basis.kind, "in-force");
    });
  });

  describe("modelFor", () => {
    it("resolves the only model there is", () => {
      // Given the one implemented model.
      // When it is looked up by id.
      // Then the model comes back with the range its answers are worth
      // anything over.
      const model = modelFor("shixian");
      assertNonNullable(model);

      assertIdentical(model.name, "时宪历");
      assertIdentical(model.inForceFrom, 1645);
    });
  });
});
