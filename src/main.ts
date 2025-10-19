import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://skepsis.live', 'https://beta.skepsis.live', 'https://www.skepsis.live']
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Skepsis Backend running on http://localhost:${port}`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI}`);
}

bootstrap();
