import axios from 'axios';

const API_BASE_URL = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const userService = {
  // Get list of users with pagination and search
  getUsers: async (params = {}) => {
    const response = await apiClient.get('/users/', { params });
    return response.data;
  },

  // Get user by UUID
  getUserById: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  // Get user by loyalty QR code
  getUserByLoyaltyCode: async (loyaltyCode) => {
    const response = await apiClient.get(`/users/loyalty/${encodeURIComponent(loyaltyCode)}`);
    return response.data;
  },

  // Create new customer
  createUser: async (userData) => {
    const response = await apiClient.post('/users/', userData);
    return response.data;
  },

  // Update existing customer profile
  updateUser: async (userId, userData) => {
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response.data;
  },

  // Soft delete customer
  deleteUser: async (userId) => {
    const response = await apiClient.delete(`/users/${userId}`);
    return response.data;
  },

  // Fetch Google Wallet Pass Link
  getGoogleWalletPass: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/wallet/google`);
    return response.data;
  }
};
