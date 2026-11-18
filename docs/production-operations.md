# Production operations and marketplace integration

## Internal marketplace access

Marketplace server code uses a dedicated `BAZUNK_DATA_PLATFORM_INTERNAL_KEY` and `BAZUNK_DATA_PLATFORM_URL`. The Data Platform must provision this key with only `products:read` and `providers:read` on an **internal** client. Internal clients are exempt from commercial monthly quotas and per-client limits; the platform-wide abuse limit still applies. Record internal requests separately from commercial customer credits. Do not reuse the customer key, browser session, AliExpress token or a public frontend environment variable.

The marketplace integration helper is `lib/data-platform-client.ts` in the marketplace repository. Import handlers must call it from the server, validate seller permissions, independently revalidate selected products, and preserve the existing listing transaction. Do not enable source migration without testing actual importer routes and seller ownership.

## Monitoring

- `GET /health`: process liveness (not evidence that providers or DB are healthy).
- `GET /ready`: database readiness; returns 503 if unconfigured/unavailable.
- `GET /web/admin/health`: authenticated operational diagnostics.
- Configure an external monitor for `/ready` every 1–5 minutes and alert on repeated 503, sustained 5xx, high latency, or missing heartbeat.
- Provider success/failure counters are currently in-memory and reset after restart. Export them to persistent telemetry before claiming production-grade availability monitoring.

## Backups and retention

Neon database backups and point-in-time recovery must be configured and verified in the Neon console for the actual production project. **No backup has been created by this repository.** Before releases, take a database recovery point or tested logical dump, store encrypted off-host, restrict access, and perform a restore drill into a disposable database. Never restore into production to test.

Suggested retention policy (requires approval): usage events 90 days, application error logs 30 days, provider cache 7 days, support tickets per legal/privacy requirements, financial/credit ledger per statutory obligations. Do not automatically delete ledger, wallet, API-key audit or support records. For approved usage-event pruning, run a batched, transactionally controlled operation during a maintenance window and validate reporting requirements first.

## Deployment and rollback

1. Run CI typecheck, unit tests and build.
2. Verify migrations are backward compatible and capture a database recovery point.
3. Deploy a specific commit to staging; check `/ready`, authenticated `/v1/me`, search, details, provider outage handling, wallet idempotency and marketplace seller ownership.
4. Deploy the same commit to production; smoke-test and watch 5xx/latency.
5. If needed, redeploy the last known-good commit in Render. Application rollback **does not reverse database migrations**; use forward-compatible migrations and a separate database recovery plan.
6. Keep Stripe disabled until independently validated.

## End-to-end regression checklist

- Marketplace internal key authenticates; customer key cannot use internal-only privileges.
- Missing/invalid credentials fail; scopes and rate limits enforced.
- Search, ASIN lookup, details and stock unknown quantities behave correctly.
- Provider outage returns a bounded error; marketplace import fails safely without publishing a partial listing.
- Repeated and concurrent imports do not duplicate listings; seller ownership is enforced.
- Wallet concurrent debits and refunds preserve nonnegative balance and exactly-once ledger keys.
- Database outage makes `/ready` return 503; recovery returns 200.
- Retention dry run and backup restore drill pass before destructive maintenance.

These are deployment acceptance criteria, not claims of completed live end-to-end testing.
