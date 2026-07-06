# Commerzbank — Pact Contract Testing Example

This repository shows how Pact contract testing would work across Commerzbank's API ecosystem, using two APIs from the [Commerzbank Developer Portal](https://developer.commerzbank.com/products/api-catalog) as concrete examples — one demonstrating Classic Consumer-Driven Contract Testing (CDC) and one demonstrating Bi-Directional Contract Testing (BDCT).

---

## Starting a PactFlow trial

PactFlow is the SaaS platform that hosts contracts, runs cross-contract verification, and provides the deployment safety gate (`can-i-deploy`). Commerzbank would need a PactFlow workspace before the CI workflows in this repo can run.

### Step 1 — Sign up

Go to [pactflow.io](https://pactflow.io) and start a trial. You will be asked to choose a subdomain; this becomes your workspace URL:

```
https://commerzbank.pactflow.io
```

The trial includes unlimited users and integrations for 30 days. For an enterprise evaluation, contact SmartBear to discuss a scoped proof-of-concept with dedicated support.

### Step 2 — Create an API token

Inside your PactFlow workspace:

1. Click **Settings** → **Tokens**
2. Click **Copy Token Value** underneath Read/write token

### Step 3 — Configure this repository

In your GitHub repository go to **Settings → Secrets and variables → Actions** and add:

| Type | Name | Value |
|---|---|---|
| **Variable** | `PACT_BROKER_BASE_URL` | `https://commerzbank.pactflow.io` |
| **Secret** | `PACT_BROKER_TOKEN` | *(the API token from Step 2)* |

The URL is stored as a variable (not a secret) because it is not sensitive and is visible in workflow logs — this makes debugging easier.

### Step 4 — Run the one-time setup workflow

Go to **Actions → Setup PactFlow → Run workflow**. This creates the `production` and `staging` environments in PactFlow and registers all four services as pacticipants. It only needs to run once.

### Step 5 — Trigger the pipelines

Run workflows in this order on first use:

1. **Consumer — Customers Mobile** — generates and publishes the consumer pact
2. **Provider — Customers API** — fetches and verifies the pact against the real server
3. **Consumer — Payments Web** — generates and publishes the consumer pact
4. **Provider — Corporate Payments API** — self-verifies the OpenAPI spec and publishes it to PactFlow

After the first run, all workflows trigger automatically on push.

---

## What's in this repo

| Approach | Consumer | Provider | API |
|---|---|---|---|
| **Consumer-Driven Contract Testing** | `customers-mobile-consumer` | `customers-api` | [Customers API v2](https://developer.commerzbank.com/products/api-catalog/sandbox/customers-api/v2) |
| **Bi-Directional Contract Testing** | `payments-web-consumer` | `corporate-payments-api` | [Corporate Payments API v1](https://developer.commerzbank.com/products/api-catalog/sandbox/corporate-payments-api/1/v1/bulk-payments) |

---

## How Classic CDC works (Customers API)

The mobile app team writes tests against a Pact mock server that describe exactly what they need — which fields, which status codes, which error shapes. Those expectations become the contract, which is published to PactFlow.

The Customers API team runs a Pact verifier against their real server before every deployment. If they remove a field a consumer depends on, verification fails and the deployment is blocked automatically.

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
    |                        |←-- can-i-deploy? ------|
```

**Endpoints covered:**
- `GET /v2/customers/{id}` — personal data (200, 401)
- `GET /v2/customers/{id}/addresses` — address list (200, 401)
- `GET /v2/customers/{id}/phone-numbers` — phone list (200, 404, 401)

---

## How BDCT works (Corporate Payments API)

BDCT is designed for APIs that already maintain an OpenAPI spec (a natural fit for Commerzbank's Open Banking APIs, where the spec is often a regulatory deliverable). The provider publishes their spec plus self-verification results to PactFlow. PactFlow then cross-checks all consumer pacts against the spec automatically — no provider test run is triggered in consumer CI.

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

**Endpoints covered:**
- `POST /v1/payments` — submit a SEPA credit transfer (201, 401)
- `GET /v1/payments/{id}` — payment status (200)
- `GET /v1/accounts/{iban}/transactions` — transaction list (200, 401)

---

## Repository structure

```
.github/workflows/
  setup-pactflow.yml              # One-time setup: environments + pacticipants
  consumer-customers.yml          # Classic CDC consumer pipeline
  consumer-payments.yml           # BDCT consumer pipeline
  provider-customers.yml          # Classic CDC provider pipeline
  provider-payments.yml           # BDCT provider pipeline

consumers/
  customers-mobile-consumer/
    src/customersClient.js        # Axios HTTP client
    tests/consumer.pact.test.js   # Pact consumer tests
  payments-web-consumer/
    src/paymentsClient.js
    tests/consumer.pact.test.js

services/
  customers-api/
    src/app.js                    # Express server (provider implementation)
    tests/provider.pact.test.js   # Fetches + verifies pacts from PactFlow
  corporate-payments-api/
    src/app.js                    # Express server (provider implementation)
    openapi/corporate-payments-api.yml   # OpenAPI 3.0 spec published to PactFlow
    tests/provider.bdct.test.js   # Self-verifies spec → writes verification-results.json
```
