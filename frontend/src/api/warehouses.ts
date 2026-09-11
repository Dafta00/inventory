import { apiClient } from '@/lib/api-client';
import type { Warehouse } from './types';

export const warehousesApi = {
  list: () => apiClient.get<Warehouse[]>('/warehouses').then((r) => r.data),
  get: (id: string) => apiClient.get(`/warehouses/${id}`).then((r) => r.data),
  inventory: (id: string) => apiClient.get(`/warehouses/${id}/inventory`).then((r) => r.data),
  valuation: (id: string) => apiClient.get(`/warehouses/${id}/valuation`).then((r) => r.data),
  create: (data: Partial<Warehouse>) => apiClient.post<Warehouse>('/warehouses', data).then((r) => r.data),
  update: (id: string, data: Partial<Warehouse>) => apiClient.patch<Warehouse>(`/warehouses/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/warehouses/${id}`).then((r) => r.data),
};
