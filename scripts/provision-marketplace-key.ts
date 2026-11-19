import {randomBytes,createHash} from "node:crypto";
import pg from "pg";

// Run only from a trusted shell, with DATABASE_URL set securely.
// The plaintext key is printed once; never run this in public CI logs.
if(process.env.CI)throw new Error("Refusing to print a secret in CI");
if(!process.stdout.isTTY)throw new Error("Run from an interactive terminal, not redirected logs");
if(process.env.CONFIRM_MARKETPLACE_KEY!=="yes")throw new Error("Set CONFIRM_MARKETPLACE_KEY=yes to provision");
if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL required");
const scopes=["products:read","providers:read"];
const key="bzk_live_"+randomBytes(32).toString("base64url");
const hash=createHash("sha256").update(key).digest("hex");
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
try{
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  const result=await client.query("INSERT INTO api_clients(name,plan,monthly_quota,rate_limit_per_minute) VALUES($1,'internal',100000,120) RETURNING id",["Bazunk Marketplace restricted integration"]);
  await client.query("INSERT INTO api_keys(client_id,key_prefix,key_hash,label,scopes) VALUES($1,$2,$3,$4,$5)",[result.rows[0].id,key.slice(0,16),hash,"Marketplace import reader",scopes]);
  await client.query("COMMIT");
  console.log("Marketplace key created; store it securely and never commit it.");
  console.log("API key (shown once): "+key);
 }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}finally{await pool.end();}
