import { apiClient } from '@/lib/api-client';
import type { Brand } from './types';

export const brandsApi = {
  list: (search?: string) => apiClient.get<Brand[]>('/brands', { params: { search } }).then((r) => r.data),
  get: (id: string) => apiClient.get<Brand>(`/brands/${id}`).then((r) => r.data),
  create: (data: { name: string; description?: string }) => apiClient.post<Brand>('/brands', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; description: string; isActive: boolean }>) =>
    apiClient.patch<Brand>(`/brands/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/brands/${id}`).then((r) => r.data),
};
