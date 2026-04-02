import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipeApi, inventoryApi } from '../services/recipe.api';
import { toast } from 'react-toastify';

// ─── Query Keys ────────────────────────────────────────────────────────────
export const RECIPE_KEYS = {
  all: ['recipes'],
  list: (filters) => ['recipes', 'list', filters],
  detail: (id) => ['recipes', 'detail', id],
  versions: (id) => ['recipes', 'versions', id],
  costing: (id) => ['recipes', 'costing', id],
  lookup: (filters) => ['recipes', 'lookup', filters],
};

// ─── List Recipes ──────────────────────────────────────────────────────────
export const useRecipes = (filters = {}) => {
  return useQuery({
    queryKey: RECIPE_KEYS.list(filters),
    queryFn: () => recipeApi.list(filters),
    keepPreviousData: true,
  });
};

// ─── Single Recipe ─────────────────────────────────────────────────────────
export const useRecipe = (id) => {
  return useQuery({
    queryKey: RECIPE_KEYS.detail(id),
    queryFn: () => recipeApi.get(id),
    enabled: !!id,
  });
};

// ─── Recipe Costing ────────────────────────────────────────────────────────
export const useRecipeCosting = (recipeId, options = {}) => {
  return useQuery({
    queryKey: RECIPE_KEYS.costing(recipeId),
    queryFn: async () => {
      try {
        return await recipeApi.getCosting(recipeId);
      } catch (err) {
        // 404 means no costing yet — treat as empty, not an error
        if (err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!recipeId,
    retry: (failureCount, err) => err?.status !== 404 && failureCount < 3,
    ...options,
  });
};

// ─── Recipe Versions ───────────────────────────────────────────────────────
export const useRecipeVersions = (recipeId) => {
  return useQuery({
    queryKey: RECIPE_KEYS.versions(recipeId),
    queryFn: () => recipeApi.getVersions(recipeId),
    enabled: !!recipeId,
  });
};

// ─── Lookup (menu planning) ────────────────────────────────────────────────
export const useRecipeLookup = (filters = {}) => {
  return useQuery({
    queryKey: RECIPE_KEYS.lookup(filters),
    queryFn: () => recipeApi.lookup(filters),
    enabled: true,
  });
};

// ─── Warehouses ────────────────────────────────────────────────────────────
export const useWarehouses = () => {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: inventoryApi.getWarehouses,
    staleTime: Infinity,
  });
};

// ─── Inventory Items ────────────────────────────────────────────────────────
export const useInventoryItems = (warehouseId) => {
  return useQuery({
    queryKey: ['inventoryItems', warehouseId],
    queryFn: () => inventoryApi.getActiveItems(warehouseId),
    enabled: !!warehouseId,
    staleTime: 5 * 60 * 1000,
  });
};

// ─── All Inventory Items (no warehouse filter) ─────────────────────────────
export const useAllInventoryItems = () => {
  return useQuery({
    queryKey: ['inventoryItems', 'all'],
    queryFn: () => inventoryApi.getActiveItems(undefined),
    staleTime: 5 * 60 * 1000,
  });
};

// ─── Create Recipe ─────────────────────────────────────────────────────────
export const useCreateRecipe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recipeApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
      toast.success('Recipe created successfully');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Update Recipe ─────────────────────────────────────────────────────────
export const useUpdateRecipe = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => recipeApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
      toast.success('Recipe updated');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Delete Recipe ─────────────────────────────────────────────────────────
export const useDeleteRecipe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recipeApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
      toast.success('Recipe deleted');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Ingredient Mutations ───────────────────────────────────────────────────
export const useAddIngredient = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => recipeApi.addIngredient(recipeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.costing(recipeId) });
      toast.success('Ingredient added');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateIngredient = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ingredientId, data }) => recipeApi.updateIngredient(recipeId, ingredientId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.costing(recipeId) });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useRemoveIngredient = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ingredientId) => recipeApi.removeIngredient(recipeId, ingredientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.costing(recipeId) });
      toast.success('Ingredient removed');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Step Mutations ─────────────────────────────────────────────────────────
export const useAddStep = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => recipeApi.addStep(recipeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
      toast.success('Step added');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateStep = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stepId, data }) => recipeApi.updateStep(recipeId, stepId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useRemoveStep = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stepId) => recipeApi.removeStep(recipeId, stepId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
      toast.success('Step removed');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Workflow Mutations ─────────────────────────────────────────────────────
export const useSubmitForReview = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => recipeApi.submitForReview(recipeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
      toast.success('Recipe submitted for review');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useApproveRecipe = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => recipeApi.approve(recipeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
      toast.success('Recipe approved');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useRejectRecipe = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => recipeApi.reject(recipeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
      toast.success('Recipe returned to draft');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useChangeStatus = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => recipeApi.changeStatus(recipeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useCreateNewVersion = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => recipeApi.createNewVersion(recipeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.all });
      toast.success('New version created as Draft');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Costing Mutation ───────────────────────────────────────────────────────
export const useRecalculateCosting = (recipeId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => recipeApi.recalculateCosting(recipeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.costing(recipeId) });
      qc.invalidateQueries({ queryKey: RECIPE_KEYS.detail(recipeId) });
      toast.success('Cost recalculated');
    },
    onError: (err) => toast.error(err.message),
  });
};

// ─── Scale Recipe ───────────────────────────────────────────────────────────
export const useScaleRecipe = (recipeId) => {
  return useMutation({
    mutationFn: (data) => recipeApi.scale(recipeId, data),
    onError: (err) => toast.error(err.message),
  });
};
