import { describe, expect, test } from "bun:test";

import {
  foldText,
  initialsOf,
  petsForPick,
  searchClients,
} from "@/lib/bookings/wizard/client-search";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";

// The mock's three clients (docs/Facility_01_-_Find_client.html), as the
// wizard receives them.
function pet(id: number, name: string): Pet {
  return {
    id,
    name,
    type: "Dog",
    breed: "",
    age: 2,
    weight: 10,
    color: "",
    microchip: "",
    allergies: "",
    specialNeeds: "",
  };
}

function client(
  id: number,
  name: string,
  email: string,
  phone: string,
  pets: Pet[],
): Client {
  return {
    id,
    name,
    email,
    phone,
    status: "active",
    facility: "Doggieville",
    pets,
    additionalContacts: [],
  } as Client;
}

const CLIENTS = [
  client(1, "Parminder Singh", "parminder@example.com", "514 555 0101", [
    pet(11, "Bubu"),
    pet(12, "Mango"),
  ]),
  client(2, "Amélie Tremblay", "amelie@example.org", "438 555 0102", [
    pet(21, "Luna"),
    pet(22, "Pepper"),
  ]),
  client(3, "Marc Dubois", "marc@example.com", "514 555 0103", [
    pet(31, "Rocky"),
  ]),
];

const names = (query: string) =>
  searchClients(CLIENTS, query).hits.map((hit) => hit.client.name);

describe("searchClients", () => {
  test("nothing until two characters", () => {
    expect(names("")).toEqual([]);
    expect(names("m")).toEqual([]);
    expect(names(" m ")).toEqual([]);
  });

  test("a pet's name finds its owner, and says which pet", () => {
    const { hits } = searchClients(CLIENTS, "Mango");
    expect(hits.map((hit) => hit.client.name)).toEqual(["Parminder Singh"]);
    expect(hits[0]!.matchedPets.map((p) => p.name)).toEqual(["Mango"]);
  });

  test("a surname, without its accent", () => {
    expect(names("Tremblay")).toEqual(["Amélie Tremblay"]);
    expect(names("amelie")).toEqual(["Amélie Tremblay"]);
  });

  test("phone digits from three on, in any spacing", () => {
    expect(names("555 0101")).toEqual(["Parminder Singh"]);
    expect(names("5550101")).toEqual(["Parminder Singh"]);
    expect(names("514")).toEqual(["Marc Dubois", "Parminder Singh"]);
    // Two digits match no phone; "51" appears in no name, email or pet.
    expect(names("51")).toEqual([]);
  });

  test("email", () => {
    expect(names("example.org")).toEqual(["Amélie Tremblay"]);
  });

  test("a name that starts with the query ranks first", () => {
    // "ma" starts Marc and is inside Parminder's pet Mango.
    expect(names("ma")).toEqual(["Marc Dubois", "Parminder Singh"]);
  });

  test("capped, with the full count kept", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      client(100 + i, `Sam ${String(i).padStart(2, "0")}`, "", "", []),
    );
    const { hits, total } = searchClients(many, "sam", 25);
    expect(hits).toHaveLength(25);
    expect(total).toBe(40);
  });
});

describe("petsForPick", () => {
  test("the matched pets", () => {
    const [hit] = searchClients(CLIENTS, "Mango").hits;
    expect(petsForPick(hit!)).toEqual([12]);
  });

  test("the only pet when nothing matched", () => {
    const [hit] = searchClients(CLIENTS, "Dubois").hits;
    expect(petsForPick(hit!)).toEqual([31]);
  });

  test("none when several pets and no match", () => {
    const [hit] = searchClients(CLIENTS, "Singh").hits;
    expect(petsForPick(hit!)).toEqual([]);
  });

  test("a pet the booking cannot take is left out", () => {
    const [hit] = searchClients(CLIENTS, "Dubois").hits;
    expect(petsForPick(hit!, (p) => p.name !== "Rocky")).toEqual([]);
  });
});

test("foldText and initialsOf", () => {
  expect(foldText("Amélie Côté")).toBe("amelie cote");
  expect(initialsOf("Parminder Singh")).toBe("PS");
  expect(initialsOf("amélie  tremblay-roy")).toBe("AT");
  expect(initialsOf("Cher")).toBe("C");
});
