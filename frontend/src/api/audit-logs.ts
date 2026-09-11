import { apiClient } from '@/lib/api-client';

export const auditLogsApi = {
  list: (params: { page?: number; pageSize?: number; entity?: string; action?: string; from?: string; to?: string }) =>
    apiClient.get('/audit-logs', { params }).then((r) => r.data),
};
