import {test} from "node:test";
import assert from "node:assert/strict";
import {amazonAsin} from "../src/product-lookup.js";
import {interpretStock} from "../src/stock-intelligence.js";
test("ASIN and Amazon URLs resolve without fetching arbitrary hosts",()=>{
 assert.equal(amazonAsin("B08N5WRWNW"),"B08N5WRWNW");
 assert.equal(amazonAsin("https://www.amazon.co.uk/dp/B08N5WRWNW?tag=foo"),"B08N5WRWNW");
 assert.equal(amazonAsin("https://amazon.com/gp/product/B08N5WRWNW"),"B08N5WRWNW");
 for(const value of ["https://amazon.com.evil.example/dp/B08N5WRWNW","http://amazon.com/dp/B08N5WRWNW","https://evil.example/dp/B08N5WRWNW","not-an-asin"])
  assert.equal(amazonAsin(value),null);
});
test("stock count is exact only when upstream explicitly supplies it",()=>{
 assert.deepEqual(interpretStock({stock_quantity:0}).quantity,0);
 assert.equal(interpretStock({stock_quantity:7}).quantityKind,"exact");
 assert.equal(interpretStock({available:true}).quantity,null);
 assert.equal(interpretStock({availability_message:"More than 10 available"}).lowerBound,11);
 assert.equal(interpretStock({availability_message:"More than 10 available"}).quantity,null);
 assert.equal(interpretStock({availability_message:"Currently unavailable"}).status,"out_of_stock");
 assert.equal(interpretStock({}).status,"unknown");
});
