import { randomUUID } from "node:crypto";
import { db } from "./db.js";

/**
 * Prepaid API credits. This module is deliberately not wired to checkout or
 * public endpoints until payment verification and request metering are ready.
 * All balances and ledger mutations occur in the same Postgres transaction.
 */
export async function migrateCreditWallet() {
  if (!db) throw new Error("Credit wallet requires DATABASE_URL");
  await db.query(`
    CREATE TABLE IF NOT EXISTS api_credit_wallets (
      client_id uuid PRIMARY KEY REFERENCES api_clients(id) ON DELETE CASCADE,
      balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS api_credit_ledger (
      id uuid PRIMARY KEY,
      client_id uuid NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
      operation_key text NOT NULL,
      delta bigint NOT NULL CHECK (delta <> 0),
      reason text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(client_id, operation_key)
    );
    CREATE INDEX IF NOT EXISTS api_credit_ledger_client_date_idx
      ON api_credit_ledger(client_id, created_at DESC);
  `);
}

export class InsufficientCreditsError extends Error {
  constructor() { super("Insufficient API credits"); this.name = "InsufficientCreditsError"; }
}

/** Deduct once per unique operationKey. Retrying the same request never double-charges. */
export async function debitApiCredits(clientId: string, amount: number, operationKey: string, reason: string) {
  return mutate(clientId, -amount, operationKey, reason);
}

/** Grant only after a separately verified payment event; caller owns payment validation. */
export async function grantApiCredits(clientId: string, amount: number, operationKey: string, reason: string) {
  return mutate(clientId, amount, operationKey, reason);
}

/** Refund by a unique operation key, e.g. refund:<original-request-id>. */
export async function refundApiCredits(clientId: string, amount: number, operationKey: string) {
  return mutate(clientId, amount, operationKey, "request_refund");
}

async function mutate(clientId: string, delta: number, operationKey: string, reason: string) {
  if (!db) throw new Error("Credit wallet requires DATABASE_URL");
  if (!Number.isSafeInteger(delta) || delta === 0 || !Number.isSafeInteger(Math.abs(delta)))
    throw new Error("Credit amount must be a positive safe integer");
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) throw new Error("Invalid client ID");
  if (!operationKey || operationKey.length > 200 || !reason || reason.length > 120)
    throw new Error("Invalid operation key or reason");
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO api_credit_wallets(client_id) VALUES($1) ON CONFLICT DO NOTHING", [clientId]);
    // Lock wallet before checking idempotency, ensuring concurrent retries serialize.
    const wallet = await client.query<{balance:string}>("SELECT balance::text FROM api_credit_wallets WHERE client_id=$1 FOR UPDATE", [clientId]);
    const previous = await client.query<{delta:string;reason:string}>("SELECT delta::text,reason FROM api_credit_ledger WHERE client_id=$1 AND operation_key=$2", [clientId, operationKey]);
    if (previous.rowCount) {
      if (BigInt(previous.rows[0].delta) !== BigInt(delta) || previous.rows[0].reason !== reason) throw new Error("Operation key reused with different amount or reason");
      await client.query("COMMIT");
      return {balance: wallet.rows[0].balance, applied: false};
    }
    const current = BigInt(wallet.rows[0].balance);
    const next = current + BigInt(delta);
    if (next < 0n) throw new InsufficientCreditsError();
    if (next > 9223372036854775807n) throw new Error("Credit balance overflow");
    await client.query("UPDATE api_credit_wallets SET balance=$2,updated_at=now() WHERE client_id=$1", [clientId, next.toString()]);
    await client.query("INSERT INTO api_credit_ledger(id,client_id,operation_key,delta,reason) VALUES($1,$2,$3,$4,$5)", [randomUUID(),clientId,operationKey,delta,reason]);
    await client.query("COMMIT");
    return {balance:next.toString(),applied:true};
  } catch(error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function getApiCreditBalance(clientId: string) {
  if (!db) throw new Error("Credit wallet requires DATABASE_URL");
  const result = await db.query<{balance:string}>("SELECT balance::text FROM api_credit_wallets WHERE client_id=$1",[clientId]);
  return result.rows[0]?.balance ?? "0";
}

/** Paginated immutable credit activity for the authenticated owner only. */
export async function listApiCreditLedger(clientId:string,limit=25,before?:string) {
  if(!db) throw new Error("Credit wallet requires DATABASE_URL");
  if(!Number.isInteger(limit)||limit<1||limit>100) throw new Error("Invalid page size");
  const result=await db.query(
    `SELECT id,delta::text AS delta,reason,created_at
       FROM api_credit_ledger
      WHERE client_id=$1 AND ($2::timestamptz IS NULL OR created_at<$2::timestamptz)
      ORDER BY created_at DESC,id DESC LIMIT $3`,
    [clientId,before??null,limit]
  );
  return result.rows;
}
