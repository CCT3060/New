import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ck_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle common error cases
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.errors?.[0]?.message ||
      err.message ||
      'Something went wrong';

    if (err.response?.status === 401) {
      localStorage.removeItem('ck_token');
      localStorage.removeItem('ck_user');
      window.location.href = '/login';
    }

    const error = new Error(message);
    error.status = err.response?.status;
    error.errors = err.response?.data?.errors;
    throw error;
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// AUTH API
// ─────────────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    // interceptor already returns res.data (the JSON body); backend wraps as { success, data }
    return res.data ?? res;
  },
  getProfile: async () => {
    const res = await api.get('/auth/profile');
    return res.data ?? res;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// RECIPE API
// ─────────────────────────────────────────────────────────────────────────────
export const recipeApi = {
  // Master
  list: (params) => api.get('/recipes', { params }).then((r) => r.data),
  get: (id) => api.get(`/recipes/${id}`).then((r) => r.data),
  create: (data) => api.post('/recipes', data).then((r) => r.data),
  update: (id, data) => api.put(`/recipes/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/recipes/${id}`).then((r) => r.data),
  lookup: (params) => api.get('/recipes/lookup', { params }).then((r) => r.data),

  // Ingredients
  addIngredient: (recipeId, data) => api.post(`/recipes/${recipeId}/ingredients`, data).then((r) => r.data),
  updateIngredient: (recipeId, ingredientId, data) => api.put(`/recipes/${recipeId}/ingredients/${ingredientId}`, data).then((r) => r.data),
  removeIngredient: (recipeId, ingredientId) => api.delete(`/recipes/${recipeId}/ingredients/${ingredientId}`).then((r) => r.data),

  // Steps
  addStep: (recipeId, data) => api.post(`/recipes/${recipeId}/steps`, data).then((r) => r.data),
  updateStep: (recipeId, stepId, data) => api.put(`/recipes/${recipeId}/steps/${stepId}`, data).then((r) => r.data),
  removeStep: (recipeId, stepId) => api.delete(`/recipes/${recipeId}/steps/${stepId}`).then((r) => r.data),

  // Costing
  getCosting: (recipeId) => api.get(`/recipes/${recipeId}/costing`).then((r) => r.data),
  recalculateCosting: (recipeId, data) => api.post(`/recipes/${recipeId}/costing/recalculate`, data).then((r) => r.data),

  // Workflow
  submitForReview: (recipeId) => api.post(`/recipes/${recipeId}/submit-review`).then((r) => r.data),
  approve: (recipeId, data) => api.post(`/recipes/${recipeId}/approve`, data).then((r) => r.data),
  reject: (recipeId, data) => api.post(`/recipes/${recipeId}/reject`, data).then((r) => r.data),
  changeStatus: (recipeId, data) => api.patch(`/recipes/${recipeId}/status`, data).then((r) => r.data),

  // Versioning
  createNewVersion: (recipeId, data) => api.post(`/recipes/${recipeId}/new-version`, data).then((r) => r.data),
  getVersions: (recipeId) => api.get(`/recipes/${recipeId}/versions`).then((r) => r.data),

  // Scale
  scale: (recipeId, data) => api.post(`/recipes/${recipeId}/scale`, data).then((r) => r.data),
};

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY API
// ─────────────────────────────────────────────────────────────────────────────
export const inventoryApi = {
  getActiveItems: (warehouseId) => api.get('/inventory/items/active', { params: { warehouseId } }).then((r) => r.data),
  getWarehouses: () => api.get('/inventory/warehouses').then((r) => r.data),
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT API
// ─────────────────────────────────────────────────────────────────────────────
export const auditApi = {
  getEntityLogs: (entityId, params) => api.get(`/audit/entity/${entityId}`, { params }).then((r) => r.data),
};

export default api;
