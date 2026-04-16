import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from '@modules/users/users.service';
import { CreateUserDto } from '@modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@modules/users/dto/update-user.dto';
import { UpdateProfileDto } from '@modules/users/dto/update-profile.dto';
import { QueryUserDto } from '@modules/users/dto/query-user.dto';
import { ParseCuidPipe } from '@common/pipes/parse-cuid.pipe';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ResponseMessage } from '@common/interceptors/transform.interceptor';
import { UserResponseDto } from '@modules/users/dto/user-response.dto';
import { PaginatedData } from '@common/interfaces/api-response.interface';

// Separate to avoid route conflict /me vs /:id
// --- Profile Controller (User Facing) ---
// TODO: @UseGuards(JwtAuthGuard)

@Controller('profile')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/profile
  @Get()
  @ResponseMessage('Get profile successfully')
  async getMe(@CurrentUser('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.getMe(userId);
  }

  // PATCH /api/profile
  @Patch()
  @ResponseMessage('Update profile successfully')
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateMe(userId, dto);
  }

  // DELETE /api/profile
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@CurrentUser('id') userId: string): Promise<void> {
    return this.usersService.deleteMe(userId);
  }
}

// --- Users Controller (Admin Facing) ---
// TODO: @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)

@Controller({ path: 'users' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /api/users
  @Post()
  @ResponseMessage('Create user successfully')
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  // GET /api/users
  @Get()
  @ResponseMessage('Get users successfully')
  async findAll(@Query() query: QueryUserDto): Promise<PaginatedData<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  // GET /api/users/:id
  @Get(':id')
  @ResponseMessage('Get details of user successfully')
  async findOne(@Param('id', ParseCuidPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  // PATCH /api/users/:id
  @Patch(':id')
  @ResponseMessage('Update user successfully')
  async update(
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  // DELETE /api/users/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Delete user successfully')
  async remove(@Param('id', ParseCuidPipe) id: string): Promise<void> {
    return this.usersService.softDelete(id);
  }
}
