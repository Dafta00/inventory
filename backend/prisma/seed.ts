import { PrismaClient, StockMovementType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  { key: 'dashboard.view', module: 'dashboard', description: 'View dashboard analytics' },
  { key: 'products.view', module: 'products', description: 'View products' },
  { key: 'products.create', module: 'products', description: 'Create products' },
  { key: 'products.update', module: 'products', description: 'Update products' },
  { key: 'products.delete', module: 'products', description: 'Archive/delete products' },
  { key: 'categories.manage', module: 'categories', description: 'Manage categories' },
  { key: 'brands.manage', module: 'brands', description: 'Manage brands' },
  { key: 'inventory.view', module: 'inventory', description: 'View stock and movements' },
  { key: 'inventory.adjust', module: 'inventory', description: 'Adjust stock levels' },
  { key: 'inventory.transfer', module: 'inventory', description: 'Transfer stock between warehouses' },
  { key: 'warehouses.manage', module: 'warehouses', description: 'Manage warehouses' },
  { key: 'suppliers.view', module: 'suppliers', description: 'View suppliers' },
  { key: 'suppliers.manage', module: 'suppliers', description: 'Manage suppliers' },
  { key: 'customers.view', module: 'customers', description: 'View customers' },
  { key: 'customers.manage', module: 'customers', description: 'Manage customers' },
  { key: 'purchases.view', module: 'purchases', description: 'View purchase orders and purchases' },
  { key: 'purchases.create', module: 'purchases', description: 'Create purchase orders and purchases' },
  { key: 'purchases.receive', module: 'purchases', description: 'Receive purchase orders into stock' },
  { key: 'purchases.return', module: 'purchases', description: 'Process purchase returns' },
  { key: 'sales.view', module: 'sales', description: 'View sales' },
  { key: 'sales.create', module: 'sales', description: 'Create sales' },
  { key: 'sales.refund', module: 'sales', description: 'Process sales returns/refunds' },
  { key: 'finance.view', module: 'finance', description: 'View expenses and revenue' },
  { key: 'finance.manage', module: 'finance', description: 'Manage expenses' },
  { key: 'reports.view', module: 'reports', description: 'View reports' },
  { key: 'reports.export', module: 'reports', description: 'Export reports' },
  { key: 'users.manage', module: 'administration', description: 'Manage users' },
  { key: 'roles.manage', module: 'administration', description: 'Manage roles and permissions' },
  { key: 'audit_logs.view', module: 'administration', description: 'View audit logs' },
  { key: 'settings.manage', module: 'administration', description: 'Manage system settings' },
];

const ROLE_DEFINITIONS: { name: string; description: string; permissions: string[] }[] = [
  {
    name: 'Super Admin',
    description: 'Unrestricted access to every module',
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  },
  {
    name: 'Administrator',
    description: 'Most administrative functions except role/permission changes',
    permissions: ALL_PERMISSIONS.filter((p) => p.key !== 'roles.manage').map((p) => p.key),
  },
  {
    name: 'Manager',
    description: 'Inventory, purchases, sales, and reports oversight',
    permissions: [
      'dashboard.view', 'products.view', 'products.create', 'products.update',
      'categories.manage', 'brands.manage',
      'inventory.view', 'inventory.adjust', 'inventory.transfer', 'warehouses.manage',
      'suppliers.view', 'suppliers.manage', 'customers.view', 'customers.manage',
      'purchases.view', 'purchases.create', 'purchases.receive', 'purchases.return',
      'sales.view', 'sales.create', 'sales.refund',
      'finance.view', 'reports.view', 'reports.export',
    ],
  },
  {
    name: 'Inventory Officer',
    description: 'Products, stock, and stock movements',
    permissions: [
      'dashboard.view', 'products.view', 'products.create', 'products.update',
      'categories.manage', 'brands.manage',
      'inventory.view', 'inventory.adjust', 'inventory.transfer', 'warehouses.manage',
      'reports.view',
    ],
  },
  {
    name: 'Sales Staff',
    description: 'Customers, sales, and invoices',
    permissions: [
      'dashboard.view', 'products.view', 'inventory.view',
      'customers.view', 'customers.manage',
      'sales.view', 'sales.create', 'sales.refund',
    ],
  },
  {
    name: 'Purchasing Officer',
    description: 'Suppliers and purchasing',
    permissions: [
      'dashboard.view', 'products.view', 'inventory.view',
      'suppliers.view', 'suppliers.manage',
      'purchases.view', 'purchases.create', 'purchases.receive', 'purchases.return',
    ],
  },
  {
    name: 'Accountant',
    description: 'Finance and reporting',
    permissions: ['dashboard.view', 'finance.view', 'finance.manage', 'reports.view', 'reports.export'],
  },
];

