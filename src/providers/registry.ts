import { config } from "../config.js";
import { db } from "../db.js";
import { AmazonProvider } from "./amazon/amazon-provider.js";
import { AmazonHttpSource } from "./amazon/http-source.js";
import { amazonNormalizer } from "./amazon/amazon-normalizer.js";
import { ShopifyProvider } from "./shopify/shopify-provider.js";
import { AliExpressProvider } from "./aliexpress/aliexpress-provider.js";
import { DisabledProvider } from "./disabled-provider.js";
import type { ProductProvider } from "./provider.js";
import type { ProviderName } from "../types/product.js";

const providers = new Map<ProviderName, ProductProvider>();

for (const name of ["amazon", "ebay", "walmart", "aliexpress", "shopify"] as const) providers.set(name, new DisabledProvider(name));
providers.set("shopify",new ShopifyProvider());
providers.set("aliexpress",new AliExpressProvider());
if(config.AMAZON_PROVIDER==="http") providers.set("amazon",new AmazonProvider(new AmazonHttpSource(),amazonNormalizer));

export function registerProvider(provider: ProductProvider) {
  providers.set(provider.name, provider);
}

export function getProvider(name: ProviderName): ProductProvider {
  const provider = providers.get(name);
  if (!provider) throw new Error(`Unknown provider: ${name}`);
  return provider;
}

export const PROVIDER_PRIORITY = ["amazon","aliexpress","shopify","ebay","walmart"] as const;
const providerHealth = new Map<ProviderName,{successes:number;failures:number;lastSuccessAt:string|null;lastFailureAt:string|null}>();
export function recordProviderHealth(name:ProviderName,success:boolean){
 const h=providerHealth.get(name)??{successes:0,failures:0,lastSuccessAt:null,lastFailureAt:null};
 if(success){h.successes++;h.lastSuccessAt=new Date().toISOString();}else{h.failures++;h.lastFailureAt=new Date().toISOString();}
 providerHealth.set(name,h);
 if(db)void db.query("INSERT INTO operational_events(category,provider,outcome) VALUES($1,$2,$3)",["provider",name,success?"success":"failure"]).catch(()=>{});
}
export function sourceManagementStatus(){return PROVIDER_PRIORITY.map((name,priority)=>{
 const provider=getProvider(name);const h=providerHealth.get(name);
 return {provider:name,priority:priority+1,configured:provider.isConfigured(),health:h?{...h,status:h.lastFailureAt&&(!h.lastSuccessAt||h.lastFailureAt>h.lastSuccessAt)?"degraded":"observed_healthy"}:{status:"unobserved",successes:0,failures:0,lastSuccessAt:null,lastFailureAt:null},fallbackEligible:false};
});}
export function providerStatus() {
  return [...providers.values()].map((provider) => ({
    provider: provider.name,
    configured: provider.isConfigured()
  }));
}
