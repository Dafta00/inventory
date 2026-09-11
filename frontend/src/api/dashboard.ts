import { apiClient } from '@/lib/api-client';

export const dashboardApi = {
  summary: () => apiClient.get('/dashboard/summary').then((r) => r.data),
  salesOverTime: (days = 30) => apiClient.get('/dashboard/sales-over-time', { params: { days } }).then((r) => r.data),
  purchasesOverTime: (days = 30) => apiClient.get('/dashboard/purchases-over-time', { params: { days } }).then((r) => r.data),
  revenueVsExpenses: (months = 6) => apiClient.get('/dashboard/revenue-vs-expenses', { params: { months } }).then((r) => r.data),
  topProducts: (days = 30, limit = 10) =>
    apiClient.get('/dashboard/top-products', { params: { days, limit } }).then((r) => r.data),
  inventoryByCategory: () => apiClient.get('/dashboard/inventory-by-category').then((r) => r.data),
  stockMovementTrends: (days = 30) =>
    apiClient.get('/dashboard/stock-movement-trends', { params: { days } }).then((r) => r.data),
  recentActivity: () => apiClient.get('/dashboard/recent-activity').then((r) => r.data),
};
