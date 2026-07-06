# Commerzbank — Pact Contract Testing Example

This repository demonstrates how Pact contract testing would work for Commerzbank's APIs, covering both testing approaches side-by-side.

**PactFlow workspace:** https://smart-bank.pactflow.io

---

## What's in this repo

| Approach | Consumer | Provider | API |
|---|---|---|---|
| **Classic CDC** | `customers-mobile-consumer` | `customers-api` | [Customers API v2](https://developer.commerzbank.com/products/api-catalog/sandbox/customers-api/v2) |
| **BDCT** | `payments-web-consumer` | `corporate-payments-api` | [Corporate Payments API v1](https://developer.commerzbank.com/products/api-catalog/sandbox/corporate-payments-api/1/v1/bulk-payments) |

---

## How it works

### Classic Consumer-Driven Contract Testing (Customers API)

The mobile app team owns the contract. They write Pact tests that describe exactly what they need from the Customers API — which fields, which status codes, which error shapes — and publish that contract to PactFlow.

The Customers API team then verifies their real running server against every published consumer contract before deploying. If a consumer depends on a field and the provider removes it, verification fails and the deployment is blocked.

```
Mobile App                PactFlow              Customers API
    |                        |                        |
    |-- run pact tests ----→ |                        |
    |   (mock server)        |                        |
    |-- publish pact -----→  |                        |
    |                        |←-- fetch pacts --------|
    |                        |                        |-- verify against
    |                        |                        |   real server
    |                        |←-- publish results ----|
    |                        |                        |
    |←-- can-i-deploy? ------|                        |
    |←-- can-i-deploy? ------|-----------------------→|
```

**Consumer tests cover:**
- `GET /v2/customers/{id}` — personal data (200, 401)
- `GET /v2/customers/{id}/addresses` — address list (200, 401)
- `GET /v2/customers/{id}/phone-numbers` — phone list (200, 404, 401)

### Bi-Directional Contract Testing (Corporate Payments API)

The Payments API team publishes their OpenAPI spec + self-verification results to PactFlow. PactFlow cross-checks consumer pacts against the spec automatically — no provider test run triggered in consumer CI.

This suits the Payments API because it already has a well-maintained OpenAPI spec (a regulatory requirement for PSD2/Open Banking), so there's no need to write a separate Pact verification harness.

```
Payments Web App          PactFlow              Corporate Payments API
    |                        |                        |
    |-- run pact tests ----→ |                        |
    |-- publish pact -----→  |                        |
    |                        |                        |-- self-verify spec
    |                        |                        |-- publish OpenAPI spec
    |                        |                        |   + verification results
    |                        |←----- cross-verify ----|
    |                        |   (PactFlow compares   |
    |                        |    pact vs OpenAPI)    |
    |←-- can-i-deploy? ------|                        |
    |                        |←-- can-i-deploy? ------|
```

**Consumer tests cover:**
- `POST /v1/payments` — submit SEPA transfer (201, 401)
- `GET /v1/payments/{id}` — payment status (200)
- `GET /v1/accounts/{iban}/transactions` — transaction list (200, 401)

---

## Repository structure

```
.github/workflows/
  setup-pactflow.yml          # One-time: create environments + register pacticipants
  consumer-customers.yml      # Classic CDC consumer pipeline
  consumer-payments.yml       # BDCT consumer pipeline
  provider-customers.yml      # Classic CDC provider pipeline
  provider-payments.yml       # BDCT provider pipeline

consumers/
  customers-mobile-consumer/
    src/customersClient.js    # Axios HTTP client
    tests/consumer.pact.test.js  # Pact consumer tests
  payments-web-consumer/
    src/paymentsClient.js
    tests/consumer.pact.test.js

services/
  customers-api/
    src/app.js                # Express server (provider)
    tests/provider.pact.test.js  # Verifier fetches pacts from PactFlow
  corporate-payments-api/
    src/app.js                # Express server (provider)
    openapi/corporate-payments-api.yml  # OpenAPI 3.0 spec (published to PactFlow)
    tests/provider.bdct.test.js  # Self-verification → verification-results.json
```

---

## Setup

### 1. Required secret

Add `PACT_BROKER_TOKEN` to your GitHub repository secrets (Settings → Secrets → Actions).  
Get your token from: https://smart-bank.pactflow.io/settings/api-tokens

### 2. First-time PactFlow setup

Run the **Setup PactFlow** workflow manually (Actions tab → Setup PactFlow → Run workflow).  
This creates the `production` and `staging` environments and registers all four pacticipants.

### 3. Run the workflows

Trigger in this order on first run:
1. **Consumer - Customers Mobile** (generates + publishes the pact)
2. **Provider - Customers API** (verifies against the published pact)
3. **Consumer - Payments Web** (generates + publishes the pact)
4. **Provider - Corporate Payments API** (self-verifies + publishes OpenAPI spec)

After setup, workflows trigger automatically on push.

---

## Key design decisions

### Why no `Content-Type` header matchers?

The Pact FFI (Rust-based core in `@pact-foundation/pact` v13) panics when a matcher (`like()`, `regex()`, etc.) is used on a `Content-Type` header — either in request or response. The fix is simple: omit `headers:` from `willRespondWith` entirely. PactFlow's cross-contract verification handles content type conformance at the OpenAPI spec level.

### Why Docker for `publish-provider-contract`?

The `pactflow publish-provider-contract` command only exists inside the `pactfoundation/pact-cli` Docker image. It is not available in:
- `@pact-foundation/pact-node` standalone CLI
- `pact_broker-client` Ruby gem  
- Any `pactflow` Ruby gem (that gem does not exist on RubyGems)

### Why `--verification-exit-code 0`?

PactFlow derives the `success` field from the CLI's `--verification-exit-code` flag, not by parsing the JSON file. Passing `0` tells PactFlow the self-verification passed.

### Why `publishVerificationResults: true` (not conditional)?

In CI, verification results must always be published so PactFlow's matrix stays current. The provider version and branch come from `GITHUB_SHA` and `GITHUB_REF_NAME` environment variables set in the workflow.
