import assert from "node:assert/strict";
import test from "node:test";
import { placeIdAtPosition } from "../src/listOrdering.ts";

test("inserting a new ID into an occupied position shifts later items down", () => {
  assert.deepEqual(placeIdAtPosition([10, 20, 30], 40, 1), [10, 40, 20, 30]);
});

test("moving the second item to first shifts the former first item to second", () => {
  assert.deepEqual(placeIdAtPosition([10, 20, 30], 20, 0), [20, 10, 30]);
});

test("positions outside the list are clamped to the nearest end", () => {
  assert.deepEqual(placeIdAtPosition([10, 20], 30, 100), [10, 20, 30]);
  assert.deepEqual(placeIdAtPosition([10, 20], 30, -5), [30, 10, 20]);
});
