import { describe, expect, test } from "bun:test";

import { provinceCode, suggestionsFromPhoton } from "@/lib/geocode/address";

// ============================================================================
// Reading an address out of a geocoder's answer.
//
// This tier, rather than a spec, for the reason tests/unit exists at all: it
// is pure, it is the part that can be quietly wrong, and asserting it through
// a browser would mean a real network call to a third party on every run.
//
// The shape below is a REAL response, taken from
// photon.komoot.io/api/?q=1200 rue Sainte-Catherine Montreal — not invented,
// because the fields a provider actually sets is exactly what a hand-written
// fixture gets wrong.
// ============================================================================

const MONTREAL = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        osm_type: "N",
        osm_id: 11972683246,
        osm_key: "place",
        osm_value: "house",
        type: "house",
        housenumber: "1200",
        street: "Rue Sainte-Catherine Est",
        locality: "Gay Village",
        district: "Ville-Marie",
        city: "Montreal",
        county: "Urban agglomeration of Montreal",
        state: "Quebec",
        country: "Canada",
        postcode: "H2L 2H7",
        countrycode: "CA",
      },
      geometry: { type: "Point", coordinates: [-73.5559086, 45.5183315] },
    },
  ],
};

describe("a province becomes the code a form asks for", () => {
  test("the full name maps to two letters", () => {
    expect(provinceCode("Quebec")).toBe("QC");
    expect(provinceCode("British Columbia")).toBe("BC");
    expect(provinceCode("Newfoundland and Labrador")).toBe("NL");
  });

  test("accents and case do not change the answer", () => {
    // `lang=fr` returns "Québec"; `lang=en` returns "Quebec". Same province.
    expect(provinceCode("Québec")).toBe("QC");
    expect(provinceCode("québec")).toBe("QC");
  });

  test("the FRENCH name of every province maps too", () => {
    // The route asks Photon for `lang=fr` when the reader is reading French,
    // and Photon answers "Nouvelle-Écosse". An English-only map looked
    // complete because "Québec" folds to "quebec" and matched by accident —
    // every other province put a French sentence in a two-letter field.
    expect(provinceCode("Nouvelle-Écosse")).toBe("NS");
    expect(provinceCode("Colombie-Britannique")).toBe("BC");
    expect(provinceCode("Nouveau-Brunswick")).toBe("NB");
    expect(provinceCode("Terre-Neuve-et-Labrador")).toBe("NL");
    expect(provinceCode("Île-du-Prince-Édouard")).toBe("PE");
    expect(provinceCode("Territoires du Nord-Ouest")).toBe("NT");
  });

  test("every province and territory is covered in both languages", () => {
    // Thirteen of them, and a map is the kind of thing that is written with
    // ten. Counting is what catches the three that were left out.
    const codes = new Set(
      [
        ["Alberta", "Alberta"],
        ["British Columbia", "Colombie-Britannique"],
        ["Manitoba", "Manitoba"],
        ["New Brunswick", "Nouveau-Brunswick"],
        ["Newfoundland and Labrador", "Terre-Neuve-et-Labrador"],
        ["Nova Scotia", "Nouvelle-Écosse"],
        ["Northwest Territories", "Territoires du Nord-Ouest"],
        ["Nunavut", "Nunavut"],
        ["Ontario", "Ontario"],
        ["Prince Edward Island", "Île-du-Prince-Édouard"],
        ["Quebec", "Québec"],
        ["Saskatchewan", "Saskatchewan"],
        ["Yukon", "Yukon"],
      ].map(([en, fr]) => {
        const a = provinceCode(en!);
        const b = provinceCode(fr!);
        // Both languages must reach the SAME code, and it must be a code —
        // a name passed through unchanged is the failure this catches.
        expect(a, `${en} did not become a code`).toMatch(/^[A-Z]{2}$/);
        expect(b, `${fr} did not become a code`).toBe(a);
        return a;
      }),
    );
    expect(codes.size).toBe(13);
  });

  test("a code already in the right shape passes through", () => {
    expect(provinceCode("QC")).toBe("QC");
    expect(provinceCode("on")).toBe("ON");
  });

  test("something unrecognised is kept, not blanked", () => {
    // A US state, or a province spelled a way this map does not hold. Handing
    // the form "" would silently erase what the geocoder knew.
    expect(provinceCode("Vermont")).toBe("Vermont");
    expect(provinceCode("")).toBe("");
    expect(provinceCode(null)).toBe("");
  });
});

