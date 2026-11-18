import test from "node:test";
import assert from "node:assert/strict";
import {PROVIDER_PRIORITY,sourceManagementStatus,getProvider} from "../src/providers/registry.js";
test("Source order is deterministic and fallback is disabled pending licensing",()=>{
 assert.deepEqual([...PROVIDER_PRIORITY],["amazon","aliexpress","shopify","ebay","walmart"]);
 const sources=sourceManagementStatus();
 assert.deepEqual(sources.map(x=>x.provider),[...PROVIDER_PRIORITY]);
 assert.ok(sources.every((x,i)=>x.priority===i+1 && x.fallbackEligible===false));
 assert.equal(getProvider("ebay").isConfigured(),false);
 assert.equal(getProvider("walmart").isConfigured(),false);
});
test("Health is observational, not evidence of licensed fallback",()=>{
 const sources=sourceManagementStatus();
 assert.ok(sources.every(x=>["unobserved","degraded","observed_healthy"].includes(x.health.status)));
 assert.ok(sources.every(x=>!x.fallbackEligible));
});
