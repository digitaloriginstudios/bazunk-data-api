# Bazunk Data API — Developer quick start

Base URL: `https://data.bazunk.com/v1` (verify your deployment's API routing before use). The Render API origin is `https://bazunkdata-api-2avb.onrender.com/v1`.

## Authentication

Create an API key in your signed-in developer account. The secret is displayed **once**. Send it as `X-API-Key` over HTTPS; never embed it in browser JavaScript or commit it to Git. API keys are scoped: `products:read`, `providers:read`, `usage:read`, and optionally `keys:manage`.

```bash
export BAZUNK_API_KEY='replace-with-your-key'
export BAZUNK_API_URL='https://bazunkdata-api-2avb.onrender.com'
curl -fsS -H "X-API-Key: $BAZUNK_API_KEY" "$BAZUNK_API_URL/v1/me"
```

## Endpoints and examples

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/v1/providers` | providers:read | Provider configuration state |
| GET | `/v1/products/search?provider=amazon&q=wireless%20mouse&page=1` | products:read | Search one provider |
| GET | `/v1/products/lookup?asin=B08N5WRWNW` | products:read | Amazon ASIN lookup |
| GET | `/v1/products/lookup?url=https%3A%2F%2Fwww.amazon.co.uk%2Fdp%2FB08N5WRWNW` | products:read | Amazon URL lookup |
| GET | `/v1/products/amazon/B08N5WRWNW` | products:read | Product details |
| GET | `/v1/usage` | usage:read | Usage summary |
| GET | `/web/dashboard` | Clerk bearer token | Customer dashboard data |
| GET | `/web/providers/health` | Clerk bearer token | Passive provider observations |

```bash
curl -G -H "X-API-Key: $BAZUNK_API_KEY" \
  --data-urlencode "provider=amazon" --data-urlencode "q=wireless mouse" \
  --data-urlencode "page=1" "$BAZUNK_API_URL/v1/products/search"
curl -H "X-API-Key: $BAZUNK_API_KEY" "$BAZUNK_API_URL/v1/products/amazon/B08N5WRWNW"
```

Search pages are 1–100. Product search returns `provider`, `query`, `page`, `items`, and optionally `nextPage`. Each product includes `externalId`, `sourceUrl`, `title`, `images`, `features`, `variants`, `retrievedAt`, and optional price, brand, rating, and stock. Provider availability and licensing determine whether results are returned.

Stock: `stock.quantity` is a number **only when the provider supplied an exact nonnegative integer**. Otherwise it is `null`. `quantityKind` is `exact`, `lower_bound`, or `unknown`. An availability message does not imply an exact count.

## Error handling

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `invalid_request`, `invalid_amazon_product_identifier`, `invalid_api_key_header` | Correct input or headers |
| 401 | `unauthorized` | Missing, revoked or invalid API key |
| 403 | `forbidden` | API key lacks required scope |
| 404 | `not_found` | Product absent at source |
| 429 | `rate_limit_exceeded`, `monthly_quota_exceeded` | Slow down or upgrade quota; respect `Retry-After` |
| 502 | `upstream_provider_error` | Provider failed; retry with backoff |
| 503 | `provider_unavailable` | Provider not configured/authorised |

Never retry 400/401/403 without correcting the request. Retry 429/502 with bounded exponential backoff and jitter. Avoid logging credentials or raw customer tokens.

## Test checklist

- Missing and invalid keys return 401; missing scopes return 403.
- Invalid pagination and ASIN/URL return 400.
- Provider disabled returns 503; upstream outage returns 502.
- Repeat requests to verify cache behaviour and rate limits.
- Concurrent wallet debits and refunds require database-backed integration tests with isolated test clients; never use production balances for destructive tests.
- Provider source credentials, authorised access, and test product availability must be configured before real search results can be verified.
