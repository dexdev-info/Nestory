import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
// import * as cookieParser from 'cookie-parser';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  // app.enableVersioning({ type: VersioningType.URI });

  // Cookie parser — must be before global filters/interceptors/pipes
  app.use(cookieParser());

  // ExceptionFilter global - catch error from pipe, guard, interceptor
  app.useGlobalFilters(new AllExceptionsFilter());

  // Interceptor global
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector), // strip @Exclude()
    new TransformInterceptor(reflector), // wrap ApiResponse shape
  );

  // ValidationPipe global -validate request body
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
