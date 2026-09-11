import { apiClient } from '@/lib/api-client';
import type { Paginated, Supplier } from './types';

export const suppliersApi = {
  list: (params: { page?: number; pageSize?: number; search?: string }) =>
    apiClient.get<Paginated<Supplier>>('/suppliers', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/suppliers/${id}`).then((r) => r.data),
  create: (data: Partial<Supplier>) => apiClient.post<Supplier>('/suppliers', data).then((r) => r.data),
  update: (id: string, data: Partial<Supplier>) => apiClient.patch<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/suppliers/${id}`).then((r) => r.data),
};
