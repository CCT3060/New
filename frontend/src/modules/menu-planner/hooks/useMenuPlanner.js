import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuPlanApi, recipePickerApi } from '../services/menu-planner.api';
import { toast } from 'react-toastify';

export const MENU_PLAN_KEYS = {
  all: ['menu-plans'],
  list: (filters) => ['menu-plans', 'list', filters],
  detail: (id) => ['menu-plans', 'detail', id],
  recipeLookup: (filters) => ['recipes', 'lookup', filters],
};

export const useMenuPlans = (filters = {}) =>
  useQuery({
    queryKey: MENU_PLAN_KEYS.list(filters),
    queryFn: () => menuPlanApi.list(filters),
    keepPreviousData: true,
  });

export const useMenuPlan = (id) =>
  useQuery({
    queryKey: MENU_PLAN_KEYS.detail(id),
    queryFn: () => menuPlanApi.get(id),
    enabled: !!id,
  });

export const useRecipeLookup = (filters = {}) =>
  useQuery({
    queryKey: MENU_PLAN_KEYS.recipeLookup(filters),
    queryFn: () => recipePickerApi.lookup(filters),
    keepPreviousData: true,
  });

export const useCreateMenuPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => menuPlanApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_PLAN_KEYS.all });
      toast.success('Menu plan created successfully');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateMenuPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => menuPlanApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: MENU_PLAN_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MENU_PLAN_KEYS.detail(id) });
      toast.success('Menu plan updated');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useDeleteMenuPlan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => menuPlanApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_PLAN_KEYS.all });
      toast.success('Menu plan deleted');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useAddMenuPlanItem = (menuPlanId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => menuPlanApi.addItem(menuPlanId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_PLAN_KEYS.detail(menuPlanId) });
      toast.success('Recipe added to menu plan');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useRemoveMenuPlanItem = (menuPlanId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId) => menuPlanApi.removeItem(menuPlanId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_PLAN_KEYS.detail(menuPlanId) });
      toast.success('Recipe removed');
    },
    onError: (err) => toast.error(err.message),
  });
};

export const useUpdateMenuPlanItem = (menuPlanId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }) => menuPlanApi.updateItem(menuPlanId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_PLAN_KEYS.detail(menuPlanId) });
    },
    onError: (err) => toast.error(err.message),
  });
};
