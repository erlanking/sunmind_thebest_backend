import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'dotenv/config';

async function start() {
  const PORT = process.env.PORT || 5001;
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*', // ⚠️ для разработки
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

  await app.listen(PORT, '0.0.0.0', () =>
    console.log(`Server started ${PORT}`),
  );
}
start();
