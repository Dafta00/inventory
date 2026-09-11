import {
  LayoutDashboard,
  Package,
  Tags,
  Award,
  Boxes,
  ArrowLeftRight,
  Warehouse,
  Truck,
  ClipboardList,
  ShoppingCart,
  Undo2,
  Users2,
  Receipt,
  RotateCcw,
  Wallet,
  TrendingUp,
  UserCog,
  ShieldCheck,
  History,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { PERMISSIONS } from '@/lib/permissions';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  permission?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: '',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW }],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', to: '/products', icon: Package, permission: PERMISSIONS.PRODUCTS_VIEW },
      { label: 'Categories', to: '/categories', icon: Tags, permission: PERMISSIONS.PRODUCTS_VIEW },
      { label: 'Brands', to: '/brands', icon: Award, permission: PERMISSIONS.PRODUCTS_VIEW },
      { label: 'Stock', to: '/inventory/stock', icon: Boxes, permission: PERMISSIONS.INVENTORY_VIEW },
      { label: 'Stock Movements', to: '/inventory/movements', icon: ArrowLeftRight, permission: PERMISSIONS.INVENTORY_VIEW },
      { label: 'Warehouses', to: '/warehouses', icon: Warehouse, permission: PERMISSIONS.INVENTORY_VIEW },
    ],
  },
  {
    label: 'Purchasing',
    items: [
      { label: 'Suppliers', to: '/suppliers', icon: Truck, permission: PERMISSIONS.SUPPLIERS_VIEW },
      { label: 'Purchase Orders', to: '/purchase-orders', icon: ClipboardList, permission: PERMISSIONS.PURCHASES_VIEW },
      { label: 'Purchases', to: '/purchases', icon: ShoppingCart, permission: PERMISSIONS.PURCHASES_VIEW },
      { label: 'Purchase Returns', to: '/purchase-returns', icon: Undo2, permission: PERMISSIONS.PURCHASES_VIEW },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Customers', to: '/customers', icon: Users2, permission: PERMISSIONS.CUSTOMERS_VIEW },
      { label: 'Sales', to: '/sales', icon: Receipt, permission: PERMISSIONS.SALES_VIEW },
      { label: 'Sales Returns', to: '/sales-returns', icon: RotateCcw, permission: PERMISSIONS.SALES_VIEW },
    ],
  },
  {
    label: 'Finance',
    items: [{ label: 'Expenses', to: '/expenses', icon: Wallet, permission: PERMISSIONS.FINANCE_VIEW }],
  },
  {
    label: 'Reports',
    items: [{ label: 'Reports', to: '/reports', icon: TrendingUp, permission: PERMISSIONS.REPORTS_VIEW }],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', to: '/admin/users', icon: UserCog, permission: PERMISSIONS.USERS_MANAGE },
      { label: 'Roles & Permissions', to: '/admin/roles', icon: ShieldCheck, permission: PERMISSIONS.ROLES_MANAGE },
      { label: 'Audit Logs', to: '/admin/audit-logs', icon: History, permission: PERMISSIONS.AUDIT_LOGS_VIEW },
      { label: 'Settings', to: '/admin/settings', icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE },
    ],
  },
];
