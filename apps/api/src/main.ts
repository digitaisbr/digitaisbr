import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap(): Promise<void> {
  // rawBody: os webhooks de parceiro são assinados sobre o corpo cru. O JSON
  // reserializado pode diferir do original, e a assinatura não fecharia.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  const config = app.get(ConfigService);

  const prefixo = config.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(prefixo);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', '*').split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ordem importa: o filtro mais específico é registrado por último
  app.useGlobalFilters(new AllExceptionsFilter(), new PrismaExceptionFilter());

  const doc = new DocumentBuilder()
    .setTitle('DigitaisBR API')
    .setDescription(
      'API da plataforma DigitaisBR — associação de criadores digitais. ' +
        'Área administrativa e portal do associado.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();

  SwaggerModule.setup(`${prefixo}/docs`, app, SwaggerModule.createDocument(app, doc), {
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
  });

  const porta = config.get<number>('PORT', 3000);
  await app.listen(porta);

  const logger = new Logger('Bootstrap');
  logger.log(`API em http://localhost:${porta}/${prefixo}`);
  logger.log(`Swagger em http://localhost:${porta}/${prefixo}/docs`);
}

void bootstrap();
