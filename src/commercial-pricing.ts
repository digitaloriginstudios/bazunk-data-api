/**
 * Server-owned commercial API credit pricing.
 * Values are illustrative development defaults, not an enabled product offering.
 * Never accept a credit amount or price from the browser.
 */
export const CREDIT_PACKAGES = Object.freeze({
  starter: { credits: 1_000, priceUsdCents: 1_000 },
  growth: { credits: 5_500, priceUsdCents: 5_000 },
  scale: { credits: 12_000, priceUsdCents: 10_000 },
} as const);
export type CreditPackageId = keyof typeof CREDIT_PACKAGES;

export const ENDPOINT_CREDIT_COST = Object.freeze({
  "products.search": 1,
  "products.details": 2,
  "products.stock": 2,
  "products.price_monitor": 1,
} as const);
export type MeteredEndpoint = keyof typeof ENDPOINT_CREDIT_COST;

export function getCreditPackage(id: string) {
  if (!Object.prototype.hasOwnProperty.call(CREDIT_PACKAGES, id))
    throw new Error("Unknown API credit package");
  return CREDIT_PACKAGES[id as CreditPackageId];
}
export function getEndpointCreditCost(endpoint: string) {
  if (!Object.prototype.hasOwnProperty.call(ENDPOINT_CREDIT_COST, endpoint))
    throw new Error("Unknown metered endpoint");
  return ENDPOINT_CREDIT_COST[endpoint as MeteredEndpoint];
}
