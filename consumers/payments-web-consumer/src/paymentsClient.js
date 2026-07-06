const axios = require('axios');

class PaymentsClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.http = axios.create({ baseURL: baseUrl });
  }

  async submitPaymentOrder(paymentData, accessToken) {
    const response = await this.http.post('/v1/payments', paymentData, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async getAccountTransactions(iban, accessToken, params = {}) {
    const response = await this.http.get(`/v1/accounts/${iban}/transactions`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });
    return response.data;
  }

  async getPaymentStatus(paymentId, accessToken) {
    const response = await this.http.get(`/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }
}

module.exports = { PaymentsClient };
