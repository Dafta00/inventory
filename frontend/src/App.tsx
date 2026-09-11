import { Routes, Route } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth, RequirePermission } from '@/components/protected-route';
import { PERMISSIONS } from '@/lib/permissions';

import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { ChangePasswordPage } from '@/pages/auth/ChangePasswordPage';

import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { CategoriesPage } from '@/pages/categories/CategoriesPage';
import { BrandsPage } from '@/pages/brands/BrandsPage';
import { StockPage } from '@/pages/inventory/StockPage';
import { MovementsPage } from '@/pages/inventory/MovementsPage';
import { WarehousesPage } from '@/pages/warehouses/WarehousesPage';
import { WarehouseDetailPage } from '@/pages/warehouses/WarehouseDetailPage';
import { SuppliersPage } from '@/pages/suppliers/SuppliersPage';
import { SupplierDetailPage } from '@/pages/suppliers/SupplierDetailPage';
import { CustomersPage } from '@/pages/customers/CustomersPage';
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage';
import { PurchaseOrdersPage } from '@/pages/purchasing/PurchaseOrdersPage';
import { PurchaseOrderNewPage } from '@/pages/purchasing/PurchaseOrderNewPage';
import { PurchaseOrderDetailPage } from '@/pages/purchasing/PurchaseOrderDetailPage';
import { PurchasesPage } from '@/pages/purchasing/PurchasesPage';
import { PurchaseDetailPage } from '@/pages/purchasing/PurchaseDetailPage';
import { PurchaseReturnsPage } from '@/pages/purchasing/PurchaseReturnsPage';
import { SalesPage } from '@/pages/sales/SalesPage';
import { SaleNewPage } from '@/pages/sales/SaleNewPage';
import { SaleDetailPage } from '@/pages/sales/SaleDetailPage';
import { SalesReturnsPage } from '@/pages/sales/SalesReturnsPage';
import { ExpensesPage } from '@/pages/finance/ExpensesPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { RolesPage } from '@/pages/admin/RolesPage';
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function Protected({ permission, children }: { permission: string; children: React.ReactNode }) {
  return (
    <RequireAuth>
      <RequirePermission permission={permission}>{children}</RequirePermission>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Protected permission={PERMISSIONS.DASHBOARD_VIEW}><DashboardPage /></Protected>} />
        <Route path="/account/change-password" element={<ChangePasswordPage />} />

        <Route path="/products" element={<Protected permission={PERMISSIONS.PRODUCTS_VIEW}><ProductsPage /></Protected>} />
        <Route path="/categories" element={<Protected permission={PERMISSIONS.PRODUCTS_VIEW}><CategoriesPage /></Protected>} />
        <Route path="/brands" element={<Protected permission={PERMISSIONS.PRODUCTS_VIEW}><BrandsPage /></Protected>} />

        <Route path="/inventory/stock" element={<Protected permission={PERMISSIONS.INVENTORY_VIEW}><StockPage /></Protected>} />
        <Route path="/inventory/movements" element={<Protected permission={PERMISSIONS.INVENTORY_VIEW}><MovementsPage /></Protected>} />
        <Route path="/warehouses" element={<Protected permission={PERMISSIONS.INVENTORY_VIEW}><WarehousesPage /></Protected>} />
        <Route path="/warehouses/:id" element={<Protected permission={PERMISSIONS.INVENTORY_VIEW}><WarehouseDetailPage /></Protected>} />

        <Route path="/suppliers" element={<Protected permission={PERMISSIONS.SUPPLIERS_VIEW}><SuppliersPage /></Protected>} />
        <Route path="/suppliers/:id" element={<Protected permission={PERMISSIONS.SUPPLIERS_VIEW}><SupplierDetailPage /></Protected>} />

        <Route path="/customers" element={<Protected permission={PERMISSIONS.CUSTOMERS_VIEW}><CustomersPage /></Protected>} />
        <Route path="/customers/:id" element={<Protected permission={PERMISSIONS.CUSTOMERS_VIEW}><CustomerDetailPage /></Protected>} />

        <Route path="/purchase-orders" element={<Protected permission={PERMISSIONS.PURCHASES_VIEW}><PurchaseOrdersPage /></Protected>} />
        <Route path="/purchase-orders/new" element={<Protected permission={PERMISSIONS.PURCHASES_CREATE}><PurchaseOrderNewPage /></Protected>} />
        <Route path="/purchase-orders/:id" element={<Protected permission={PERMISSIONS.PURCHASES_VIEW}><PurchaseOrderDetailPage /></Protected>} />
        <Route path="/purchases" element={<Protected permission={PERMISSIONS.PURCHASES_VIEW}><PurchasesPage /></Protected>} />
        <Route path="/purchases/:id" element={<Protected permission={PERMISSIONS.PURCHASES_VIEW}><PurchaseDetailPage /></Protected>} />
        <Route path="/purchase-returns" element={<Protected permission={PERMISSIONS.PURCHASES_VIEW}><PurchaseReturnsPage /></Protected>} />

        <Route path="/sales" element={<Protected permission={PERMISSIONS.SALES_VIEW}><SalesPage /></Protected>} />
        <Route path="/sales/new" element={<Protected permission={PERMISSIONS.SALES_CREATE}><SaleNewPage /></Protected>} />
        <Route path="/sales/:id" element={<Protected permission={PERMISSIONS.SALES_VIEW}><SaleDetailPage /></Protected>} />
        <Route path="/sales-returns" element={<Protected permission={PERMISSIONS.SALES_VIEW}><SalesReturnsPage /></Protected>} />

        <Route path="/expenses" element={<Protected permission={PERMISSIONS.FINANCE_VIEW}><ExpensesPage /></Protected>} />
        <Route path="/reports" element={<Protected permission={PERMISSIONS.REPORTS_VIEW}><ReportsPage /></Protected>} />

        <Route path="/admin/users" element={<Protected permission={PERMISSIONS.USERS_MANAGE}><UsersPage /></Protected>} />
        <Route path="/admin/roles" element={<Protected permission={PERMISSIONS.ROLES_MANAGE}><RolesPage /></Protected>} />
        <Route path="/admin/audit-logs" element={<Protected permission={PERMISSIONS.AUDIT_LOGS_VIEW}><AuditLogsPage /></Protected>} />
        <Route path="/admin/settings" element={<Protected permission={PERMISSIONS.SETTINGS_MANAGE}><SettingsPage /></Protected>} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
