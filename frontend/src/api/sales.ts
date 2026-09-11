import { apiClient } from '@/lib/api-client';
import type { Paginated } from './types';

export const salesApi = {
  list: (params: { page?: number; pageSize?: number; warehouseId?: string; customerId?: string; from?: string; to?: string }) =>
    apiClient.get<Paginated<any>>('/sales', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/sales/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post('/sales', data).then((r) => r.data),
};

export const salesReturnsApi = {
  list: (params: { page?: number; pageSize?: number }) =>
    apiClient.get<Paginated<any>>('/sales-returns', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/sales-returns/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post('/sales-returns', data).then((r) => r.data),
};
