import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(search?: string) {
    const brands = await this.prisma.brand.findMany({
      where: {
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    return brands.map((b) => ({ ...b, productCount: b._count.products }));
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, deletedAt: null } });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(dto: CreateBrandDto, userId: string) {
    const brand = await this.prisma.brand.create({ data: dto });
    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Brand',
      entityId: brand.id,
      description: `Created brand "${brand.name}"`,
      newData: brand,
    });
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto, userId: string) {
    const existing = await this.findOne(id);
    const brand = await this.prisma.brand.update({ where: { id }, data: dto });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Brand',
      entityId: id,
      description: `Updated brand "${brand.name}"`,
      previousData: existing,
      newData: brand,
    });
    return brand;
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);
    const productCount = await this.prisma.product.count({
      where: { brandId: id, deletedAt: null },
    });
    if (productCount > 0) {
      throw new BadRequestException(`Cannot archive brand with ${productCount} active product(s) assigned`);
    }
    const brand = await this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Brand',
      entityId: id,
      description: `Archived brand "${existing.name}"`,
      previousData: existing,
    });
    return brand;
  }
}
