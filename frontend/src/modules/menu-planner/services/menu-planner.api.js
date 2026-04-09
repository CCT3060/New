import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ck_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
      // If embedded in company portal iframe, redirect the top frame
      if (window.self !== window.top) {
        window.top.location.href = '/company';
      } else {
        window.location.href = '/login';
      }
    }

    const error = new Error(message);
    error.status = err.response?.status;
    error.errors = err.response?.data?.errors;
    throw error;
  }
);

export const menuPlanApi = {
  list: async (params = {}) => {
    const res = await api.get('/menu-plans', { params });
    return res.data ?? res;
  },
  get: async (id) => {
    const res = await api.get(`/menu-plans/${id}`);
    return res.data ?? res;
  },
  create: async (data) => {
    const res = await api.post('/menu-plans', data);
    return res.data ?? res;
  },
  update: async (id, data) => {
    const res = await api.put(`/menu-plans/${id}`, data);
    return res.data ?? res;
  },
  delete: async (id) => {
    const res = await api.delete(`/menu-plans/${id}`);
    return res.data ?? res;
  },
  addItem: async (id, data) => {
    const res = await api.post(`/menu-plans/${id}/items`, data);
    return res.data ?? res;
  },
  updateItem: async (id, itemId, data) => {
    const res = await api.put(`/menu-plans/${id}/items/${itemId}`, data);
    return res.data ?? res;
  },
  removeItem: async (id, itemId) => {
    const res = await api.delete(`/menu-plans/${id}/items/${itemId}`);
    return res.data ?? res;
  },
  // Calendar-specific endpoints
  dropOnSlot: async (data) => {
    const res = await api.post('/menu-plans/calendar/drop', data);
    return res.data ?? res;
  },
  moveItem: async (data) => {
    const res = await api.post('/menu-plans/calendar/move', data);
    return res.data ?? res;
  },
  // Report & week management
  getReport: async (params = {}) => {
    const res = await api.get('/menu-plans/report', { params });
    return res.data ?? res;
  },
  clearRange: async (data) => {
    const res = await api.post('/menu-plans/clear-range', data);
    return res.data ?? res;
  },
  duplicateWeek: async (data) => {
    const res = await api.post('/menu-plans/duplicate-week', data);
    return res.data ?? res;
  },
};

export const recipePickerApi = {
  lookup: async (params = {}) => {
    const res = await api.get('/recipes/lookup', { params });
    return res.data ?? res;
  },
};
