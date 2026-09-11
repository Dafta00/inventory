import { apiClient } from '@/lib/api-client';
import type { Permission, Role } from './types';

export const rolesApi = {
  list: () => apiClient.get<Role[]>('/roles').then((r) => r.data),
  get: (id: string) => apiClient.get<Role>(`/roles/${id}`).then((r) => r.data),
  listPermissions: () => apiClient.get<Permission[]>('/roles/permissions').then((r) => r.data),
  create: (data: { name: string; description?: string; permissionKeys?: string[] }) =>
    apiClient.post<Role>('/roles', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; description: string }>) =>
    apiClient.patch<Role>(`/roles/${id}`, data).then((r) => r.data),
  setPermissions: (id: string, permissionKeys: string[]) =>
    apiClient.patch<Role>(`/roles/${id}/permissions`, { permissionKeys }).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/roles/${id}`).then((r) => r.data),
};
