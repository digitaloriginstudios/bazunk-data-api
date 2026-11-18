import {test} from "node:test";
import assert from "node:assert/strict";
import {checkClientRate,requireScope,requireApiKey} from "../src/auth.js";

test("rate limit enforces per-client quota and returns retry seconds",()=>{
 const client={id:"test-limit-"+Date.now(),name:"test",scopes:[],plan:"developer",rateLimitPerMinute:2};
 assert.equal(checkClientRate(client),null);
 assert.equal(checkClientRate(client),null);
 const retry=checkClientRate(client);
 assert.ok(typeof retry==="number"&&retry>=1&&retry<=60);
 assert.equal(checkClientRate({...client,id:client.id+"-other"}),null);
});
test("scope enforcement denies unauthorized scope",async()=>{
 let code=0,body;
 const reply={code(n){code=n;return this;},send(b){body=b;return this;}};
 await requireScope("products:read")({apiClient:{scopes:["usage:read"]}},reply);
 assert.equal(code,403);assert.equal(body.error,"forbidden");
});
test("missing API key returns 401 before any database lookup",async()=>{
 let code=0,body;
 const reply={code(n){code=n;return this;},send(b){body=b;return this;}};
 await requireApiKey({headers:{}},reply);
 assert.equal(code,401);assert.equal(body.error,"unauthorized");
});
test("ambiguous API key header returns 400",async()=>{
 let code=0,body;
 const reply={code(n){code=n;return this;},send(b){body=b;return this;}};
 await requireApiKey({headers:{"x-api-key":["one","two"]}},reply);
 assert.equal(code,400);assert.equal(body.error,"invalid_api_key_header");
});
