import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import 'dotenv/config';

const httpLogger = new Logger('HTTP');

async function start() {
  const app = await NestFactory.create(AppModule);

  // Log every incoming request
  app.use((req: any, res: any, next: any) => {
    const { method, originalUrl } = req;
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const status = res.statusCode;
      let bodyStr = '';
      try {
        const b = req.body;
        if (b && typeof b === 'object' && Object.keys(b).length > 0) {
          bodyStr = ' ' + JSON.stringify(b);
        }
      } catch (_) {}
      httpLogger.log(`${method} ${originalUrl}${bodyStr} → ${status} (${ms}ms)`);
    });
    next();
  });

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

  const port = process.env.PORT ?? 10000;

  await app.listen(port, '0.0.0.0');

  console.log(`Server started on port ${port}`);
}

start();