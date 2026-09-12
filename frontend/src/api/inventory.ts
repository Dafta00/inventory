import { apiClient } from '@/lib/api-client';
import type { InventoryRow, Paginated, StockAlertsResponse, StockMovement } from './types';

export const inventoryApi = {
  stock: (params: { productId?: string; warehouseId?: string; lowStockOnly?: boolean }) =>
    apiClient.get<InventoryRow[]>('/inventory/stock', { params }).then((r) => r.data),
  movements: (params: { page?: number; pageSize?: number; productId?: string; warehouseId?: string; type?: string }) =>
    apiClient.get<Paginated<StockMovement>>('/inventory/movements', { params }).then((r) => r.data),
  alerts: () => apiClient.get<StockAlertsResponse>('/inventory/alerts').then((r) => r.data),
  adjust: (data: { productId: string; warehouseId: string; quantityDelta: number; type: string; reason?: string }) =>
    apiClient.post('/inventory/adjust', data).then((r) => r.data),
  transfer: (data: { productId: string; fromWarehouseId: string; toWarehouseId: string; quantity: number; notes?: string }) =>
    apiClient.post('/inventory/transfer', data).then((r) => r.data),
};