async function main() {
  console.log('Seeding permissions...');
  for (const perm of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      create: perm,
      update: { module: perm.module, description: perm.description },
    });
  }

  console.log('Seeding roles...');
  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      create: { name: roleDef.name, description: roleDef.description, isSystem: true },
      update: { description: roleDef.description },
    });

    const permissions = await prisma.permission.findMany({ where: { key: { in: roleDef.permissions } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Super Admin' } });
  const salesRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Sales Staff' } });
  const purchasingRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Purchasing Officer' } });

  console.log('Seeding admin user...');
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@inventory.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: 'System Administrator',
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      roleId: superAdminRole.id,
    },
    update: {},
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@inventory.local' },
    create: {
      name: 'Sarah Sales',
      email: 'sales@inventory.local',
      passwordHash: await bcrypt.hash('Sales@12345', 12),
      roleId: salesRole.id,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: 'purchasing@inventory.local' },
    create: {
      name: 'Peter Purchasing',
      email: 'purchasing@inventory.local',
      passwordHash: await bcrypt.hash('Purchase@12345', 12),
      roleId: purchasingRole.id,
    },
    update: {},
  });

  console.log('Seeding warehouses...');
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    create: {
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      address: '123 Industrial Ave, Springfield',
      managerId: adminUser.id,
      phone: '+1-555-0100',
    },
    update: {},
  });
  const branchWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-BRANCH' },
    create: {
      name: 'Downtown Branch',
      code: 'WH-BRANCH',
      address: '456 Main Street, Springfield',
      phone: '+1-555-0200',
    },
    update: {},
  });

  console.log('Seeding categories & brands...');
  const categoryNames = ['Electronics', 'Groceries', 'Home & Kitchen', 'Stationery', 'Health & Beauty'];
  const categories: Awaited<ReturnType<typeof prisma.category.upsert>>[] = [];
  for (const name of categoryNames) {
    categories.push(
      await prisma.category.upsert({ where: { id: `seed-cat-${name}` }, create: { id: `seed-cat-${name}`, name }, update: {} }),
    );
  }

  const brandNames = ['Acme', 'Northwind', 'Globex', 'Initech', 'Umbrella'];
  const brands: Awaited<ReturnType<typeof prisma.brand.upsert>>[] = [];
  for (const name of brandNames) {
    brands.push(await prisma.brand.upsert({ where: { name }, create: { name }, update: {} }));
  }

  console.log('Seeding suppliers...');
  const supplier1 = await prisma.supplier.upsert({
    where: { id: 'seed-supplier-1' },
    create: {
      id: 'seed-supplier-1',
      name: 'Global Distributors Ltd',
      company: 'Global Distributors Ltd',
      email: 'contact@globaldist.example',
      phone: '+1-555-1000',
      contactPerson: 'James Carter',
      paymentTerms: 'Net 30',
    },
    update: {},
  });
  const supplier2 = await prisma.supplier.upsert({
    where: { id: 'seed-supplier-2' },
    create: {
      id: 'seed-supplier-2',
      name: 'Fresh Foods Co',
      company: 'Fresh Foods Co',
      email: 'orders@freshfoods.example',
      phone: '+1-555-2000',
      contactPerson: 'Maria Lopez',
      paymentTerms: 'Net 15',
    },
    update: {},
  });

  console.log('Seeding customers...');
  const customer1 = await prisma.customer.upsert({
    where: { id: 'seed-customer-1' },
    create: { id: 'seed-customer-1', name: 'John Doe', email: 'john.doe@example.com', phone: '+1-555-3000', type: 'RETAIL' },
    update: {},
  });
  const customer2 = await prisma.customer.upsert({
    where: { id: 'seed-customer-2' },
    create: {
      id: 'seed-customer-2',
      name: 'Acme Retail Group',
      company: 'Acme Retail Group',
      email: 'purchasing@acmeretail.example',
      phone: '+1-555-4000',
      type: 'WHOLESALE',
      creditLimit: 10000,
    },
    update: {},
  });

  console.log('Seeding products...');
  const productSeeds = [
    { name: 'Wireless Mouse', sku: 'ELEC-100001', cost: 8, price: 19.99, cat: 0, brand: 0, unit: 'pcs' },
    { name: 'USB-C Charging Cable', sku: 'ELEC-100002', cost: 3, price: 9.99, cat: 0, brand: 1, unit: 'pcs' },
    { name: 'Bluetooth Speaker', sku: 'ELEC-100003', cost: 22, price: 49.99, cat: 0, brand: 2, unit: 'pcs' },
    { name: 'Basmati Rice 5kg', sku: 'GROC-200001', cost: 6, price: 11.5, cat: 1, brand: 3, unit: 'bag' },
    { name: 'Extra Virgin Olive Oil 1L', sku: 'GROC-200002', cost: 5, price: 9.75, cat: 1, brand: 3, unit: 'bottle' },
    { name: 'Non-stick Frying Pan', sku: 'HOME-300001', cost: 10, price: 24.99, cat: 2, brand: 4, unit: 'pcs' },
    { name: 'Ceramic Mug Set (4pc)', sku: 'HOME-300002', cost: 7, price: 15.99, cat: 2, brand: 4, unit: 'set' },
    { name: 'A4 Notebook (Pack of 3)', sku: 'STAT-400001', cost: 2, price: 5.99, cat: 3, brand: 1, unit: 'pack' },
    { name: 'Gel Pens (Box of 12)', sku: 'STAT-400002', cost: 1.5, price: 4.5, cat: 3, brand: 1, unit: 'box' },
    { name: 'Hand Sanitizer 250ml', sku: 'HLTH-500001', cost: 1.2, price: 3.99, cat: 4, brand: 2, unit: 'bottle' },
  ];

  const products: Awaited<ReturnType<typeof prisma.product.upsert>>[] = [];
  for (const p of productSeeds) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      create: {
        sku: p.sku,
        name: p.name,
        costPrice: p.cost,
        sellingPrice: p.price,
        unit: p.unit,
        categoryId: categories[p.cat].id,
        brandId: brands[p.brand].id,
        primarySupplierId: p.cat === 1 ? supplier2.id : supplier1.id,
        minStockLevel: 5,
        reorderLevel: 15,
        maxStockLevel: 500,
      },
      update: {},
    });
    products.push(product);
  }

  console.log('Seeding initial stock...');
  for (const product of products) {
    const mainQty = 100 + Math.floor(Math.random() * 100);
    const branchQty = 20 + Math.floor(Math.random() * 40);

    const existingMain = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: mainWarehouse.id } },
    });
    if (!existingMain) {
      await prisma.inventory.create({ data: { productId: product.id, warehouseId: mainWarehouse.id, quantity: mainQty } });
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          warehouseId: mainWarehouse.id,
          type: StockMovementType.INITIAL_STOCK,
          quantity: mainQty,
          previousQuantity: 0,
          newQuantity: mainQty,
          reason: 'Seed data - initial stock',
          userId: adminUser.id,
        },
      });
    }

    const existingBranch = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: product.id, warehouseId: branchWarehouse.id } },
    });
    if (!existingBranch) {
      await prisma.inventory.create({ data: { productId: product.id, warehouseId: branchWarehouse.id, quantity: branchQty } });
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          warehouseId: branchWarehouse.id,
          type: StockMovementType.INITIAL_STOCK,
          quantity: branchQty,
          previousQuantity: 0,
          newQuantity: branchQty,
          reason: 'Seed data - initial stock',
          userId: adminUser.id,
        },
      });
    }
  }

  // Intentionally leave one product low-stock / one out-of-stock for dashboard demo purposes.
  const lowStockProduct = products[products.length - 1];
  await prisma.inventory.update({
    where: { productId_warehouseId: { productId: lowStockProduct.id, warehouseId: branchWarehouse.id } },
    data: { quantity: 3 },
  });
  const outOfStockProduct = products[products.length - 2];
  await prisma.inventory.update({
    where: { productId_warehouseId: { productId: outOfStockProduct.id, warehouseId: branchWarehouse.id } },
    data: { quantity: 0 },
  });

  console.log('Seeding a sample purchase...');
  const existingPurchase = await prisma.purchase.findUnique({ where: { invoiceNumber: 'PUR-SEED-0001' } });
  if (!existingPurchase) {
    const purchase = await prisma.purchase.create({
      data: {
        invoiceNumber: 'PUR-SEED-0001',
        supplierId: supplier1.id,
        warehouseId: mainWarehouse.id,
        status: 'RECEIVED',
        subtotal: 500,
        taxTotal: 0,
        discountTotal: 0,
        total: 500,
        receivedById: adminUser.id,
        items: {
          create: [
            { productId: products[0].id, quantity: 50, unitCost: 8, lineTotal: 400 },
            { productId: products[1].id, quantity: 33, unitCost: 3, lineTotal: 99 },
          ],
        },
      },
    });
    console.log(`  created ${purchase.invoiceNumber}`);
  }

  console.log('Seeding a sample sale...');
  const existingSale = await prisma.sale.findUnique({ where: { invoiceNumber: 'INV-SEED-0001' } });
  if (!existingSale) {
    const sale = await prisma.sale.create({
      data: {
        invoiceNumber: 'INV-SEED-0001',
        customerId: customer1.id,
        warehouseId: mainWarehouse.id,
        staffId: salesUser.id,
        status: 'COMPLETED',
        subtotal: 39.98,
        taxTotal: 0,
        discountTotal: 0,
        total: 39.98,
        paymentMethod: 'CASH',
        paymentStatus: 'PAID',
        items: {
          create: [{ productId: products[0].id, quantity: 2, unitPrice: 19.99, lineTotal: 39.98 }],
        },
      },
    });
    console.log(`  created ${sale.invoiceNumber}`);
  }

  console.log('Seeding sample expenses...');
  const expenseSeeds = [
    { category: 'Rent', description: 'Warehouse rent', amount: 2000 },
    { category: 'Utilities', description: 'Electricity bill', amount: 350 },
    { category: 'Salaries', description: 'Staff wages', amount: 5200 },
  ];
  for (const e of expenseSeeds) {
    const exists = await prisma.expense.findFirst({ where: { description: e.description } });
    if (!exists) await prisma.expense.create({ data: e });
  }

  console.log('\nSeed complete.');
  console.log('--------------------------------------------------');
  console.log('Development login credentials (do NOT use in production):');
  console.log(`  Super Admin:        ${adminEmail} / ${adminPassword}`);
  console.log('  Sales Staff:        sales@inventory.local / Sales@12345');
  console.log('  Purchasing Officer: purchasing@inventory.local / Purchase@12345');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
