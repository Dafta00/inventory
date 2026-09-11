import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRoleDto, SetRolePermissionsDto, UpdateRoleDto } from './dto/role.dto';
import { ALL_PERMISSIONS } from '../common/constants/permissions';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPermissions() {
    return ALL_PERMISSIONS;
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
      userCount: r._count.users,
      permissions: r.permissions.map((rp) => rp.permission.key),
    }));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((rp) => rp.permission.key),
    };
  }

  async create(dto: CreateRoleDto, userId: string) {
    const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A role with this name already exists');

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissionKeys?.length
          ? {
              create: dto.permissionKeys.map((key) => ({
                permission: { connect: { key } },
              })),
            }
          : undefined,
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE',
      entity: 'Role',
      entityId: role.id,
      description: `Created role "${role.name}"`,
      newData: role,
    });

    return this.findOne(role.id);
  }

  async update(id: string, dto: UpdateRoleDto, userId: string) {
    const existing = await this.findOne(id);
    if (existing.isSystem && dto.name && dto.name !== existing.name) {
      throw new BadRequestException('System role names cannot be changed');
    }
    const role = await this.prisma.role.update({ where: { id }, data: dto });
    await this.audit.log({
      userId,
      action: 'UPDATE',
      entity: 'Role',
      entityId: id,
      description: `Updated role "${role.name}"`,
      previousData: existing,
      newData: role,
    });
    return this.findOne(id);
  }

  async setPermissions(id: string, dto: SetRolePermissionsDto, userId: string) {
    const existing = await this.findOne(id);
    if (existing.name === 'Super Admin') {
      throw new BadRequestException('Super Admin always has full access and cannot be modified');
    }

    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: dto.permissionKeys } },
    });

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: id, permissionId: p.id })),
      }),
    ]);

    await this.audit.log({
      userId,
      action: 'UPDATE_PERMISSIONS',
      entity: 'Role',
      entityId: id,
      description: `Updated permissions for role "${existing.name}"`,
      previousData: { permissions: existing.permissions },
      newData: { permissions: dto.permissionKeys },
    });

    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id);
    if (existing.isSystem) throw new BadRequestException('System roles cannot be deleted');

    const usersWithRole = await this.prisma.user.count({ where: { roleId: id, deletedAt: null } });
    if (usersWithRole > 0) {
      throw new BadRequestException(`Cannot delete role - ${usersWithRole} user(s) are assigned to it`);
    }

    await this.prisma.role.delete({ where: { id } });
    await this.audit.log({
      userId,
      action: 'DELETE',
      entity: 'Role',
      entityId: id,
      description: `Deleted role "${existing.name}"`,
      previousData: existing,
    });
    return { success: true };
  }
}
