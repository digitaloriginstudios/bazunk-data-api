import {db} from "../src/db.js";

const days=(name:string,fallback:number)=>{
 const value=Number(process.env[name]??fallback);
 if(!Number.isInteger(value)||value<7||value>3650)throw new Error("Invalid retention setting: "+name);
 return value;
};
const usageDays=days("USAGE_RETENTION_DAYS",365);
const operationalDays=days("OPERATIONAL_RETENTION_DAYS",90);
const oauthDays=days("OAUTH_STATE_RETENTION_DAYS",7);
const dryRun=process.env.RETENTION_APPLY!=="true";
if(!db)throw new Error("DATABASE_URL is required");
try{
 for(const [table,column,age] of [
  ["operational_events","created_at",operationalDays],
  ["usage_events","created_at",usageDays],
  ["aliexpress_oauth_states","expires_at",oauthDays]
 ] as const){
  const where=column==="expires_at"
   ? "expires_at < now() - ($1::int * interval '1 day')"
   : "created_at < now() - ($1::int * interval '1 day')";
  const count=await db.query(`SELECT count(*)::int AS total FROM ${table} WHERE ${where}`,[age]);
  console.log(JSON.stringify({table,retentionDays:age,eligible:count.rows[0].total,dryRun}));
  if(!dryRun) {
   // Bounded batches prevent a single long-running DELETE transaction.
   for(let i=0;i<100;i++){
    const result=await db.query(`DELETE FROM ${table} WHERE ctid IN (SELECT ctid FROM ${table} WHERE ${where} LIMIT 1000)`,[age]);
    if((result.rowCount??0)<1000)break;
    if(i===99)console.warn("Retention batch cap reached for "+table);
   }
  }
 }
}finally{await db.end();}
