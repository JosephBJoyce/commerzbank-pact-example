const { Verifier } = require('@pact-foundation/pact');
const app = require('../src/app');
const http = require('http');

describe('Customers API - Provider Pact Verification', () => {
  let server;
  let port;

  beforeAll((done) => {
    server = http.createServer(app);
    server.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => server.close(done));

  it('validates the pacts from PactFlow', async () => {
    const verifier = new Verifier({
      provider: 'commerzbank-customers-api',
      providerBaseUrl: `http://localhost:${port}`,

      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,

      publishVerificationResults: true,
      providerVersion: process.env.GITHUB_SHA || process.env.GIT_COMMIT,
      providerVersionBranch: process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || 'main',

      consumerVersionSelectors: [
        { mainBranch: true },
        { matchingBranch: true },
        { deployedOrReleased: true },
      ],
      enablePending: true,

      stateHandlers: {
        'customer DE12345 exists': async () => {
          // customer is seeded in app.js; no dynamic state needed
        },
        'customer DE12345 has registered addresses': async () => {},
        'customer DE12345 has registered phone numbers': async () => {},
        'customer DE99999 has no phone numbers': async () => {
          // DE99999 is intentionally absent from the store
        },
        'no valid token': async () => {},
      },
    });

    await verifier.verifyProvider();
  });
});
