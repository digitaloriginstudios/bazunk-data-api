# Data Platform reliability acceptance

## Provider outage exercises
Use an authorised provider sandbox with a configurable fault proxy. Run a healthy request, an upstream HTTP 500, a timeout exceeding 12 seconds, and a subsequent healthy request. Verify 5xx handling, bounded timeout, failure and recovery metrics, no customer secret disclosure, and no unlicensed fallback. Do not treat mocked provider tests as live verification.

## Source licensing
Source priority is amazon, aliexpress, shopify, ebay, walmart. Priority does not grant permission to use an upstream. Only enable a source after licence, credentials, request quota, allowed data fields and jurisdiction have been verified. Fallback remains disabled until equivalent licensed sources are available.

## Database concurrency
On a disposable Neon branch with test-only client and wallet, concurrently debit the same operation key and verify exactly one ledger row and one debit. Concurrently debit distinct keys against an insufficient balance and verify nonnegative balance and total debits no greater than available credits. Run parallel API requests against a dedicated low-rate test client and assert 429 and Retry-After. Do not stress the production database.

## Retention
Scheduled cleanup deletes only expired OAuth state rows, usage events older than 365 days and operational telemetry older than 90 days. It deliberately preserves credit ledgers, wallets, checkout records, customer records, API keys, and support tickets. Requires a dedicated least-privilege GitHub Actions secret named DATA_PLATFORM_DATABASE_URL; no secret means the job fails closed. Run dry-run first by omitting RETENTION_APPLY=true.

## Onboarding
With a permitted Clerk test account, verify signup, authenticated /web/me, API-key issue, GET /v1/providers with X-API-Key, usage increment, key revocation, and 401 after revocation. /web/self-test provides a subset of these checks; it does not prove signup or live provider access. Never log plaintext keys.
