/**
 * useRecipes - Pure React hooks for recipe data fetching & mutations.
 * No external query library - uses useState / useEffect / useCallback.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { recipeApi, inventoryApi } from '../services/recipe.api';
import { toast } from 'react-toastify';

// --- Generic fetch hook (replaces useQuery) ---
function useFetch(fetchFn, { enabled = true, initialData = undefined } = {}) {
  const [data, setData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await fetchRef.current();
      if (mountedRef.current) { setData(result); setIsLoading(false); }
      return result;
    } catch (err) {
      if (mountedRef.current) { setError(err); setIsError(true); setIsLoading(false); }
      return undefined;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) refetch();
    else setIsLoading(false);
    return () => { mountedRef.current = false; };
  }, [enabled, refetch]);

  return { data, isLoading, isError, error, refetch };
}

// --- Generic mutation hook (replaces useMutation) ---
function useMutate(mutationFn, { onSuccess, onError } = {}) {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(async (...args) => {
    setIsPending(true);
    try {
      const result = await mutationFn(...args);
      if (onSuccess) onSuccess(result, ...args);
      return result;
    } catch (err) {
      if (onError) onError(err);
      throw err;
    } finally {
      setIsPending(false);
    }
  }, [mutationFn, onSuccess, onError]);
  return { mutateAsync, isPending };
}

// --- Refresh bus - lets mutations tell queries to refetch ---
const listeners = new Set();
export function onRefresh(cb) { listeners.add(cb); return () => listeners.delete(cb); }
function emitRefresh(key) { listeners.forEach(cb => cb(key)); }

function useFetchWithRefresh(fetchFn, deps, opts = {}) {
  const hook = useFetch(fetchFn, opts);
  useEffect(() => {
    const unsub = onRefresh((key) => {
      if (!deps || deps.some(d => key === d || key === 'all')) hook.refetch();
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.refetch]);
  return hook;
}

// --- List Recipes ---
export const useRecipes = (filters = {}) => {
  const filterKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(() => recipeApi.list(filters), [filterKey]);
  return useFetchWithRefresh(fn, ['recipes', 'all']);
};

// --- Single Recipe ---
export const useRecipe = (id) => {
  const fn = useCallback(() => recipeApi.get(id), [id]);
  return useFetchWithRefresh(fn, ['recipes', 'recipe-' + id, 'all'], { enabled: !!id });
};

// --- Recipe Costing ---
export const useRecipeCosting = (recipeId, options = {}) => {
  const fn = useCallback(async () => {
    try { return await recipeApi.getCosting(recipeId); }
    catch (err) { if (err.status === 404) return null; throw err; }
  }, [recipeId]);
  return useFetchWithRefresh(fn, ['recipes', 'costing-' + recipeId, 'all'], { enabled: !!recipeId, ...options });
};

// --- Recipe Versions ---
export const useRecipeVersions = (recipeId) => {
  const fn = useCallback(() => recipeApi.getVersions(recipeId), [recipeId]);
  return useFetchWithRefresh(fn, ['recipes', 'versions-' + recipeId], { enabled: !!recipeId });
};

// --- Lookup (menu planning) ---
export const useRecipeLookup = (filters = {}) => {
  const filterKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(() => recipeApi.lookup(filters), [filterKey]);
  return useFetchWithRefresh(fn, ['recipes', 'all']);
};

// --- Warehouses ---
export const useWarehouses = () => {
  const fn = useCallback(() => inventoryApi.getWarehouses(), []);
  return useFetch(fn);
};

// --- Inventory Items ---
export const useInventoryItems = (warehouseId) => {
  const fn = useCallback(() => inventoryApi.getActiveItems(warehouseId || undefined), [warehouseId]);
  return useFetch(fn);
};

// --- All Inventory Items (no warehouse filter) ---
export const useAllInventoryItems = () => {
  const fn = useCallback(() => inventoryApi.getActiveItems(undefined), []);
  return useFetch(fn);
};

// --- Create Recipe ---
export const useCreateRecipe = () =>
  useMutate(
    useCallback((data) => recipeApi.create(data), []),
    {
      onSuccess: () => { emitRefresh('recipes'); toast.success('Recipe created successfully'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Update Recipe ---
export const useUpdateRecipe = (staticId) =>
  useMutate(
    useCallback((arg) => {
      const rid = staticId || arg?.recipeId;
      const payload = arg?.data ?? arg;
      return recipeApi.update(rid, payload);
    }, [staticId]),
    {
      onSuccess: () => { emitRefresh('recipes'); emitRefresh('all'); toast.success('Recipe updated'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Delete Recipe ---
export const useDeleteRecipe = () =>
  useMutate(
    useCallback((id) => recipeApi.delete(id), []),
    {
      onSuccess: () => { emitRefresh('recipes'); toast.success('Recipe deleted'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Ingredient Mutations ---
export const useAddIngredient = (recipeId) =>
  useMutate(
    useCallback((data) => recipeApi.addIngredient(recipeId, data), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipe-' + recipeId); emitRefresh('costing-' + recipeId); toast.success('Ingredient added'); },
      onError: (err) => toast.error(err.message),
    }
  );

export const useUpdateIngredient = (recipeId) =>
  useMutate(
    useCallback(({ ingredientId, data }) => recipeApi.updateIngredient(recipeId, ingredientId, data), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipe-' + recipeId); emitRefresh('costing-' + recipeId); },
      onError: (err) => toast.error(err.message),
    }
  );

export const useRemoveIngredient = (recipeId) =>
  useMutate(
    useCallback((ingredientId) => recipeApi.removeIngredient(recipeId, ingredientId), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipe-' + recipeId); emitRefresh('costing-' + recipeId); toast.success('Ingredient removed'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Step Mutations ---
export const useAddStep = (recipeId) =>
  useMutate(
    useCallback((data) => recipeApi.addStep(recipeId, data), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipe-' + recipeId); toast.success('Step added'); },
      onError: (err) => toast.error(err.message),
    }
  );

export const useUpdateStep = (recipeId) =>
  useMutate(
    useCallback(({ stepId, data }) => recipeApi.updateStep(recipeId, stepId, data), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipe-' + recipeId); },
      onError: (err) => toast.error(err.message),
    }
  );

export const useRemoveStep = (recipeId) =>
  useMutate(
    useCallback((stepId) => recipeApi.removeStep(recipeId, stepId), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipe-' + recipeId); toast.success('Step removed'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Workflow Mutations ---
export const useSubmitForReview = (recipeId) =>
  useMutate(
    useCallback(() => recipeApi.submitForReview(recipeId), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipe-' + recipeId); emitRefresh('recipes'); toast.success('Recipe submitted for review'); },
      onError: (err) => toast.error(err.message),
    }
  );

export const useApproveRecipe = (recipeId) =>
  useMutate(
    useCallback((data) => recipeApi.approve(recipeId, data), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipe-' + recipeId); emitRefresh('recipes'); toast.success('Recipe approved'); },
      onError: (err) => toast.error(err.message),
    }
  );

export const useRejectRecipe = (recipeId) =>
  useMutate(
    useCallback((data) => recipeApi.reject(recipeId, data), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipe-' + recipeId); emitRefresh('recipes'); toast.success('Recipe returned to draft'); },
      onError: (err) => toast.error(err.message),
    }
  );

export const useChangeStatus = (recipeId) =>
  useMutate(
    useCallback((data) => recipeApi.changeStatus(recipeId, data), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipe-' + recipeId); emitRefresh('recipes'); toast.success('Status updated'); },
      onError: (err) => toast.error(err.message),
    }
  );

export const useCreateNewVersion = (recipeId) =>
  useMutate(
    useCallback((data) => recipeApi.createNewVersion(recipeId, data), [recipeId]),
    {
      onSuccess: () => { emitRefresh('recipes'); toast.success('New version created as Draft'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Costing Mutation ---
export const useRecalculateCosting = (recipeId) =>
  useMutate(
    useCallback((data) => recipeApi.recalculateCosting(recipeId, data), [recipeId]),
    {
      onSuccess: () => { emitRefresh('costing-' + recipeId); emitRefresh('recipe-' + recipeId); toast.success('Cost recalculated'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Scale Recipe ---
export const useScaleRecipe = (recipeId) =>
  useMutate(
    useCallback((data) => recipeApi.scale(recipeId, data), [recipeId]),
    { onError: (err) => toast.error(err.message) }
  );
