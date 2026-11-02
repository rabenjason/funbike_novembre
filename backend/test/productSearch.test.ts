import assert from "node:assert/strict";
import test from "node:test";
import { buildProductSearchConditions } from "../src/productSearch.ts";

test("empty search adds no SQL condition or parameters", () => {
  assert.deepEqual(buildProductSearchConditions("   "), { conditions: [], values: [] });
});

test("motorcycle recommendations are searched through the motorcycles table", () => {
  const result = buildProductSearchConditions("r");
  assert.equal(result.conditions.length, 1);
  assert.match(result.conditions[0], /mx_search\.recommendation/);
  assert.doesNotMatch(result.conditions[0], /p\.recommendation/);
  assert.deepEqual(result.values, ["%r%", "%r%", "%r%"]);
});

test("multiple terms remain ANDed and search length is bounded", () => {
  const result = buildProductSearchConditions("TVS  Apache");
  assert.equal(result.conditions.length, 2);
  assert.deepEqual(result.values, ["%TVS%", "%TVS%", "%TVS%", "%Apache%", "%Apache%", "%Apache%"]);
  assert.equal(buildProductSearchConditions("x".repeat(200)).values.length, 3);
});
