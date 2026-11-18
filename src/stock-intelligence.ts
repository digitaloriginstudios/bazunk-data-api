/** Interpret supplier availability without inventing inventory. */
export type StockIntelligence = {
  status: "in_stock" | "out_of_stock" | "unknown";
  quantity: number | null;
  quantityKind: "exact" | "lower_bound" | "unknown";
  suggestedListingCap: number | null;
  sourceMessage: string | null;
};

export function interpretStockAvailability(input: unknown): StockIntelligence {
  const sourceMessage = typeof input === "string" ? input.trim().slice(0, 500) : null;
  const message = (sourceMessage ?? "").replace(/\s+/g, " ").toLowerCase();
  const unknown = (): StockIntelligence => ({ status: "unknown", quantity: null, quantityKind: "unknown", suggestedListingCap: null, sourceMessage });
  if (!message) return unknown();
  if (/\b(out of stock|currently unavailable|temporarily unavailable|sold out|not available)\b/.test(message))
    return { status: "out_of_stock", quantity: 0, quantityKind: "exact", suggestedListingCap: 0, sourceMessage };
  const more = message.match(/\b(?:more than|over)\s+(\d{1,6})\s+(?:items?\s+)?available\b/);
  if (more) {
    const threshold = Number(more[1]);
    return { status: "in_stock", quantity: null, quantityKind: "lower_bound", suggestedListingCap: threshold, sourceMessage };
  }
  const exact = message.match(/\b(?:only\s+)?(\d{1,6})\s+(?:items?\s+)?(?:left(?:\s+in\s+stock)?|available|in stock)\b/);
  if (exact) {
    const quantity = Number(exact[1]);
    return { status: quantity ? "in_stock" : "out_of_stock", quantity, quantityKind: "exact", suggestedListingCap: quantity, sourceMessage };
  }
  if (/\b(in stock|available now|usually ships)\b/.test(message))
    return { status: "in_stock", quantity: null, quantityKind: "unknown", suggestedListingCap: null, sourceMessage };
  return unknown();
}
