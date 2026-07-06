const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { CustomersClient } = require('../src/customersClient');
const path = require('path');

const { like, regex, eachLike } = MatchersV3;

const provider = new PactV3({
  consumer: 'commerzbank-customers-mobile-consumer',
  provider: 'commerzbank-customers-api',
  dir: path.resolve(__dirname, '../pacts'),
});

describe('Customers API - Consumer Pact Tests', () => {
  describe('GET /v2/customers/{customerId}', () => {
    it('returns customer personal data for a valid customer', async () => {
      await provider
        .given('customer DE12345 exists')
        .uponReceiving('a request for customer personal data')
        .withRequest({
          method: 'GET',
          path: '/v2/customers/DE12345',
          headers: {
            Authorization: regex('^Bearer .+$', 'Bearer test-access-token'),
          },
        })
        .willRespondWith({
          status: 200,
          body: {
            customerId: like('DE12345'),
            salutation: like('Mr'),
            firstName: like('Hans'),
            lastName: like('Mueller'),
            dateOfBirth: regex('^\\d{4}-\\d{2}-\\d{2}$', '1980-03-15'),
            nationality: like('DE'),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new CustomersClient(mockServer.url);
          const result = await client.getCustomer('DE12345', 'test-access-token');
          expect(result.customerId).toBeTruthy();
          expect(result.firstName).toBeTruthy();
          expect(result.lastName).toBeTruthy();
        });
    });

    it('returns 401 when no valid token is provided', async () => {
      await provider
        .given('no valid token')
        .uponReceiving('a request for customer data without a valid token')
        .withRequest({
          method: 'GET',
          path: '/v2/customers/DE12345',
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
          const client = new CustomersClient(mockServer.url);
          await expect(client.getCustomer('DE12345', 'invalid-token')).rejects.toThrow();
        });
    });
  });

  describe('GET /v2/customers/{customerId}/addresses', () => {
    it('returns the list of addresses for a valid customer', async () => {
      await provider
        .given('customer DE12345 has registered addresses')
        .uponReceiving('a request for customer addresses')
        .withRequest({
          method: 'GET',
          path: '/v2/customers/DE12345/addresses',
          headers: {
            Authorization: regex('^Bearer .+$', 'Bearer test-access-token'),
          },
        })
        .willRespondWith({
          status: 200,
          body: {
            addresses: eachLike({
              addressType: like('PRIMARY'),
              street: like('Kaiserplatz'),
              houseNumber: like('1'),
              postalCode: regex('^\\d{5}$', '60311'),
              city: like('Frankfurt am Main'),
              countryCode: regex('^[A-Z]{2}$', 'DE'),
            }),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new CustomersClient(mockServer.url);
          const result = await client.getCustomerAddresses('DE12345', 'test-access-token');
          expect(result.addresses).toHaveLength(1);
          expect(result.addresses[0].city).toBeTruthy();
        });
    });

    it('returns 401 when no valid token is provided', async () => {
      await provider
        .given('no valid token')
        .uponReceiving('a request for customer addresses without a valid token')
        .withRequest({
          method: 'GET',
          path: '/v2/customers/DE12345/addresses',
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
          const client = new CustomersClient(mockServer.url);
          await expect(
            client.getCustomerAddresses('DE12345', 'invalid-token')
          ).rejects.toThrow();
        });
    });
  });

  describe('GET /v2/customers/{customerId}/phone-numbers', () => {
    it('returns the list of phone numbers for a valid customer', async () => {
      await provider
        .given('customer DE12345 has registered phone numbers')
        .uponReceiving('a request for customer phone numbers')
        .withRequest({
          method: 'GET',
          path: '/v2/customers/DE12345/phone-numbers',
          headers: {
            Authorization: regex('^Bearer .+$', 'Bearer test-access-token'),
          },
        })
        .willRespondWith({
          status: 200,
          body: {
            phoneNumbers: eachLike({
              phoneType: like('MOBILE'),
              countryCode: like('+49'),
              number: like('1701234567'),
            }),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new CustomersClient(mockServer.url);
          const result = await client.getCustomerPhoneNumbers('DE12345', 'test-access-token');
          expect(result.phoneNumbers).toHaveLength(1);
          expect(result.phoneNumbers[0].number).toBeTruthy();
        });
    });

    it('returns 404 when customer has no registered phone numbers', async () => {
      await provider
        .given('customer DE99999 has no phone numbers')
        .uponReceiving('a request for phone numbers of a customer with none registered')
        .withRequest({
          method: 'GET',
          path: '/v2/customers/DE99999/phone-numbers',
          headers: {
            Authorization: regex('^Bearer .+$', 'Bearer test-access-token'),
          },
        })
        .willRespondWith({
          status: 404,
          body: {
            code: like('NOT_FOUND'),
            message: like('No phone numbers found for this customer'),
          },
        })
        .executeTest(async (mockServer) => {
          const client = new CustomersClient(mockServer.url);
          await expect(
            client.getCustomerPhoneNumbers('DE99999', 'test-access-token')
          ).rejects.toThrow();
        });
    });
  });
});
