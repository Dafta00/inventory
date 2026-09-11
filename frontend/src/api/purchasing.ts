import { apiClient } from '@/lib/api-client';
import type { Paginated } from './types';

export const purchaseOrdersApi = {
  list: (params: { page?: number; pageSize?: number; status?: string; supplierId?: string }) =>
    apiClient.get<Paginated<any>>('/purchase-orders', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/purchase-orders/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post('/purchase-orders', data).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    apiClient.patch(`/purchase-orders/${id}/status`, { status }).then((r) => r.data),
  receive: (id: string, data: { items: { productId: string; quantityReceived: number }[]; notes?: string }) =>
    apiClient.post(`/purchase-orders/${id}/receive`, data).then((r) => r.data),
};

export const purchasesApi = {
  list: (params: { page?: number; pageSize?: number; supplierId?: string; warehouseId?: string }) =>
    apiClient.get<Paginated<any>>('/purchases', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/purchases/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post('/purchases', data).then((r) => r.data),
};

export const purchaseReturnsApi = {
  list: (params: { page?: number; pageSize?: number }) =>
    apiClient.get<Paginated<any>>('/purchase-returns', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/purchase-returns/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post('/purchase-returns', data).then((r) => r.data),
};
