import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, verify } from '@node-rs/argon2';
import { createHash } from 'crypto';
import { PrismaService } from '@prisma/prisma.service';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { AuthResponseDto } from '@modules/auth/dto/auth-response.dto';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { JwtPayload } from '@modules/auth/strategies/jwt.strategy';
import { handlePrismaError } from '@/common/utils/prisma-error.util';
import { User } from '@generated/prisma/client';
import ms from 'ms';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface AuthResult {
  response: AuthResponseDto;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  // --- Helper Methods ---
  // SHA-256 for refresh token — argon2 not needed since this is not a password
  // Just need fast hash for DB comparison
  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Sign both tokens, parse exp from JWT for source-of-truth expiresAt
  private async generateTokens(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
    };

    const accessSecret = this.config.get<string>('jwt.accessSecret')!;
    const accessExpiresIn = this.config.get<string>('jwt.accessExpiresIn')! as ms.StringValue;
    const refreshSecret = this.config.get<string>('jwt.refreshSecret')!;
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn')! as ms.StringValue;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    // Decode refresh token to get exact exp — single source of truth
    const decoded = this.jwtService.decode(refreshToken) as { exp: number };
    const refreshExpiresAt = new Date(decoded.exp * 1000);

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private async saveRefreshToken(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });
  }

  // --- Auth Flows ---
  async register(dto: RegisterDto, userAgent?: string, ipAddress?: string): Promise<AuthResult> {
    const { password, ...userData } = dto;
    const passwordHash = await hash(password);

    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          ...userData,
          passwordHash,
        },
      });
    } catch (e) {
      return handlePrismaError(e, 'register', this.logger);
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      tokens.refreshExpiresAt,
      userAgent,
      ipAddress,
    );

    return {
      response: {
        accessToken: tokens.accessToken,
        user: new UserResponseDto(user),
      },
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt,
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthResult> {
    // Find user by email OR username
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
    });

    // Generic error message to prevent user enumeration attacks
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    await this.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      tokens.refreshExpiresAt,
      userAgent,
      ipAddress,
    );

    return {
      response: {
        accessToken: tokens.accessToken,
        user: new UserResponseDto(user),
      },
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt,
    };
  }

  async refresh(refreshToken: string, userAgent?: string, ipAddress?: string): Promise<AuthResult> {
    // Verify JWT signature + expiry first (catches JsonWebTokenError, TokenExpiredError)
    const refreshSecret = this.config.get<string>('jwt.refreshSecret');
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // Token reuse detection: JWT signature passes BUT token is revoked in DB
    // → likely stolen → revoke ALL tokens of user
    if (storedToken?.isRevoked) {
      this.logger.warn(`Suspicious refresh token reuse detected for user ${payload.sub}`);
      await this.prisma.refreshToken.updateMany({
        where: { userId: payload.sub, isRevoked: false },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Security alert: please login again');
    }

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (!storedToken.user.isActive || storedToken.user.deletedAt) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Refresh Token Rotation: revoke old → issue new
    // Wrapped in transaction → atomic, rollback on failure
    const tokens = await this.generateTokens(storedToken.user);
    const newTokenHash = this.hashRefreshToken(tokens.refreshToken);

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { tokenHash },
        data: { isRevoked: true },
      }),
      this.prisma.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId: storedToken.user.id,
          userAgent,
          ipAddress,
          expiresAt: tokens.refreshExpiresAt,
        },
      }),
    ]);

    return {
      response: {
        accessToken: tokens.accessToken,
        user: new UserResponseDto(storedToken.user),
      },
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);

    // updateMany — doesn't throw if not found (idempotent)
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }
}
