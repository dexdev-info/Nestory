import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController, ProfileController } from './users.controller';

@Module({
  controllers: [ProfileController, UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export for AuthModule
})
export class UsersModule {}
