import { apiClient } from '@/lib/api-client';
import type { Customer, Paginated } from './types';

export interface CustomerPayload {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  type?: 'RETAIL' | 'WHOLESALE' | 'CORPORATE';
  creditLimit?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const customersApi = {
  list: (params: { page?: number; pageSize?: number; search?: string }) =>
    apiClient.get<Paginated<Customer>>('/customers', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get(`/customers/${id}`).then((r) => r.data),
  create: (data: CustomerPayload) => apiClient.post<Customer>('/customers', data).then((r) => r.data),
  update: (id: string, data: Partial<CustomerPayload>) => apiClient.patch<Customer>(`/customers/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/customers/${id}`).then((r) => r.data),
};
