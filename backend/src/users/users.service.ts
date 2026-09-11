import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, ResetUserPasswordDto, UpdateUserDto } from './dto/user.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  roleId: true,
  role: { select: { id: true, name: true } },
} as const;

@Injectable()
export class UsersService {
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
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: SAFE_SELECT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: SAFE_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto, actingUserId: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        roleId: dto.roleId,
      },
      select: SAFE_SELECT,
    });

    await this.audit.log({
      userId: actingUserId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      description: `Created user "${user.name}" (${user.email}) with role ${role.name}`,
      newData: user,
    });

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actingUserId: string) {
    const existing = await this.findOne(id);

    if (dto.email && dto.email !== existing.email) {
      const dup = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (dup) throw new ConflictException('A user with this email already exists');
    }

    const user = await this.prisma.user.update({ where: { id }, data: dto, select: SAFE_SELECT });

    await this.audit.log({
      userId: actingUserId,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      description: `Updated user "${user.name}"`,
      previousData: existing,
      newData: user,
    });

    return user;
  }

  async remove(id: string, actingUserId: string) {
    if (id === actingUserId) throw new BadRequestException('You cannot deactivate your own account');
    const existing = await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'DISABLED' },
      select: SAFE_SELECT,
    });
    await this.audit.log({
      userId: actingUserId,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      description: `Deactivated user "${existing.name}"`,
      previousData: existing,
    });
    return user;
  }

  async resetPassword(id: string, dto: ResetUserPasswordDto, actingUserId: string) {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({
      userId: actingUserId,
      action: 'RESET_PASSWORD',
      entity: 'User',
      entityId: id,
      description: `Reset password for user ${id}`,
    });
    return { success: true };
  }
}
