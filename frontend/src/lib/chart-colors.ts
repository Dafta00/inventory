// Chart palette for StockFlow — see DESIGN_SYSTEM.md. No purple/pink; revenue/positive metrics
// always map to emerald, expenses/neutral to slate, alerts reserved for rose.
export const CHART_COLORS = {
  revenue: '#059669',
  expenses: '#94A3B8',
  profit: '#1E293B',
  categorical: ['#059669', '#2563EB', '#D97706', '#94A3B8', '#0E7490', '#E11D48'],
  grid: '#E2E8F0',
  axis: '#64748B',
} as const;
