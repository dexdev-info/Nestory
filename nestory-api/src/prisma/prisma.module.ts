import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Export PrismaService globally — không cần import lại ở mỗi module
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
