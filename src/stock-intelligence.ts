/** Stock information is only exact when the source explicitly provides an exact count. */
export type StockIntelligence = {
  status:"in_stock"|"out_of_stock"|"unknown";
  quantity:number|null;
  quantityKind:"exact"|"lower_bound"|"unknown";
  lowerBound:number|null;
  message:string|null;
};
export function interpretStock(source:unknown):StockIntelligence {
  const x=(source && typeof source==="object")?source as Record<string,unknown>:{};
  const value=x.stock_quantity ?? x.stockQuantity ?? x.quantity_available ?? x.inventory_quantity;
  const exact=typeof value==="number" && Number.isSafeInteger(value) && value>=0 ? value:null;
  const message=[x.availability_message,x.availability_text,x.stock_message,x.stock_status].find(v=>typeof v==="string");
  const msg=typeof message==="string"?message.trim():null;
  if(exact!==null) return {status:exact===0?"out_of_stock":"in_stock",quantity:exact,quantityKind:"exact",lowerBound:null,message:msg};
  const match=msg?.match(/(?:more than|over)\s+(\d+)\s+(?:available|in stock|left)/i);
  if(match && Number.isSafeInteger(Number(match[1])) && Number(match[1])<Number.MAX_SAFE_INTEGER) return {status:"in_stock",quantity:null,quantityKind:"lower_bound",lowerBound:Number(match[1])+1,message:msg};
  const unavailable=/(?:out of stock|currently unavailable|sold out|not available)/i.test(msg??"");
  const available=/(?:in stock|available now)/i.test(msg??"");
  const flag=x.available===true?"in_stock":x.available===false?"out_of_stock":"unknown";
  return {status:unavailable?"out_of_stock":available?"in_stock":flag,quantity:null,quantityKind:"unknown",lowerBound:null,message:msg};
}


/** Parse a supplier's human-readable message without treating lower bounds as exact inventory. */
export type StockMessageIntelligence = {
  status: "in_stock" | "out_of_stock" | "unknown";
  quantity: number | null;
  quantityKind: "exact" | "lower_bound" | "unknown";
  suggestedListingCap: number | null;
  sourceMessage: string | null;
};

export function interpretStockAvailability(input: unknown): StockMessageIntelligence {
  const sourceMessage = typeof input === "string" ? input.trim().slice(0, 500) : null;
  const message = (sourceMessage ?? "").replace(/\s+/g, " ").toLowerCase();
  const unknown = (): StockMessageIntelligence => ({
    status: "unknown", quantity: null, quantityKind: "unknown", suggestedListingCap: null, sourceMessage,
  });
  if (!message) return unknown();
  if (/\b(out of stock|currently unavailable|temporarily unavailable|sold out|not available)\b/.test(message))
    return { status: "out_of_stock", quantity: 0, quantityKind: "exact", suggestedListingCap: 0, sourceMessage };
  const more = message.match(/\b(?:more than|over)\s+(\d{1,6})\s+(?:items?\s+)?(?:available|in stock|left)\b/);
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
