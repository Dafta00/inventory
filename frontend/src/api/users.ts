import { apiClient } from '@/lib/api-client';
import type { AppUser, Paginated } from './types';

export const usersApi = {
  list: (params: { page?: number; pageSize?: number; search?: string }) =>
    apiClient.get<Paginated<AppUser>>('/users', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<AppUser>(`/users/${id}`).then((r) => r.data),
  create: (data: { name: string; email: string; phone?: string; password: string; roleId: string }) =>
    apiClient.post<AppUser>('/users', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; email: string; phone: string; roleId: string; status: string }>) =>
    apiClient.patch<AppUser>(`/users/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/users/${id}`).then((r) => r.data),
  resetPassword: (id: string, newPassword: string) =>
    apiClient.post(`/users/${id}/reset-password`, { newPassword }).then((r) => r.data),
};
