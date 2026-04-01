import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix + versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI });

  // Thứ tự quan trọng:
  // 1. ExceptionFilter trước — catch lỗi từ pipe, guard, interceptor
  // 2. ClassSerializerInterceptor — xử lý @Exclude() trên DTO
  // 3. TransformInterceptor — wrap response thành ApiResponse shape
  // 4. ValidationPipe cuối — validate request

  // ExceptionFilter global — catch lỗi từ pipe, guard, interceptor
  app.useGlobalFilters(new AllExceptionsFilter());

  // ClassSerializerInterceptor global — xử lý @Exclude() trong response DTO
  // TransformInterceptor global — wrap response theo ApiResponse shape
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new TransformInterceptor(reflector),
  );

  // ValidationPipe global — transform + whitelist
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip các field không khai báo trong DTO
      forbidNonWhitelisted: true, // throw error nếu gửi field lạ
      transform: true, // tự convert type (string -> number, string -> boolean...)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
