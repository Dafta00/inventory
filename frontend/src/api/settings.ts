import { apiClient } from '@/lib/api-client';

export const settingsApi = {
  getAll: () => apiClient.get<Record<string, unknown>>('/settings').then((r) => r.data),
  upsert: (key: string, value: unknown) => apiClient.put('/settings', { key, value }).then((r) => r.data),
};
