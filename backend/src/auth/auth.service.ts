import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const REFRESH_COOKIE_NAME = 'refresh_token';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  private async signAccessToken(userId: string) {
    return this.jwtService.signAsync(
      { sub: userId },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      },
    );
  }

  private generateRefreshTokenValue() {
    return crypto.randomBytes(64).toString('hex');
  }

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private refreshExpiryDate() {
    const days = parseInt((process.env.JWT_REFRESH_EXPIRES_IN ?? '7d').replace('d', ''), 10) || 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  async login(email: string, password: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    if (!user || user.deletedAt) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Account is disabled');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.signAccessToken(user.id);
    const refreshTokenValue = this.generateRefreshTokenValue();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshTokenValue),
        expiresAt: this.refreshExpiryDate(),
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      description: `${user.email} logged in`,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: this.serializeUser(user),
    };
  }

  async refresh(refreshTokenValue: string) {
    if (!refreshTokenValue) throw new UnauthorizedException('Missing refresh token');

    const tokenHash = this.hashToken(refreshTokenValue);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });

    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt < new Date() ||
      !existing.user ||
      existing.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const newRefreshValue = this.generateRefreshTokenValue();
    await this.prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: this.hashToken(newRefreshValue),
        expiresAt: this.refreshExpiryDate(),
      },
    });

    const accessToken = await this.signAccessToken(existing.userId);

    return {
      accessToken,
      refreshToken: newRefreshValue,
      user: this.serializeUser(existing.user),
    };
  }

  async logout(refreshTokenValue: string) {
    if (!refreshTokenValue) return;
    const tokenHash = this.hashToken(refreshTokenValue);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    await this.auditService.log({
      userId,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: userId,
      description: 'User changed their own password',
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always respond success-shaped to avoid user enumeration; only issue a token if the user exists.
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      return { resetToken: null };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // NOTE: no email/SMTP provider is wired up. In a real deployment this
    // token would be emailed to the user rather than returned to the caller.
    return { resetToken: rawToken };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  private serializeUser(user: any) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: user.role.name,
      permissions: user.role.permissions.map((rp: any) => rp.permission.key),
    };
  }

  static readonly REFRESH_COOKIE_NAME = REFRESH_COOKIE_NAME;
}
