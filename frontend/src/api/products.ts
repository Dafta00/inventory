import { apiClient } from '@/lib/api-client';
import type { Paginated, Product } from './types';

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  lowStockOnly?: boolean;
}

export const productsApi = {
  list: (params: ProductQuery) => apiClient.get<Paginated<Product>>('/products', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Product>(`/products/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post<Product>('/products', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch<Product>(`/products/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/products/${id}`).then((r) => r.data),
  bulkArchive: (ids: string[]) => apiClient.post('/products/bulk-archive', { ids }).then((r) => r.data),
};
