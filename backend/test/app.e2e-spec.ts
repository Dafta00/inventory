import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

const runId = Date.now();

describe('Inventory Management System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let salesToken: string;
  let warehouseAId: string;
  let warehouseBId: string;
  let productId: string;
  let supplierId: string;
  let customerId: string;
  let saleId: string;
  let purchaseId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);

    // Seed data assumed present (roles/permissions/admin) via `prisma db seed`.
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@inventory.local', password: 'Admin@12345' })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    const salesLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'sales@inventory.local', password: 'Sales@12345' })
      .expect(200);
    salesToken = salesLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication', () => {
    it('rejects invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'admin@inventory.local', password: 'wrong-password' })
        .expect(401);
    });

    it('rejects requests without a token', async () => {
      await request(app.getHttpServer()).get('/api/products').expect(401);
    });

    it('returns the authenticated user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.email).toBe('admin@inventory.local');
      expect(res.body.permissions).toContain('products.view');
    });
  });

  describe('Authorization (RBAC)', () => {
    it('blocks a sales-staff user from managing users', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(403);
    });

    it('allows a sales-staff user to view products', async () => {
      await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(200);
    });
  });

  describe('Warehouses and suppliers setup', () => {
    it('creates two warehouses', async () => {
      const a = await request(app.getHttpServer())
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Warehouse A ${runId}`, code: `E2E-A-${runId}` })
        .expect(201);
      warehouseAId = a.body.id;

      const b = await request(app.getHttpServer())
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Warehouse B ${runId}`, code: `E2E-B-${runId}` })
        .expect(201);
      warehouseBId = b.body.id;
    });

    it('returns a clean 409 (not a raw 500) for a duplicate warehouse code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Warehouse A duplicate ${runId}`, code: `E2E-A-${runId}` })
        .expect(409);
      expect(res.body.message).not.toMatch(/prisma|stack|at Object/i);
    });

    it('creates a supplier and a customer', async () => {
      const supplier = await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Supplier ${runId}` })
        .expect(201);
      supplierId = supplier.body.id;

      const customer = await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Customer ${runId}` })
        .expect(201);
      customerId = customer.body.id;
    });

    it('accepts an explicit empty-string email on optional fields (blank form input), not just an omitted key', async () => {
      // A real browser form sends email: "" for a blank optional field,
      // never an omitted key. @IsOptional() only skips undefined/null, so
      // without stripping "" first, @IsEmail() would reject a form the user
      // never touched. Cover all four entities that accept an optional email.
      await request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Blank Email Customer ${runId}`, email: '' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Blank Email Supplier ${runId}`, email: '' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/warehouses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Blank Email Warehouse ${runId}`, code: `E2E-EMAIL-${runId}`, email: '' })
        .expect(201);

      const user = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Blank Update User',
          email: `e2e-blank-update-${runId}@inventory.local`,
          password: 'Password@123',
          roleId: (await request(app.getHttpServer())
            .get('/api/roles')
            .set('Authorization', `Bearer ${adminToken}`)
          ).body.find((r: any) => r.name === 'Sales Staff').id,
        })
        .expect(201);

      // PATCH with an empty-string email should also not reject the update.
      await request(app.getHttpServer())
        .patch(`/api/users/${user.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Blank Update User (renamed)', email: '' })
        .expect(200);
    });
  });

  describe('Product management', () => {
    it('creates a product with an auto-generated SKU', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Widget ${runId}`, costPrice: 5, sellingPrice: 10, reorderLevel: 3 })
        .expect(201);
      productId = res.body.id;
      expect(res.body.sku).toBeTruthy();
    });

    it('rejects a duplicate barcode', async () => {
      const barcode = `E2E-BARCODE-${runId}`;
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Barcode product A ${runId}`, barcode, costPrice: 1, sellingPrice: 2 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Barcode product B ${runId}`, barcode, costPrice: 1, sellingPrice: 2 })
        .expect(409);
    });

    it('rejects invalid payloads (negative price)', async () => {
      await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Invalid product', costPrice: -5, sellingPrice: 10 })
        .expect(400);
    });

    it('accepts an explicit empty-string expected delivery date on a purchase order (blank date input)', async () => {
      // A real browser <input type="date"> left blank submits "", not an
      // omitted key. @IsOptional() only skips undefined/null, so without
      // stripping "" first, @IsDateString() would reject a field the user
      // never touched.
      await request(app.getHttpServer())
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId,
          warehouseId: warehouseAId,
          expectedDate: '',
          items: [{ productId, quantity: 1, unitCost: 1 }],
        })
        .expect(201);
    });

    it('bulk-archives products by id (regression: DTO whitelist stripped undecorated "ids" field)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Bulk archive target ${runId}`, costPrice: 1, sellingPrice: 2 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/products/bulk-archive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ids: [res.body.id] })
        .expect(201);

      // archived products are soft-deleted, so they disappear from lookups
      await request(app.getHttpServer())
        .get(`/api/products/${res.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Inventory: stock adjustment and transfer', () => {
    it('increases stock via a manual adjustment', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId, warehouseId: warehouseAId, quantityDelta: 100, type: 'INITIAL_STOCK', reason: 'e2e setup' })
        .expect(201);
      expect(res.body.newQuantity).toBe(100);
    });

    it('blocks an adjustment that would take stock negative', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId, warehouseId: warehouseAId, quantityDelta: -1000, type: 'ADJUSTMENT' })
        .expect(400);
    });

    it('transfers stock between warehouses and updates both sides', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId, fromWarehouseId: warehouseAId, toWarehouseId: warehouseBId, quantity: 30 })
        .expect(201);

      const stock = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const stockA = stock.body.find((s: any) => s.warehouseId === warehouseAId);
      const stockB = stock.body.find((s: any) => s.warehouseId === warehouseBId);
      expect(stockA.quantity).toBe(70);
      expect(stockB.quantity).toBe(30);
    });

    it('rejects a transfer to the same warehouse', async () => {
      await request(app.getHttpServer())
        .post('/api/inventory/transfer')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId, fromWarehouseId: warehouseAId, toWarehouseId: warehouseAId, quantity: 1 })
        .expect(400);
    });
  });

  describe('Purchasing: direct purchase increases stock', () => {
    it('records a direct purchase and increases stock', async () => {
      const before = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId, warehouseId: warehouseAId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const beforeQty = before.body[0]?.quantity ?? 0;

      const res = await request(app.getHttpServer())
        .post('/api/purchases')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId,
          warehouseId: warehouseAId,
          items: [{ productId, quantity: 20, unitCost: 5 }],
        })
        .expect(201);
      purchaseId = res.body.id;

      const after = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId, warehouseId: warehouseAId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(after.body[0].quantity).toBe(beforeQty + 20);
    });
  });

  describe('Purchase order lifecycle', () => {
    let poId: string;

    it('creates a draft purchase order', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId,
          warehouseId: warehouseAId,
          items: [{ productId, quantity: 10, unitCost: 5 }],
        })
        .expect(201);
      poId = res.body.id;
      expect(res.body.status).toBe('DRAFT');
    });

    it('cannot be received before it is sent/confirmed', async () => {
      await request(app.getHttpServer())
        .post(`/api/purchase-orders/${poId}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId, quantityReceived: 5 }] })
        .expect(400);
    });

    it('progresses through sent -> confirmed', async () => {
      await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${poId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SENT' })
        .expect(200);

      const confirmed = await request(app.getHttpServer())
        .patch(`/api/purchase-orders/${poId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);
      expect(confirmed.body.status).toBe('CONFIRMED');
    });

    it('partially receives the order and marks it PARTIALLY_RECEIVED', async () => {
      await request(app.getHttpServer())
        .post(`/api/purchase-orders/${poId}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId, quantityReceived: 4 }] })
        .expect(201);

      const po = await request(app.getHttpServer())
        .get(`/api/purchase-orders/${poId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(po.body.status).toBe('PARTIALLY_RECEIVED');
      expect(po.body.items[0].receivedQty).toBe(4);
    });

    it('cannot receive more than the remaining quantity', async () => {
      await request(app.getHttpServer())
        .post(`/api/purchase-orders/${poId}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId, quantityReceived: 100 }] })
        .expect(400);
    });

    it('receives the remainder, increases stock, and completes the order', async () => {
      const before = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId, warehouseId: warehouseAId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const beforeQty = before.body[0].quantity;

      await request(app.getHttpServer())
        .post(`/api/purchase-orders/${poId}/receive`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ items: [{ productId, quantityReceived: 6 }] })
        .expect(201);

      const po = await request(app.getHttpServer())
        .get(`/api/purchase-orders/${poId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(po.body.status).toBe('RECEIVED');

      const after = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId, warehouseId: warehouseAId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(after.body[0].quantity).toBe(beforeQty + 6);
    });
  });

  describe('Sales: stock validation and deduction', () => {
    it('rejects a sale that exceeds available stock', async () => {
      await request(app.getHttpServer())
        .post('/api/sales')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ warehouseId: warehouseAId, items: [{ productId, quantity: 999999, unitPrice: 10 }] })
        .expect(400);
    });

    it('completes a sale and deducts stock atomically', async () => {
      const before = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId, warehouseId: warehouseAId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const beforeQty = before.body[0].quantity;

      const res = await request(app.getHttpServer())
        .post('/api/sales')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ customerId, warehouseId: warehouseAId, items: [{ productId, quantity: 5, unitPrice: 10 }] })
        .expect(201);
      saleId = res.body.id;
      expect(res.body.total).toBe('50');

      const after = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId, warehouseId: warehouseAId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(after.body[0].quantity).toBe(beforeQty - 5);
    });

    it('blocks a sales-staff user from accessing finance data', async () => {
      await request(app.getHttpServer())
        .get('/api/expenses')
        .set('Authorization', `Bearer ${salesToken}`)
        .expect(403);
    });
  });

  describe('Returns', () => {
    it('creates a sales return and restocks inventory', async () => {
      const before = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId, warehouseId: warehouseAId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const beforeQty = before.body[0].quantity;

      await request(app.getHttpServer())
        .post('/api/sales-returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ saleId, items: [{ productId, quantity: 2, unitPrice: 10, reason: 'CUSTOMER_CHANGE_OF_MIND', restock: true }] })
        .expect(201);

      const after = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId, warehouseId: warehouseAId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(after.body[0].quantity).toBe(beforeQty + 2);
    });

    it('rejects returning more than was sold', async () => {
      await request(app.getHttpServer())
        .post('/api/sales-returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ saleId, items: [{ productId, quantity: 999, unitPrice: 10, reason: 'OTHER' }] })
        .expect(400);
    });

    it('creates a purchase return and decreases inventory', async () => {
      const before = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId, warehouseId: warehouseAId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const beforeQty = before.body[0].quantity;

      await request(app.getHttpServer())
        .post('/api/purchase-returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ purchaseId, items: [{ productId, quantity: 3, unitCost: 5, reason: 'DAMAGED' }] })
        .expect(201);

      const after = await request(app.getHttpServer())
        .get('/api/inventory/stock')
        .query({ productId, warehouseId: warehouseAId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(after.body[0].quantity).toBe(beforeQty - 3);
    });
  });

  describe('Concurrency: returns cannot jointly over-return', () => {
    it('allows only one of two simultaneous overlapping sales returns to succeed', async () => {
      // Sell 10 units, then fire two concurrent returns of 6 units each for
      // the same line item. Individually each is valid (<=10), but together
      // they exceed what was sold - exactly the race the fix closes.
      await request(app.getHttpServer())
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ productId, warehouseId: warehouseAId, quantityDelta: 10, type: 'ADJUSTMENT', reason: 'e2e concurrency setup' })
        .expect(201);

      const concurrencySale = await request(app.getHttpServer())
        .post('/api/sales')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ warehouseId: warehouseAId, items: [{ productId, quantity: 10, unitPrice: 10 }] })
        .expect(201);
      const concurrencySaleId = concurrencySale.body.id;

      const attempt = () =>
        request(app.getHttpServer())
          .post('/api/sales-returns')
          .set('Authorization', `Bearer ${salesToken}`)
          .send({
            saleId: concurrencySaleId,
            items: [{ productId, quantity: 6, unitPrice: 10, reason: 'OTHER', restock: true }],
          });

      const [first, second] = await Promise.all([attempt(), attempt()]);
      const statuses = [first.status, second.status].sort();

      // Exactly one succeeds (201); the other is rejected, either by the
      // pre-check (400, if it lost the race before its transaction even
      // started) or by the Serializable conflict (409).
      expect(statuses[0]).toBe(201);
      expect([400, 409]).toContain(statuses[1]);

      const returned = await request(app.getHttpServer())
        .get('/api/sales-returns')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const totalReturnedForThisSale = returned.body.items
        .filter((r: any) => r.sale.id === concurrencySaleId)
        .reduce((sum: number, r: any) => sum + r.items.reduce((s: number, i: any) => s + i.quantity, 0), 0);
      expect(totalReturnedForThisSale).toBeLessThanOrEqual(10);
    });
  });

  describe('Audit logging', () => {
    it('records an audit log entry for product creation', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-logs')
        .query({ entity: 'Product', pageSize: 5 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.total).toBeGreaterThan(0);
    });
  });

  describe('Dashboard', () => {
    it('returns real aggregate numbers, not fixed placeholders', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(typeof res.body.totalProducts).toBe('number');
      expect(typeof res.body.totalInventoryValue).toBe('number');
    });
  });

  describe('Monetary precision', () => {
    it('computes sale totals to the exact cent for float-prone inputs', async () => {
      // 19.99 * 3 = 59.97, but in IEEE-754 float arithmetic this can land on
      // 59.96999999999999 before rounding. Also apply a tax rate that does
      // not divide evenly (12.5%) to stress the rounding path further.
      const priceProduct = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `E2E Precision Widget ${runId}`, costPrice: 12.33, sellingPrice: 19.99 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/inventory/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: priceProduct.body.id,
          warehouseId: warehouseAId,
          quantityDelta: 50,
          type: 'INITIAL_STOCK',
        })
        .expect(201);

      const sale = await request(app.getHttpServer())
        .post('/api/sales')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          warehouseId: warehouseAId,
          items: [{ productId: priceProduct.body.id, quantity: 3, unitPrice: 19.99, taxRate: 12.5 }],
        })
        .expect(201);

      // subtotal = 59.97, tax = 59.97 * 0.125 = 7.49625 -> rounds to 7.50.
      // Prisma's Decimal serializes without trailing zeros (7.5, not 7.50),
      // so compare numerically rather than by exact string.
      expect(Number(sale.body.subtotal)).toBeCloseTo(59.97, 2);
      expect(Number(sale.body.taxTotal)).toBeCloseTo(7.5, 2);
      expect(Number(sale.body.total)).toBeCloseTo(67.47, 2);
      expect(Number(sale.body.items[0].lineTotal)).toBeCloseTo(67.47, 2);

      // The persisted value must round-trip to at most 2 decimal places - no drift.
      expect(/^\d+(\.\d{1,2})?$/.test(sale.body.total)).toBe(true);
    });
  });

  describe('Granular report permissions', () => {
    let limitedToken: string;

    it('sets up a user who can view reports but not export them', async () => {
      const roles = await request(app.getHttpServer())
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const inventoryOfficerRole = roles.body.find((r: any) => r.name === 'Inventory Officer');
      expect(inventoryOfficerRole).toBeTruthy();
      expect(inventoryOfficerRole.permissions).toContain('reports.view');
      expect(inventoryOfficerRole.permissions).not.toContain('reports.export');

      const email = `e2e-inventory-officer-${runId}@inventory.local`;
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Inventory Officer', email, password: 'Password@123', roleId: inventoryOfficerRole.id })
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Password@123' })
        .expect(200);
      limitedToken = login.body.accessToken;
    });

    it('allows viewing a report on screen', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/sales')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(200);
    });

    it('blocks CSV export for a user without reports.export, even via direct API call', async () => {
      await request(app.getHttpServer())
        .get('/api/reports/sales')
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);
    });

    it('allows CSV export for an admin who has reports.export', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/sales')
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });

  describe('Live permission and status revocation', () => {
    it('rejects a still-unexpired access token immediately after the user is disabled', async () => {
      const email = `e2e-revoke-${runId}@inventory.local`;
      const roles = await request(app.getHttpServer())
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const salesRole = roles.body.find((r: any) => r.name === 'Sales Staff');

      const created = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Revoke Target', email, password: 'Password@123', roleId: salesRole.id })
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Password@123' })
        .expect(200);
      const stillValidToken = login.body.accessToken;

      // The access token has not expired and its signature is still valid,
      // but the JWT strategy re-checks the user's status against the
      // database on every request rather than trusting a cached claim.
      await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${stillValidToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/users/${created.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DISABLED' })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${stillValidToken}`)
        .expect(401);
    });

    it('reflects a role permission change on the very next request, without re-login', async () => {
      const email = `e2e-live-perm-${runId}@inventory.local`;
      const roleName = `E2E Dynamic Role ${runId}`;

      const role = await request(app.getHttpServer())
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: roleName, permissionKeys: ['dashboard.view'] })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Live Perm User', email, password: 'Password@123', roleId: role.body.id })
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Password@123' })
        .expect(200);
      const token = login.body.accessToken;

      await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/roles/${role.body.id}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionKeys: ['dashboard.view', 'products.view'] })
        .expect(200);

      // Same token, no re-login - the newly granted permission takes effect
      // immediately because permissions are read fresh from the DB per request.
      await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Settings', () => {
    it('saves and persists a setting value (regression: DTO whitelist stripped undecorated "value" field)', async () => {
      await request(app.getHttpServer())
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'low_stock_threshold_default', value: 25 })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(res.body.low_stock_threshold_default).toBe(25);

      // restore the original value so this test doesn't leak state
      await request(app.getHttpServer())
        .put('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ key: 'low_stock_threshold_default', value: 10 })
        .expect(200);
    });
  });
});
