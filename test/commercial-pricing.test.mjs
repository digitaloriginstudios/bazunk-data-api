import { test } from "node:test";
import assert from "node:assert/strict";
import { CREDIT_PACKAGES, ENDPOINT_CREDIT_COST, getCreditPackage, getEndpointCreditCost } from "../src/commercial-pricing.js";

test("commercial packages have safe positive integer credit quantities and prices", () => {
  for (const pkg of Object.values(CREDIT_PACKAGES)) {
    assert.ok(Number.isSafeInteger(pkg.credits) && pkg.credits > 0);
    assert.ok(Number.isSafeInteger(pkg.priceUsdCents) && pkg.priceUsdCents > 0);
  }
});
test("unknown packages cannot define their own credit amount", () => {
  assert.throws(() => getCreditPackage("free-999999"), /Unknown API credit package/);
  assert.throws(() => getCreditPackage("__proto__"), /Unknown API credit package/);
});
test("endpoint prices are positive and unknown routes are rejected", () => {
  for (const cost of Object.values(ENDPOINT_CREDIT_COST))
    assert.ok(Number.isSafeInteger(cost) && cost > 0);
  assert.equal(getEndpointCreditCost("products.search"), ENDPOINT_CREDIT_COST["products.search"]);
  assert.throws(() => getEndpointCreditCost("admin.grant"), /Unknown metered endpoint/);
});
