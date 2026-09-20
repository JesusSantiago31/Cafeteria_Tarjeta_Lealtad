import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';



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
  getGoogleWalletPass: async (userIdOrCode) => {
    try {
      const response = await apiClient.get(`/users/${encodeURIComponent(userIdOrCode)}/wallet/google`);
      return response.data;
    } catch (err) {
      const response = await apiClient.get(`/users/loyalty/${encodeURIComponent(userIdOrCode)}/wallet/google`);
      return response.data;
    }
  },


  // Fetch customer transaction and redemption history
  getUserTransactions: async (userId) => {
    const response = await apiClient.get(`/users/${userId}/transactions`);
    return response.data;
  }
};

export const productService = {
  // Get list of reward products
  getProducts: async () => {
    const response = await apiClient.get('/products/');
    return response.data;
  },

  // Create reward product
  createProduct: async (productData) => {
    const response = await apiClient.post('/products/', productData);
    return response.data;
  },

  // Update reward product
  updateProduct: async (productId, productData) => {
    const response = await apiClient.put(`/products/${productId}`, productData);
    return response.data;
  },

  // Delete reward product
  deleteProduct: async (productId) => {
    const response = await apiClient.delete(`/products/${productId}`);
    return response.data;
  },

  // Upload product image file to Google Drive
  uploadProductImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/products/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Redeem product using points
  redeemProduct: async (userId, productId) => {
    const response = await apiClient.post('/products/redeem', {
      user_id: userId,
      product_id: productId
    });
    return response.data;
  }
};

