import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {checkClientRate} from "../src/auth.js";
import type {ApiClient} from "../src/clients.js";

test("simultaneous requests enforce a strict per-client minute limit",async()=>{
 const client={id:randomUUID(),rateLimitPerMinute:10,plan:"developer"} as ApiClient;
 const results=await Promise.all(Array.from({length:100},async()=>checkClientRate(client)));
 assert.equal(results.filter(x=>x===null).length,10);
 assert.equal(results.filter(x=>typeof x==="number"&&x>0).length,90);
});
test("independent clients do not consume one another's allowance",()=>{
 const a={id:randomUUID(),rateLimitPerMinute:1,plan:"developer"} as ApiClient;
 const b={id:randomUUID(),rateLimitPerMinute:1,plan:"developer"} as ApiClient;
 assert.equal(checkClientRate(a),null);
 assert.equal(checkClientRate(b),null);
 assert.ok((checkClientRate(a)??0)>0);
 assert.ok((checkClientRate(b)??0)>0);
});
