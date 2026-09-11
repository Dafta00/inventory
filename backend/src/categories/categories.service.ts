import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(search?: string) {
    const categories = await this.prisma.category.findMany({
      where: {
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
      orderBy: { name: 'asc' },
    });
    return categories.map((c) => ({
      ...c,
      productCount: c._count.products,
      childCount: c._count.children,
    }));
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: { parent: true, children: true, _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto, userId: string) {
    const category = await this.prisma.category.create({ data: dto });
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Category',
      entityId: category.id,
      description: `Created category "${category.name}"`,
      newData: category,
    });
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, userId: string) {
    const existing = await this.findOne(id);
    if (dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }
    const category = await this.prisma.category.update({ where: { id }, data: dto });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Category',
      entityId: id,
      description: `Updated category "${category.name}"`,
      previousData: existing,
      newData: category,
    });
    return category;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);
    const productCount = await this.prisma.product.count({
      where: { categoryId: id, deletedAt: null },
    });
    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot archive category with ${productCount} active product(s) assigned`,
      );
    }
    const category = await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Category',
      entityId: id,
      description: `Archived category "${existing.name}"`,
      previousData: existing,
    });
    return category;
  }
}
