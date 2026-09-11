import { apiClient } from '@/lib/api-client';

export interface ReportFilters {
  from?: string;
  to?: string;
  warehouseId?: string;
  categoryId?: string;
  productId?: string;
  supplierId?: string;
  customerId?: string;
}

export const reportsApi = {
  inventory: (filters: ReportFilters) => apiClient.get('/reports/inventory', { params: filters }).then((r) => r.data),
  sales: (filters: ReportFilters) => apiClient.get('/reports/sales', { params: filters }).then((r) => r.data),
  purchases: (filters: ReportFilters) => apiClient.get('/reports/purchases', { params: filters }).then((r) => r.data),
  profitLoss: (filters: ReportFilters) => apiClient.get('/reports/profit-loss', { params: filters }).then((r) => r.data),
  stockValuation: (filters: ReportFilters) => apiClient.get('/reports/stock-valuation', { params: filters }).then((r) => r.data),

  async downloadCsv(report: string, filters: ReportFilters) {
    const response = await apiClient.get(`/reports/${report}`, {
      params: { ...filters, format: 'csv' },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
