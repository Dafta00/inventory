/**
 * Canonical permission keys. Seeded into the `permissions` table and
 * assigned to roles via `role_permissions`. Enforced server-side by
 * PermissionsGuard - frontend route guards are UX only, never the
 * source of truth.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',

  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  CATEGORIES_MANAGE: 'categories.manage',
  BRANDS_MANAGE: 'brands.manage',

  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',

  WAREHOUSES_MANAGE: 'warehouses.manage',

  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_MANAGE: 'suppliers.manage',

  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_MANAGE: 'customers.manage',

  PURCHASES_VIEW: 'purchases.view',
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_RECEIVE: 'purchases.receive',
  PURCHASES_RETURN: 'purchases.return',

  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_REFUND: 'sales.refund',

  FINANCE_VIEW: 'finance.view',
  FINANCE_MANAGE: 'finance.manage',

  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  AUDIT_LOGS_VIEW: 'audit_logs.view',
  SETTINGS_MANAGE: 'settings.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: { key: string; module: string; description: string }[] = [
  { key: PERMISSIONS.DASHBOARD_VIEW, module: 'dashboard', description: 'View dashboard analytics' },

  { key: PERMISSIONS.PRODUCTS_VIEW, module: 'products', description: 'View products' },
  { key: PERMISSIONS.PRODUCTS_CREATE, module: 'products', description: 'Create products' },
  { key: PERMISSIONS.PRODUCTS_UPDATE, module: 'products', description: 'Update products' },
  { key: PERMISSIONS.PRODUCTS_DELETE, module: 'products', description: 'Archive/delete products' },

  { key: PERMISSIONS.CATEGORIES_MANAGE, module: 'categories', description: 'Manage categories' },
  { key: PERMISSIONS.BRANDS_MANAGE, module: 'brands', description: 'Manage brands' },

  { key: PERMISSIONS.INVENTORY_VIEW, module: 'inventory', description: 'View stock and movements' },
  { key: PERMISSIONS.INVENTORY_ADJUST, module: 'inventory', description: 'Adjust stock levels' },
  {
    key: PERMISSIONS.INVENTORY_TRANSFER,
    module: 'inventory',
    description: 'Transfer stock between warehouses',
  },

  { key: PERMISSIONS.WAREHOUSES_MANAGE, module: 'warehouses', description: 'Manage warehouses' },

  { key: PERMISSIONS.SUPPLIERS_VIEW, module: 'suppliers', description: 'View suppliers' },
  { key: PERMISSIONS.SUPPLIERS_MANAGE, module: 'suppliers', description: 'Manage suppliers' },

  { key: PERMISSIONS.CUSTOMERS_VIEW, module: 'customers', description: 'View customers' },
  { key: PERMISSIONS.CUSTOMERS_MANAGE, module: 'customers', description: 'Manage customers' },

  { key: PERMISSIONS.PURCHASES_VIEW, module: 'purchases', description: 'View purchase orders and purchases' },
  {
    key: PERMISSIONS.PURCHASES_CREATE,
    module: 'purchases',
    description: 'Create purchase orders and purchases',
  },
  {
    key: PERMISSIONS.PURCHASES_RECEIVE,
    module: 'purchases',
    description: 'Receive purchase orders into stock',
  },
  { key: PERMISSIONS.PURCHASES_RETURN, module: 'purchases', description: 'Process purchase returns' },

  { key: PERMISSIONS.SALES_VIEW, module: 'sales', description: 'View sales' },
  { key: PERMISSIONS.SALES_CREATE, module: 'sales', description: 'Create sales' },
  { key: PERMISSIONS.SALES_REFUND, module: 'sales', description: 'Process sales returns/refunds' },

  { key: PERMISSIONS.FINANCE_VIEW, module: 'finance', description: 'View expenses and revenue' },
  { key: PERMISSIONS.FINANCE_MANAGE, module: 'finance', description: 'Manage expenses' },

  { key: PERMISSIONS.REPORTS_VIEW, module: 'reports', description: 'View reports' },
  { key: PERMISSIONS.REPORTS_EXPORT, module: 'reports', description: 'Export reports' },

  { key: PERMISSIONS.USERS_MANAGE, module: 'administration', description: 'Manage users' },
  { key: PERMISSIONS.ROLES_MANAGE, module: 'administration', description: 'Manage roles and permissions' },
  { key: PERMISSIONS.AUDIT_LOGS_VIEW, module: 'administration', description: 'View audit logs' },
  { key: PERMISSIONS.SETTINGS_MANAGE, module: 'administration', description: 'Manage system settings' },
];

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMINISTRATOR: 'Administrator',
  MANAGER: 'Manager',
  INVENTORY_OFFICER: 'Inventory Officer',
  SALES_STAFF: 'Sales Staff',
  PURCHASING_OFFICER: 'Purchasing Officer',
  ACCOUNTANT: 'Accountant',
} as const;
