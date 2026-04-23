import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { Reflector } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1', prefix: 'api/v' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  app.use(
    '/api/docs',
    require('express').static('node_modules/swagger-ui-dist'),
  );

  const config = new DocumentBuilder()
    .setTitle('欠薪支持起诉智能办案平台')
    .setDescription('检察端 API 接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', '认证授权')
    .addTag('dashboard', '首页总览')
    .addTag('clue', '线索管理')
    .addTag('review', 'AI 辅助审查')
    .addTag('document', '文书管理')
    .addTag('batch', '批量办案')
    .addTag('statistics', '数据统计')
    .addTag('system', '系统管理')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 8080);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`API Docs available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
