import {
  Injectable,
  Logger,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import { PrismaService } from '@prisma/prisma.service';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@modules/users/dto/update-user.dto';
import { UpdateProfileDto } from '@modules/users/dto/update-profile.dto';
import { QueryUserDto } from '@modules/users/dto/query-user.dto';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { PaginatedData } from '@/common/interfaces/api-response.interface';
import { Prisma } from '@generated/prisma/client';
import { User } from '@generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(UsersService.name);

  // --- Helper Methods ---

  private toResponse(user: User): UserResponseDto {
    return new UserResponseDto(user);
  }

  private async findActiveUserOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException(`User #${id} không tồn tại`);
    return user;
  }

  //* Handle error from Prisma (especially unique constraint)
  private handlePrismaError(e: unknown, action: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const field = Array.isArray(e.meta?.target)
        ? (e.meta.target as string[]).join(', ')
        : 'Field data';
      throw new ConflictException(`${field} has been used`);
    }

    const message = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    this.logger.error(`Error when ${action}: ${message}`, stack);
    throw new InternalServerErrorException(`Error when ${action}`);
  }

  //*--- Admin: CRUD ---

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const { password, ...userData } = dto;
    const passwordHash = await hash(password);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...userData,
          passwordHash,
        },
      });

      return this.toResponse(user);
    } catch (e) {
      return this.handlePrismaError(e, 'create user');
    }
  }

  async findAll(query: QueryUserDto): Promise<PaginatedData<UserResponseDto>> {
    const { search, role, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Only add field if has value
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { username: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: users.map((u) => this.toResponse(u)),
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.findActiveUserOrThrow(id);
    return this.toResponse(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.findActiveUserOrThrow(id);

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: dto,
      });
      return this.toResponse(user);
    } catch (e) {
      return this.handlePrismaError(e, 'update user');
    }
  }

  async softDelete(id: string): Promise<void> {
    await this.findActiveUserOrThrow(id);

    // Soft delete: set deletedAt, revoke all refresh tokens
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: id, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);
  }

  //*--- USER self actions profile ---

  async getMe(id: string): Promise<UserResponseDto> {
    return this.findOne(id);
  }

  async updateMe(id: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    await this.findActiveUserOrThrow(id);

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: dto,
      });
      return this.toResponse(user);
    } catch (e) {
      return this.handlePrismaError(e, 'update profile');
    }
  }

  async deleteMe(id: string): Promise<void> {
    return this.softDelete(id);
  }
}
