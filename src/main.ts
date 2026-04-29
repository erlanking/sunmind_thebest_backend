import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';

async function start() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('SunMind API')
    .setDescription('API для управления умным освещением')
    .setVersion('1.0')
    .addTag('SunMind')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT;

  if (!port) {
    throw new Error('PORT is not defined');
  }

  await app.listen(port, '0.0.0.0');

  console.log(`Server started on port ${port}`);
}

start();