describe("a Photon feature becomes a suggestion", () => {
  test("the real Montréal response maps field for field", () => {
    const [first] = suggestionsFromPhoton(MONTREAL);

    expect(first).toBeTruthy();
    expect(first!.street).toBe("1200 Rue Sainte-Catherine Est");
    expect(first!.city).toBe("Montreal");
    expect(first!.province).toBe("QC");
    expect(first!.postalCode).toBe("H2L 2H7");
    expect(first!.country).toBe("CA");
  });

  test("latitude and longitude are not swapped", () => {
    // GeoJSON is [lon, lat]. Reading it the other way round puts every
    // Canadian address in the Indian Ocean and nothing on screen says so —
    // the street line would still look perfect.
    const [first] = suggestionsFromPhoton(MONTREAL);
    expect(first!.latitude).toBeCloseTo(45.5183315, 5);
    expect(first!.longitude).toBeCloseTo(-73.5559086, 5);
  });

  test("the label reads as an address, in order, with no empty commas", () => {
    const [first] = suggestionsFromPhoton(MONTREAL);
    expect(first!.label).toBe(
      "1200 Rue Sainte-Catherine Est, Montreal, QC, H2L 2H7",
    );

    const [sparse] = suggestionsFromPhoton({
      features: [
        {
          properties: {
            street: "Chemin du Lac",
            countrycode: "CA",
            state: "Quebec",
          },
          geometry: { coordinates: [-71.2, 46.8] },
        },
      ],
    });
    expect(sparse!.label).toBe("Chemin du Lac, QC");
  });
});

describe("what it refuses to offer", () => {
  test("a result in another country is dropped when one is named", () => {
    const payload = {
      features: [
        MONTREAL.features[0],
        {
          properties: {
            housenumber: "1200",
            street: "Main Street",
            city: "Buffalo",
            state: "New York",
            countrycode: "US",
          },
          geometry: { coordinates: [-78.8, 42.9] },
        },
      ],
    };

    expect(suggestionsFromPhoton(payload, { country: "CA" })).toHaveLength(1);
    // And without a country named, both stand — the filter is the caller's
    // choice, not a rule baked into the mapper.
    expect(suggestionsFromPhoton(payload)).toHaveLength(2);
  });

  test("a row with no street and no name is not offered", () => {
    // A region or a body of water. There is nothing to put in a street field,
    // so a row for it is a dead end in the list.
    const out = suggestionsFromPhoton({
      features: [
        {
          properties: { state: "Quebec", countrycode: "CA" },
          geometry: { coordinates: [-73.5, 45.5] },
        },
      ],
    });
    expect(out).toEqual([]);
  });

  test("a row with no usable coordinates is not offered", () => {
    const out = suggestionsFromPhoton({
      features: [
        {
          properties: { street: "Rue Sherbrooke", countrycode: "CA" },
          geometry: { coordinates: ["oops", null] },
        },
      ],
    });
    expect(out).toEqual([]);
  });

  test("the same doorway twice is offered once", () => {
    // OSM often holds a node AND the building way for one address. They read
    // identically in a list, so the second is noise.
    const twice = {
      features: [MONTREAL.features[0], { ...MONTREAL.features[0] }],
    };
    expect(suggestionsFromPhoton(twice)).toHaveLength(1);
  });

  test("a body that is not a feature collection is an empty list", () => {
    // The route answers 200 with an empty list on every provider failure, so
    // nothing below it may throw on a shape it did not expect.
    expect(suggestionsFromPhoton(null)).toEqual([]);
    expect(suggestionsFromPhoton({})).toEqual([]);
    expect(suggestionsFromPhoton({ features: "nope" })).toEqual([]);
    expect(suggestionsFromPhoton({ features: [null, 7] })).toEqual([]);
  });
});

describe("the fields a form would otherwise leave empty", () => {
  test("a town with no city falls back to its district, then its county", () => {
    const [district] = suggestionsFromPhoton({
      features: [
        {
          properties: {
            street: "Rue Principale",
            district: "Sainte-Adèle",
            countrycode: "CA",
          },
          geometry: { coordinates: [-74.1, 45.9] },
        },
      ],
    });
    expect(district!.city).toBe("Sainte-Adèle");

    const [county] = suggestionsFromPhoton({
      features: [
        {
          properties: {
            street: "Route 132",
            county: "Les Basques",
            countrycode: "CA",
          },
          geometry: { coordinates: [-69.1, 48.1] },
        },
      ],
    });
    expect(county!.city).toBe("Les Basques");
  });

  test("a named place with no street is offered under its name", () => {
    // A business or a park. The person still gets city, province and postcode
    // filled in, which is more than they had.
    const [place] = suggestionsFromPhoton({
      features: [
        {
          properties: {
            name: "Parc La Fontaine",
            city: "Montreal",
            state: "Quebec",
            postcode: "H2J 2P9",
            countrycode: "CA",
          },
          geometry: { coordinates: [-73.57, 45.53] },
        },
      ],
    });
    expect(place!.street).toBe("Parc La Fontaine");
    expect(place!.postalCode).toBe("H2J 2P9");
  });

  test("a postal code is upper-cased the way Canada Post writes it", () => {
    const [first] = suggestionsFromPhoton({
      features: [
        {
          properties: {
            street: "Rue Peel",
            postcode: "h3a 1w9",
            countrycode: "ca",
          },
          geometry: { coordinates: [-73.57, 45.5] },
        },
      ],
    });
    expect(first!.postalCode).toBe("H3A 1W9");
    expect(first!.country).toBe("CA");
  });
});
