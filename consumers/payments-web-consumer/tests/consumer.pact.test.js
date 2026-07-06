const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { PaymentsClient } = require('../src/paymentsClient');
const path = require('path');

const { like, regex, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: 'commerzbank-payments-web-consumer',
  provider: 'commerzbank-corporate-payments-api',
  dir: path.resolve(__dirname, '../pacts'),
});

describe('Corporate Payments API - Consumer Pact Tests', () => {
  describe('POST /v1/payments', () => {
    it('successfully submits a SEPA credit transfer', async () => {
      await provider
        .given('corporate client is authenticated and has sufficient funds')
        .uponReceiving('a request to submit a SEPA credit transfer')
        .withRequest({
          method: 'POST',
          path: '/v1/payments',
          headers: {
            Authorization: regex('^Bearer .+$', 'Bearer test-access-token'),
          },
          body: {
            creditorName: like('Acme GmbH'),
            creditorIban: regex('^DE\\d{20}$', 'DE89370400440532013000'),
            creditorBic: like('COBADEFFXXX'),
            amount: like('1500.00'),
            currency: regex('^[A-Z]{3}$', 'EUR'),
            remittanceInformation: like('Invoice INV-2024-001'),
          },
        })
        .willRespondWith({
          status: 201,
          body: {
            paymentId: regex('^[a-f0-9-]{36}$', 'a3b4c5d6-e7f8-9012-abcd-ef1234567890'),
            status: like('RECEIVED'),
            timestamp: regex(
              '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}',
              '2024-06-15T10:30:00Z'
            ),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new PaymentsClient(mockServer.url);
          const result = await client.submitPaymentOrder(
            {
              creditorName: 'Acme GmbH',
              creditorIban: 'DE89370400440532013000',
              creditorBic: 'COBADEFFXXX',
              amount: '1500.00',
              currency: 'EUR',
              remittanceInformation: 'Invoice INV-2024-001',
            },
            'test-access-token'
          );
          expect(result.paymentId).toBeTruthy();
          expect(result.status).toBe('RECEIVED');
        });
    });

    it('returns 401 when token is invalid', async () => {
      await provider
        .given('no valid token')
        .uponReceiving('a payment submission without a valid token')
        .withRequest({
          method: 'POST',
          path: '/v1/payments',
          headers: {
            Authorization: like('Bearer invalid-token'),
          },
          body: {
            creditorName: like('Acme GmbH'),
            creditorIban: like('DE89370400440532013000'),
            amount: like('100.00'),
            currency: like('EUR'),
          },
        })
        .willRespondWith({
          status: 401,
          body: {
            code: like('UNAUTHORIZED'),
            message: like('Access token is missing or invalid'),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new PaymentsClient(mockServer.url);
          await expect(
            client.submitPaymentOrder(
              { creditorName: 'Acme GmbH', creditorIban: 'DE89370400440532013000', amount: '100.00', currency: 'EUR' },
              'invalid-token'
            )
          ).rejects.toThrow();
        });
    });
  });

  describe('GET /v1/accounts/{iban}/transactions', () => {
    it('returns a list of transactions for a corporate account', async () => {
      await provider
        .given('account DE40200400600100728700 has transactions')
        .uponReceiving('a request for account transactions')
        .withRequest({
          method: 'GET',
          path: '/v1/accounts/DE40200400600100728700/transactions',
          headers: {
            Authorization: regex('^Bearer .+$', 'Bearer test-access-token'),
          },
        })
        .willRespondWith({
          status: 200,
          body: {
            transactions: eachLike({
              transactionId: like('TXN-2024-001'),
              bookingDate: regex('^\\d{4}-\\d{2}-\\d{2}$', '2024-06-15'),
              valueDate: regex('^\\d{4}-\\d{2}-\\d{2}$', '2024-06-15'),
              amount: like('-1500.00'),
              currency: regex('^[A-Z]{3}$', 'EUR'),
              creditorName: like('Acme GmbH'),
              remittanceInformation: like('Invoice INV-2024-001'),
            }),
            totalCount: like(1),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new PaymentsClient(mockServer.url);
          const result = await client.getAccountTransactions(
            'DE40200400600100728700',
            'test-access-token'
          );
          expect(result.transactions).toHaveLength(1);
          expect(result.transactions[0].transactionId).toBeTruthy();
        });
    });

    it('returns 401 when no valid token is provided', async () => {
      await provider
        .given('no valid token')
        .uponReceiving('a request for account transactions without a valid token')
        .withRequest({
          method: 'GET',
          path: '/v1/accounts/DE40200400600100728700/transactions',
          headers: {
            Authorization: like('Bearer invalid-token'),
          },
        })
        .willRespondWith({
          status: 401,
          body: {
            code: like('UNAUTHORIZED'),
            message: like('Access token is missing or invalid'),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new PaymentsClient(mockServer.url);
          await expect(
            client.getAccountTransactions('DE40200400600100728700', 'invalid-token')
          ).rejects.toThrow();
        });
    });
  });

  describe('GET /v1/payments/{paymentId}', () => {
    it('returns the status of a submitted payment', async () => {
      await provider
        .given('payment a3b4c5d6-e7f8-9012-abcd-ef1234567890 exists')
        .uponReceiving('a request for payment status')
        .withRequest({
          method: 'GET',
          path: '/v1/payments/a3b4c5d6-e7f8-9012-abcd-ef1234567890',
          headers: {
            Authorization: regex('^Bearer .+$', 'Bearer test-access-token'),
          },
        })
        .willRespondWith({
          status: 200,
          body: {
            paymentId: like('a3b4c5d6-e7f8-9012-abcd-ef1234567890'),
            status: like('ACSC'),
            creditorName: like('Acme GmbH'),
            creditorIban: regex('^DE\\d{20}$', 'DE89370400440532013000'),
            amount: like('1500.00'),
            currency: regex('^[A-Z]{3}$', 'EUR'),
            executionDate: regex('^\\d{4}-\\d{2}-\\d{2}$', '2024-06-15'),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new PaymentsClient(mockServer.url);
          const result = await client.getPaymentStatus(
            'a3b4c5d6-e7f8-9012-abcd-ef1234567890',
            'test-access-token'
          );
          expect(result.paymentId).toBeTruthy();
          expect(result.status).toBeTruthy();
        });
    });
  });
});
