export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  isActive: boolean;
  productCount?: number;
  childCount?: number;
}

export interface Brand {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  productCount?: number;
}

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  brandId?: string | null;
  brand?: { id: string; name: string } | null;
  primarySupplierId?: string | null;
  costPrice: string;
  sellingPrice: string;
  discount: string;
  taxRate: string;
  unit: string;
  minStockLevel: number;
  reorderLevel: number;
  maxStockLevel?: number | null;
  imageUrl?: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  totalStock?: number;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  managerId?: string | null;
  manager?: { id: string; name: string; email: string } | null;
  phone?: string | null;
  email?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Supplier {
  id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxId?: string | null;
  contactPerson?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Customer {
  id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  type: 'RETAIL' | 'WHOLESALE' | 'CORPORATE';
  creditLimit: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface InventoryRow {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reserved: number;
  product: { id: string; name: string; sku: string; unit: string; minStockLevel: number; reorderLevel: number; costPrice: string; sellingPrice: string };
  warehouse: { id: string; name: string; code: string };
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface StockAlertItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reserved: number;
  product: { id: string; name: string; sku: string; unit: string; reorderLevel: number };
  warehouse: { id: string; name: string; code: string };
}

export interface StockAlertsResponse {
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: StockAlertItem[];
  outOfStockItems: StockAlertItem[];
}

export interface StockMovement {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string };
  warehouseId: string;
  warehouse: { id: string; name: string; code: string };
  transferTo?: { id: string; name: string; code: string } | null;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reference?: string | null;
  reason?: string | null;
  user: { id: string; name: string };
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  userCount?: number;
  permissions: string[];
}

export interface Permission {
  key: string;
  module: string;
  description: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  status: 'ACTIVE' | 'DISABLED';
  lastLoginAt?: string | null;
  createdAt: string;
  roleId: string;
  role: { id: string; name: string };
}
