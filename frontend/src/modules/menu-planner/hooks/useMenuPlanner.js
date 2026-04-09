/**
 * useMenuPlanner - Pure React hooks for menu plan data fetching & mutations.
 * No external query library - uses useState / useEffect / useCallback.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { menuPlanApi, recipePickerApi } from '../services/menu-planner.api';
import { toast } from 'react-toastify';

// --- Generic fetch hook ---
function useFetch(fetchFn, { enabled = true } = {}) {
  const [data, setData] = useState(undefined);
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

// --- Generic mutation hook ---
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

// --- Refresh bus ---
const listeners = new Set();
export function onMenuRefresh(cb) { listeners.add(cb); return () => listeners.delete(cb); }
function emitRefresh(key) { listeners.forEach(cb => cb(key)); }

function useFetchWithRefresh(fetchFn, deps, opts = {}) {
  const hook = useFetch(fetchFn, opts);
  useEffect(() => {
    const unsub = onMenuRefresh((key) => {
      if (!deps || deps.some(d => key === d || key === 'all')) hook.refetch();
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hook.refetch]);
  return hook;
}

// --- List Menu Plans ---
export const useMenuPlans = (filters = {}) => {
  const filterKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(() => menuPlanApi.list(filters), [filterKey]);
  return useFetchWithRefresh(fn, ['menu-plans', 'all']);
};

// --- Single Menu Plan ---
export const useMenuPlan = (id) => {
  const fn = useCallback(() => menuPlanApi.get(id), [id]);
  return useFetchWithRefresh(fn, ['menu-plans', 'plan-' + id, 'all'], { enabled: !!id });
};

// --- Recipe Lookup ---
export const useRecipeLookup = (filters = {}) => {
  const filterKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(() => recipePickerApi.lookup(filters), [filterKey]);
  return useFetchWithRefresh(fn, ['recipes', 'all']);
};

// --- Create Menu Plan ---
export const useCreateMenuPlan = () =>
  useMutate(
    useCallback((data) => menuPlanApi.create(data), []),
    {
      onSuccess: () => { emitRefresh('menu-plans'); toast.success('Menu plan created successfully'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Update Menu Plan ---
export const useUpdateMenuPlan = () =>
  useMutate(
    useCallback(({ id, data }) => menuPlanApi.update(id, data), []),
    {
      onSuccess: () => { emitRefresh('menu-plans'); emitRefresh('all'); toast.success('Menu plan updated'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Delete Menu Plan ---
export const useDeleteMenuPlan = () =>
  useMutate(
    useCallback((id) => menuPlanApi.delete(id), []),
    {
      onSuccess: () => { emitRefresh('menu-plans'); toast.success('Menu plan deleted'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Add Item ---
export const useAddMenuPlanItem = (menuPlanId) =>
  useMutate(
    useCallback((data) => menuPlanApi.addItem(menuPlanId, data), [menuPlanId]),
    {
      onSuccess: () => { emitRefresh('plan-' + menuPlanId); toast.success('Recipe added to menu plan'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Remove Item ---
export const useRemoveMenuPlanItem = (menuPlanId) =>
  useMutate(
    useCallback((itemId) => menuPlanApi.removeItem(menuPlanId, itemId), [menuPlanId]),
    {
      onSuccess: () => { emitRefresh('plan-' + menuPlanId); toast.success('Recipe removed'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Update Item ---
export const useUpdateMenuPlanItem = (menuPlanId) =>
  useMutate(
    useCallback(({ itemId, data }) => menuPlanApi.updateItem(menuPlanId, itemId, data), [menuPlanId]),
    {
      onSuccess: () => { emitRefresh('menu-plans'); emitRefresh('all'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Calendar / Weekly Query ---
export const useWeekMenuPlans = (planDateFrom, planDateTo, warehouseId) => {
  const fn = useCallback(
    () => menuPlanApi.list({ planDateFrom, planDateTo, warehouseId, limit: 200 }),
    [planDateFrom, planDateTo, warehouseId]
  );
  return useFetchWithRefresh(fn, ['menu-plans', 'all'], { enabled: !!planDateFrom && !!planDateTo });
};

// --- Drop On Slot ---
export const useDropOnSlot = () =>
  useMutate(
    useCallback((data) => menuPlanApi.dropOnSlot(data), []),
    {
      onSuccess: () => { emitRefresh('menu-plans'); emitRefresh('all'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Move Item ---
export const useMoveItem = () =>
  useMutate(
    useCallback((data) => menuPlanApi.moveItem(data), []),
    {
      onSuccess: () => { emitRefresh('menu-plans'); emitRefresh('all'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Delete Menu Plan Item (standalone) ---
export const useDeleteMenuPlanItem = (menuPlanId) =>
  useMutate(
    useCallback((itemId) => menuPlanApi.removeItem(menuPlanId, itemId), [menuPlanId]),
    {
      onSuccess: () => { emitRefresh('menu-plans'); emitRefresh('all'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Menu Report ---
export const useMenuReport = (dateFrom, dateTo, enabled = false) => {
  const fn = useCallback(() => menuPlanApi.getReport({ dateFrom, dateTo }), [dateFrom, dateTo]);
  return useFetchWithRefresh(fn, ['menu-plans'], { enabled: enabled && !!dateFrom && !!dateTo });
};

// --- Clear Range ---
export const useClearRange = () =>
  useMutate(
    useCallback((data) => menuPlanApi.clearRange(data), []),
    {
      onSuccess: (data) => { emitRefresh('menu-plans'); emitRefresh('all'); toast.success(data?.message || 'Plans cleared'); },
      onError: (err) => toast.error(err.message),
    }
  );

// --- Duplicate Week ---
export const useDuplicateWeek = () =>
  useMutate(
    useCallback((data) => menuPlanApi.duplicateWeek(data), []),
    {
      onSuccess: (data) => { emitRefresh('menu-plans'); emitRefresh('all'); toast.success(data?.message || 'Week duplicated'); },
      onError: (err) => toast.error(err.message),
    }
  );
