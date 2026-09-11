import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { endOfDay } from '../common/utils/date-range';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(params: { page: number; pageSize: number; from?: string; to?: string; category?: string }) {
    const { page, pageSize, from, to, category } = params;
    const where: any = {
      ...(category ? { category } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: endOfDay(to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async create(dto: CreateExpenseDto, userId: string) {
    const expense = await this.prisma.expense.create({
      data: { ...dto, date: dto.date ? new Date(dto.date) : new Date() },
    });
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Expense',
      entityId: expense.id,
      description: `Recorded expense "${expense.description}" for ${expense.amount}`,
      newData: expense,
    });
    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto, userId: string) {
    const existing = await this.findOne(id);
    const expense = await this.prisma.expense.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Expense',
      entityId: id,
      description: `Updated expense "${expense.description}"`,
      previousData: existing,
      newData: expense,
    });
    return expense;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);
    await this.prisma.expense.delete({ where: { id } });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Expense',
      entityId: id,
      description: `Deleted expense "${existing.description}"`,
      previousData: existing,
    });
    return { success: true };
  }
}
