import assert from "node:assert/strict";
import test from "node:test";
import { filterProductsBySearch, normalizeProductSearchTerms } from "../src/productSearch.ts";

const products = [
  {
    id: 1,
    name: "Apache RTR 200",
    reference: "TVS-200",
    description: "Moto de route",
    searchBrandName: "TVS",
    searchFamilyName: "Apache",
    recommendation: "Idéale pour la ville",
  },
  {
    id: 2,
    name: "Casque intégral",
    reference: "SH-42",
    description: "Protection route",
    searchBrandName: "Sherco",
    searchCategoryName: "Équipement pilote",
    searchCompatibleBrandNames: "TVS Sherco",
  },
];

test("empty search returns all database-loaded rows", () => {
  assert.deepEqual(filterProductsBySearch(products, "   "), products);
});

test("search matches names, references and joined database fields case-insensitively", () => {
  assert.deepEqual(filterProductsBySearch(products, "tvs 200"), [products[0]]);
  assert.deepEqual(filterProductsBySearch(products, "sherco équipement"), [products[1]]);
});

test("search supports motorcycle recommendations and compatible brand names", () => {
  assert.deepEqual(filterProductsBySearch(products, "ville"), [products[0]]);
  assert.deepEqual(filterProductsBySearch(products, "TVS Sherco"), [products[1]]);
});

test("search ignores accents and requires every term to match the same product", () => {
  assert.deepEqual(filterProductsBySearch(products, "equipement pilote"), [products[1]]);
  assert.deepEqual(filterProductsBySearch(products, "ville casque"), []);
});

test("search input is bounded to eight terms and 160 characters", () => {
  assert.deepEqual(normalizeProductSearchTerms("one two three four five six seven eight nine"), [
    "one", "two", "three", "four", "five", "six", "seven", "eight",
  ]);
  assert.deepEqual(normalizeProductSearchTerms("A".repeat(200)), ["a".repeat(160)]);
});
