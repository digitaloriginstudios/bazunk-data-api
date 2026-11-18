# Commercial API credits — implementation notes

The Data Platform will sell prepaid API credits independently of Marketplace seller credits.

## Implemented foundation
- `src/credit-wallet.ts` contains a Postgres-backed wallet and append-only ledger.
- `migrateCreditWallet()` creates the tables after the existing API client migration.
- `debitApiCredits`, `grantApiCredits`, and `refundApiCredits` require unique operation keys.
- A row lock serializes concurrent requests. Repeated operation keys with the same amount are idempotent.
- Balances never become negative. Monetary payment amounts are **not** stored as credit balances.

## Not yet enabled
The wallet migration is not automatically executed and no public credit purchase, grant or debit routes exist. No payment integration is connected. Do not expose `grantApiCredits` or `refundApiCredits` to client API keys.

## Required before production
1. Verify Stripe webhook signatures and event types; persist payment-event IDs and verify price/quantity against server-owned product definitions.
2. Link a paid checkout session to the correct API client using server-side ownership records.
3. Grant credits exactly once for a verified successful payment; handle disputes/refunds and reconciliation.
4. Introduce server-owned endpoint prices, atomic reservation/deduction and settlement policy for upstream failures.
5. Add wallet balance and ledger pagination to authenticated developer dashboard.
6. Add integration tests against Postgres for concurrent debits, insufficient balance, duplicate payment events, rollback and refund.
7. Review source data licensing and provider cost ceilings before selling product responses.

The current importer checkout flag must remain disabled until these safeguards are tested.
