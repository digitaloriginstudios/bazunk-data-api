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
  if(match) return {status:"in_stock",quantity:null,quantityKind:"lower_bound",lowerBound:Number(match[1])+1,message:msg};
  const unavailable=/(?:out of stock|currently unavailable|sold out)/i.test(msg??"");
  const available=/(?:in stock|available now)/i.test(msg??"");
  const flag=x.available===true?"in_stock":x.available===false?"out_of_stock":"unknown";
  return {status:unavailable?"out_of_stock":available?"in_stock":flag,quantity:null,quantityKind:"unknown",lowerBound:null,message:msg};
}
