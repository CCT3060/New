import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Proxied to http://localhost:5000 in vite.config.js
});

export const companiesApi = {
  getAll: () => api.get('/companies'),
  getOne: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

export const ingredientsApi = {
  getAll: () => api.get('/ingredients'),
  create: (data) => api.post('/ingredients', data),
  update: (id, data) => api.put(`/ingredients/${id}`, data),
  delete: (id) => api.delete(`/ingredients/${id}`),
};

export const recipesApi = {
  getAll: () => api.get('/recipes'),
  getPaxReport: (id, pax) => api.get(`/recipes/${id}/pax-report`, { params: { pax } }),
  create: (data) => api.post('/recipes', data),
  update: (id, data) => api.put(`/recipes/${id}`, data),
  delete: (id) => api.delete(`/recipes/${id}`),
};

export const plannerApi = {
  getPlans: (params) => api.get('/planner', { params }),
  getPlansAll: (params) => api.get('/planner/all', { params }),
  assign: (data) => api.post('/planner/assign', data),
  assignBatch: (data) => api.post('/planner/assign-batch', data),
  updatePax: (id, pax_count) => api.patch(`/planner/${id}/pax`, { pax_count }),
  replaceRecipe: (id, new_recipe_id) => api.patch(`/planner/${id}/replace`, { new_recipe_id }),
  shuffle: (data) => api.post('/planner/shuffle', data),
  delete: (id) => api.delete(`/planner/${id}`),
  copyWeek: (data) => api.post('/planner/copy-week', data), // legacy
  copyRange: (data) => api.post('/planner/copy-range', data),
  clearWeek: (data) => api.post('/planner/clear-week', data),
};

export default api;
