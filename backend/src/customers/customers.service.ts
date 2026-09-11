import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: PaginationQueryDto) {
    const { page, pageSize, search } = query;
    const where: any = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) throw new NotFoundException('Customer not found');

    const [recentSales, aggregates, outstanding] = await Promise.all([
      this.prisma.sale.findMany({
        where: { customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, invoiceNumber: true, total: true, paymentStatus: true, createdAt: true },
      }),
      this.prisma.sale.aggregate({ where: { customerId: id }, _sum: { total: true }, _count: true }),
      this.prisma.sale.aggregate({
        where: { customerId: id, paymentStatus: { in: ['PENDING', 'PARTIAL'] } },
        _sum: { total: true },
      }),
    ]);

    return {
      ...customer,
      recentSales,
      totalSpent: aggregates._sum.total ?? 0,
      totalOrders: aggregates._count,
      outstandingBalance: outstanding._sum.total ?? 0,
    };
  }

  async create(dto: CreateCustomerDto, userId: string) {
    const customer = await this.prisma.customer.create({ data: dto as any });
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Customer',
      entityId: customer.id,
      description: `Created customer "${customer.name}"`,
      newData: customer,
    });
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, userId: string) {
    const existing = await this.findOne(id);
    const customer = await this.prisma.customer.update({ where: { id }, data: dto as any });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Customer',
      entityId: id,
      description: `Updated customer "${customer.name}"`,
      previousData: existing,
      newData: customer,
    });
    return customer;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Customer',
      entityId: id,
      description: `Archived customer "${existing.name}"`,
      previousData: existing,
    });
    return customer;
  }
}
