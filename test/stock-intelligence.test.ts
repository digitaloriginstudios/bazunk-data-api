import { test } from "node:test";
import { strict as assert } from "node:assert";
import { interpretStockAvailability as parse } from "../src/stock-intelligence.js";

test("parses exact availability", () => {
  assert.deepEqual([parse("Only 4 left in stock").quantity, parse("7 available").quantity], [4, 7]);
  assert.equal(parse("Only 4 left in stock").quantityKind, "exact");
});
test("more than 10 does not claim exact quantity", () => {
  const result = parse("More than 10 available");
  assert.equal(result.quantity, null);
  assert.equal(result.quantityKind, "lower_bound");
  assert.equal(result.suggestedListingCap, 10);
});
test("out of stock overrides vague available", () => {
  const result = parse("Currently unavailable");
  assert.equal(result.status, "out_of_stock");
  assert.equal(result.quantity, 0);
});
test("vague stock never invents quantity", () => {
  assert.equal(parse("In stock").quantity, null);
  assert.equal(parse("In stock").suggestedListingCap, null);
  assert.equal(parse(null).status, "unknown");
});
