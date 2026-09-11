import { apiClient } from '@/lib/api-client';
import type { Paginated } from './types';

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
  date: string;
  notes?: string | null;
}

export const expensesApi = {
  list: (params: { page?: number; pageSize?: number; from?: string; to?: string; category?: string }) =>
    apiClient.get<Paginated<Expense>>('/expenses', { params }).then((r) => r.data),
  create: (data: { category: string; description: string; amount: number; date?: string; notes?: string }) =>
    apiClient.post<Expense>('/expenses', data).then((r) => r.data),
  update: (id: string, data: Partial<{ category: string; description: string; amount: number; date: string; notes: string }>) =>
    apiClient.patch<Expense>(`/expenses/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/expenses/${id}`).then((r) => r.data),
};
