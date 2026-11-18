# Monitoring and authorised provider activation

## Uptime monitoring

The GitHub Actions `Production uptime monitor` runs every 15 minutes against `/health` and `/ready`, with three attempts and a failing workflow on persistent outage. **Enable GitHub Actions failure notifications** for repository maintainers or configure an external paging integration; a failed Actions run is not itself guaranteed to send an alert. GitHub scheduled runs can be delayed or disabled after prolonged inactivity, so use a separate uptime provider for stricter SLAs.

`/web/admin/metrics` requires a verified internal admin session and returns the last 24 hours of database-persisted HTTP 5xx and provider success/failure observations. `operational_events` is append-only and requires an approved retention job. This captures application failures; it is not a substitute for a centralised log/trace service. In-flight requests can be lost on process termination.

## Provider activation

| Provider | Activation requirements | Safe default |
| --- | --- | --- |
| Shopify | Public Storefront catalogue; read-only, public products; validate real public store/product URL | Available where store permits access |
| AliExpress | Official OAuth credentials and an explicit verified resale licence, plus `ALIEXPRESS_RESALE_LICENSE_CONFIRMED=true` and `ALIEXPRESS_PROVIDER_ENABLED=true` | Disabled for public resale |
| Amazon | Licensed upstream product data endpoint, `AMAZON_PROVIDER=http`, `AMAZON_SOURCE_URL` and optional `AMAZON_SOURCE_TOKEN` | Disabled |
| eBay | Implement and license a supported data provider | Disabled |
| Walmart | Implement and license a supported data provider | Disabled |

Never set a licence confirmation variable without documentary authorisation. No provider keys, licensing or commercial resale rights are inferred from the presence of a working endpoint.

## Live verification checklist

1. Deploy the branch after CI passes, then confirm `/health` and `/ready` return 200.
2. Verify `/web/admin/metrics` with an internal admin session; confirm unauthenticated requests are denied.
3. Test `GET /v1/providers` using a restricted API key and check provider configuration flags.
4. Test Shopify preview on a public store/product with a seller-authorised catalogue, checking source URL, currency, availability, title and price.
5. For each **licensed and configured** provider, test a real product lookup and search with authorised test identifiers. Confirm 200 and nonempty products, then simulate an upstream outage and check bounded 502/503 responses.
6. Verify provider failure events appear in the persisted metrics after the request; restart the process and ensure counts remain.
7. Confirm GitHub Actions scheduled monitor is enabled and maintainers receive notifications from a deliberately failing **staging** test (never intentionally take production offline).

These are verification steps, not a claim that live product results or alert delivery have been verified.
