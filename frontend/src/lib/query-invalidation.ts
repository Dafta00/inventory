import type { QueryClient } from '@tanstack/react-query';

/**
 * Call after ANY mutation that changes stock quantities (sales, purchases,
 * receiving, transfers, adjustments, returns) or a product's stock-bearing
 * fields. Product totals, warehouse valuation, and the dashboard summary all
 * derive from the same inventory rows, so a narrow invalidation (e.g. only
 * ['sales']) leaves those views showing stale numbers until the query's
 * staleTime window lapses.
 */
export function invalidateInventoryRelated(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['inventory'] });
  queryClient.invalidateQueries({ queryKey: ['products'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['warehouses'] });
}
