const axios = require('axios');

class CustomersClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.http = axios.create({ baseURL: baseUrl });
  }

  async getCustomer(customerId, accessToken) {
    const response = await this.http.get(`/v2/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async getCustomerAddresses(customerId, accessToken) {
    const response = await this.http.get(`/v2/customers/${customerId}/addresses`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }

  async getCustomerPhoneNumbers(customerId, accessToken) {
    const response = await this.http.get(`/v2/customers/${customerId}/phone-numbers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  }
}

module.exports = { CustomersClient };
