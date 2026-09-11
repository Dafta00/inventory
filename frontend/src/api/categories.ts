import { apiClient } from '@/lib/api-client';
import type { Category } from './types';

export const categoriesApi = {
  list: (search?: string) => apiClient.get<Category[]>('/categories', { params: { search } }).then((r) => r.data),
  get: (id: string) => apiClient.get<Category>(`/categories/${id}`).then((r) => r.data),
  create: (data: { name: string; description?: string; parentId?: string }) =>
    apiClient.post<Category>('/categories', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; description: string; parentId: string; isActive: boolean }>) =>
    apiClient.patch<Category>(`/categories/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/categories/${id}`).then((r) => r.data),
};
