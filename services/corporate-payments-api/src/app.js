const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const payments = {};

const transactions = {
  DE40200400600100728700: {
    transactions: [
      {
        transactionId: 'TXN-2024-001',
        bookingDate: '2024-06-15',
        valueDate: '2024-06-15',
        amount: '-1500.00',
        currency: 'EUR',
        creditorName: 'Acme GmbH',
        remittanceInformation: 'Invoice INV-2024-001',
      },
    ],
    totalCount: 1,
  },
};

function isAuthorized(req) {
  const auth = req.headers['authorization'];
  return auth && auth.startsWith('Bearer ') && !auth.includes('invalid');
}

app.post('/v1/payments', (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Access token is missing or invalid' });
  }
  const { creditorName, creditorIban, creditorBic, amount, currency, remittanceInformation } = req.body;
  if (!creditorName || !creditorIban || !amount || !currency) {
    return res.status(422).json({ code: 'VALIDATION_ERROR', message: 'Missing required fields' });
  }
  const paymentId = crypto.randomUUID();
  payments[paymentId] = {
    paymentId,
    status: 'RECEIVED',
    creditorName,
    creditorIban,
    creditorBic,
    amount,
    currency,
    remittanceInformation,
    executionDate: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
  };
  res.status(201).json({
    paymentId,
    status: 'RECEIVED',
    timestamp: payments[paymentId].timestamp,
  });
});

app.get('/v1/payments/:paymentId', (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Access token is missing or invalid' });
  }
  const payment = payments[req.params.paymentId]
    || {
      paymentId: req.params.paymentId,
      status: 'ACSC',
      creditorName: 'Acme GmbH',
      creditorIban: 'DE89370400440532013000',
      amount: '1500.00',
      currency: 'EUR',
      executionDate: '2024-06-15',
    };
  res.json(payment);
});

app.get('/v1/accounts/:iban/transactions', (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Access token is missing or invalid' });
  }
  const result = transactions[req.params.iban];
  if (!result) {
    return res.json({ transactions: [], totalCount: 0 });
  }
  res.json(result);
});

module.exports = app;

if (require.main === module) {
  app.listen(3002, () => console.log('Corporate Payments API running on port 3002'));
}
