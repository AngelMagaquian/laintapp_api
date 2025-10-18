import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { HttpErrorInterceptor } from './common/interceptors/http-error.interceptor';
import * as fs from 'fs';

async function bootstrap() {
  let app = null;
  const env = process.env.ENVIRONMENT || 'PROD';

  console.log('🚀 Starting NestJS App');
  console.log('Environment:', env);

  if (env === 'PROD') {
    try {
      const httpsOptions = {
        key: fs.readFileSync('/etc/letsencrypt/live/nexogroup.ar/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/nexogroup.ar/fullchain.pem'),
      };
      app = await NestFactory.create(AppModule, { httpsOptions });
      console.log('✅ HTTPS enabled (PROD mode)');
    } catch (error) {
      console.error('❌ Error loading SSL certificates:', error.message);
      process.exit(1);
    }
  } else {
    app = await NestFactory.create(AppModule);
    console.log('🧪 Running without HTTPS (non-PROD environment)');
  }

  // --- CORS Configuración ---
  app.enableCors({
    origin: [
      'http://localhost',
      'http://localhost:3000',
      'https://168.181.185.21',
      'https://nexogroup.ar',
      'http://nexogroup.ar',
      'http://168.181.185.21'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // --- Body size limits ---
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- Swagger ---
  const config = new DocumentBuilder()
    .setTitle('Coop Sup API')
    .setDescription('API para el sistema de Coop Sup')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // --- Validaciones globales ---
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // --- Interceptor global de errores ---
  app.useGlobalInterceptors(new HttpErrorInterceptor());

  // --- Configuración de proxy ---
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  const port = process.env.PORT || 3010;
  await app.listen(port);

  console.log(`✅ Application is running on port ${port}`);
}

bootstrap();
