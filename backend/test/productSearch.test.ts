import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSchema, graphql } from "graphql";
import test from "node:test";
import { loadGraphqlTypeDefs } from "../src/schemaLoader.ts";
import { filterProductsBySearch, normalizeProductSearchTerms, searchAndPaginateProducts } from "../src/productSearch.ts";

const products = [
  {
    id: 1,
    __typename: "Motorcycle",
    name: "Apache RTR 200",
    reference: "TVS-200",
    description: "Moto de route",
    desc: "Moto de route",
    status: "DRAFT",
    price: null,
    image: null,
    gallery: [],
    brand: { id: "1", name: "TVS" },
    subfamily: null,
    family: null,
    tag: null,
    alt: null,
    specs: [],
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

test("multi-keyword search is applied before pagination and preserves the total count", () => {
  assert.deepEqual(
    searchAndPaginateProducts(products, "TVS", { limit: 1, offset: 1 }),
    { items: [products[1]], totalCount: 2 },
  );
  assert.deepEqual(
    searchAndPaginateProducts(products, "Apache TVS", { limit: 20, offset: 0 }),
    { items: [products[0]], totalCount: 1 },
  );
});

test("dashboard adminProductPage GraphQL operation accepts and searches multiple keywords", async () => {
  const adminSource = readFileSync(new URL("../../src/pages/Admin.tsx", import.meta.url), "utf8");
  const queryMatch = adminSource.match(/const ADMIN_PRODUCTS_PAGE_QUERY = `([^`]*)`;/);
  assert.ok(queryMatch, "Dashboard adminProductPage query is present");

  const result = await graphql({
    schema: buildSchema(loadGraphqlTypeDefs()),
    source: queryMatch[1],
    variableValues: {
      status: null,
      kind: null,
      brandId: null,
      search: "Apache TVS",
      limit: 20,
      offset: 0,
    },
    rootValue: {
      adminProductPage: (args: Record<string, unknown>) => searchAndPaginateProducts(
        products,
        args.search,
        { limit: Number(args.limit), offset: Number(args.offset) },
      ),
    },
  });

  assert.equal(result.errors, undefined, result.errors?.map((error) => error.message).join("\\n"));
  assert.equal(result.data?.adminProductPage.totalCount, 1);
  assert.equal(result.data?.adminProductPage.items[0].name, "Apache RTR 200");
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

test("recommendation is a motorcycle column, never a products column or predicate", () => {
  const schema = readFileSync(new URL("../database/schema.sql", import.meta.url), "utf8");
  const tableDefinition = (tableName: string) => {
    const match = schema.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName} \\(([\\s\\S]*?)\\) ENGINE=InnoDB;`));
    assert.ok(match, `Missing ${tableName} table definition`);
    return match[1];
  };
  const productsDefinition = tableDefinition("products");
  const motorcyclesDefinition = tableDefinition("motorcycles");
  const resolverSource = readFileSync(new URL("../src/resolvers.ts", import.meta.url), "utf8");

  assert.match(productsDefinition, /\bname VARCHAR/);
  assert.match(productsDefinition, /\breference VARCHAR/);
  assert.match(productsDefinition, /\bdescription TEXT/);
  assert.doesNotMatch(productsDefinition, /\brecommendation\b/);
  assert.match(motorcyclesDefinition, /\brecommendation TEXT NULL/);
  for (const tableName of ["brands", "families", "subfamilies", "part_types", "equipment_types", "accessory_types", "accessory_categories"]) {
    assert.match(tableDefinition(tableName), /\bname VARCHAR/, `${tableName}.name exists for search`);
  }
  const compatibleBrandsDefinition = tableDefinition("spare_part_compatible_brands");
  assert.match(compatibleBrandsDefinition, /\bproduct_id BIGINT/);
  assert.match(compatibleBrandsDefinition, /\bbrand_id BIGINT/);
  assert.match(resolverSource, /m\.recommendation AS recommendation/);
  assert.doesNotMatch(resolverSource, /p\.recommendation/);
});
