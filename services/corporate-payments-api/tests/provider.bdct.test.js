/**
 * BDCT self-verification: confirms the running server's behaviour matches
 * the OpenAPI spec we're about to publish to PactFlow.
 * Results are written to verification-results.json for the Docker publish step.
 */
const http = require('http');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');

let server;
let baseUrl;

beforeAll((done) => {
  server = http.createServer(app);
  server.listen(0, () => {
    const { port } = server.address();
    baseUrl = `http://localhost:${port}`;
    done();
  });
});

afterAll((done) => server.close(done));

const results = [];

function record(name, passed, error = null) {
  results.push({ description: name, status: passed ? 'passed' : 'failed', error });
}

afterAll(() => {
  const success = results.every((r) => r.status === 'passed');
  const output = {
    providerName: 'commerzbank-corporate-payments-api',
    success,
    tests: results,
  };
  const outPath = path.resolve(__dirname, '../verification-results.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Verification results written to ${outPath} — success: ${success}`);
});

describe('Corporate Payments API — BDCT self-verification', () => {
  describe('POST /v1/payments', () => {
    it('201 on valid SEPA transfer', async () => {
      try {
        const res = await axios.post(
          `${baseUrl}/v1/payments`,
          {
            creditorName: 'Acme GmbH',
            creditorIban: 'DE89370400440532013000',
            creditorBic: 'COBADEFFXXX',
            amount: '1500.00',
            currency: 'EUR',
            remittanceInformation: 'Invoice INV-2024-001',
          },
          { headers: { Authorization: 'Bearer valid-token' } }
        );
        expect(res.status).toBe(201);
        expect(res.data.paymentId).toBeTruthy();
        expect(res.data.status).toBe('RECEIVED');
        expect(res.data.timestamp).toBeTruthy();
        record('POST /v1/payments - 201 valid', true);
      } catch (err) {
        record('POST /v1/payments - 201 valid', false, err.message);
        throw err;
      }
    });

    it('401 when no valid token', async () => {
      try {
        await axios.post(
          `${baseUrl}/v1/payments`,
          { creditorName: 'Acme GmbH', creditorIban: 'DE89370400440532013000', amount: '100.00', currency: 'EUR' },
          { headers: { Authorization: 'Bearer invalid-token' } }
        );
        record('POST /v1/payments - 401 unauthorized', false, 'Expected 401 but got 2xx');
        throw new Error('Expected 401');
      } catch (err) {
        if (err.response && err.response.status === 401) {
          expect(err.response.data.code).toBe('UNAUTHORIZED');
          record('POST /v1/payments - 401 unauthorized', true);
        } else {
          record('POST /v1/payments - 401 unauthorized', false, err.message);
          throw err;
        }
      }
    });
  });

  describe('GET /v1/payments/{paymentId}', () => {
    it('200 returns payment status', async () => {
      try {
        const res = await axios.get(
          `${baseUrl}/v1/payments/a3b4c5d6-e7f8-9012-abcd-ef1234567890`,
          { headers: { Authorization: 'Bearer valid-token' } }
        );
        expect(res.status).toBe(200);
        expect(res.data.paymentId).toBeTruthy();
        expect(res.data.status).toBeTruthy();
        record('GET /v1/payments/{id} - 200', true);
      } catch (err) {
        record('GET /v1/payments/{id} - 200', false, err.message);
        throw err;
      }
    });

    it('401 when no valid token', async () => {
      try {
        await axios.get(
          `${baseUrl}/v1/payments/a3b4c5d6-e7f8-9012-abcd-ef1234567890`,
          { headers: { Authorization: 'Bearer invalid-token' } }
        );
        record('GET /v1/payments/{id} - 401', false, 'Expected 401');
        throw new Error('Expected 401');
      } catch (err) {
        if (err.response && err.response.status === 401) {
          record('GET /v1/payments/{id} - 401', true);
        } else {
          record('GET /v1/payments/{id} - 401', false, err.message);
          throw err;
        }
      }
    });
  });

  describe('GET /v1/accounts/{iban}/transactions', () => {
    it('200 returns transaction list', async () => {
      try {
        const res = await axios.get(
          `${baseUrl}/v1/accounts/DE40200400600100728700/transactions`,
          { headers: { Authorization: 'Bearer valid-token' } }
        );
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.transactions)).toBe(true);
        expect(typeof res.data.totalCount).toBe('number');
        record('GET /v1/accounts/{iban}/transactions - 200', true);
      } catch (err) {
        record('GET /v1/accounts/{iban}/transactions - 200', false, err.message);
        throw err;
      }
    });

    it('401 when no valid token', async () => {
      try {
        await axios.get(
          `${baseUrl}/v1/accounts/DE40200400600100728700/transactions`,
          { headers: { Authorization: 'Bearer invalid-token' } }
        );
        record('GET /v1/accounts/{iban}/transactions - 401', false, 'Expected 401');
        throw new Error('Expected 401');
      } catch (err) {
        if (err.response && err.response.status === 401) {
          record('GET /v1/accounts/{iban}/transactions - 401', true);
        } else {
          record('GET /v1/accounts/{iban}/transactions - 401', false, err.message);
          throw err;
        }
      }
    });
  });
});
