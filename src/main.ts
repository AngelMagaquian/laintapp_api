import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { HttpErrorInterceptor } from './common/interceptors/http-error.interceptor';
import * as fs from 'fs';
async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/nexogroup.ar/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/nexogroup.ar/fullchain.pem'),
  };

  const app = await NestFactory.create(AppModule, {
    httpsOptions,
  });

  // Configuración de CORS
  app.enableCors({
    origin: ['http://localhost/', 'https://168.181.185.21/', 'https://nexogroup.ar/', 'http://nexogroup.ar','http//168.181.185.21'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
 });

  // Configuración de límite de tamaño para el body
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Coop Sup API')
    .setDescription('API para el sistema de Coop Sup')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Pipes globales
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Interceptor de errores global
  app.useGlobalInterceptors(new HttpErrorInterceptor());

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  await app.listen(3010);
}
bootstrap();