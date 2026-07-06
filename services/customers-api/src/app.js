const express = require('express');

const app = express();
app.use(express.json());

const customers = {
  DE12345: {
    customerId: 'DE12345',
    salutation: 'Mr',
    firstName: 'Hans',
    lastName: 'Mueller',
    dateOfBirth: '1980-03-15',
    nationality: 'DE',
  },
};

const addresses = {
  DE12345: {
    addresses: [
      {
        addressType: 'PRIMARY',
        street: 'Kaiserplatz',
        houseNumber: '1',
        postalCode: '60311',
        city: 'Frankfurt am Main',
        countryCode: 'DE',
      },
    ],
  },
};

const phoneNumbers = {
  DE12345: {
    phoneNumbers: [
      {
        phoneType: 'MOBILE',
        countryCode: '+49',
        number: '1701234567',
      },
    ],
  },
};

function isAuthorized(req) {
  const auth = req.headers['authorization'];
  return auth && auth.startsWith('Bearer ') && !auth.includes('invalid');
}

app.get('/v2/customers/:customerId', (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Access token is missing or invalid' });
  }
  const customer = customers[req.params.customerId];
  if (!customer) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Customer not found' });
  }
  res.json(customer);
});

app.get('/v2/customers/:customerId/addresses', (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Access token is missing or invalid' });
  }
  const result = addresses[req.params.customerId];
  if (!result) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'No addresses found for this customer' });
  }
  res.json(result);
});

app.get('/v2/customers/:customerId/phone-numbers', (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Access token is missing or invalid' });
  }
  const result = phoneNumbers[req.params.customerId];
  if (!result) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'No phone numbers found for this customer' });
  }
  res.json(result);
});

module.exports = app;

if (require.main === module) {
  app.listen(3001, () => console.log('Customers API running on port 3001'));
}
