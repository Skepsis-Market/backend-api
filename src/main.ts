import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Skepsis API')
    .setDescription('Backend API for Skepsis - Cryptocurrency Prediction Markets on Sui')
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-admin-secret',
        in: 'header',
        description: 'Admin secret key for protected endpoints',
      },
      'admin-key',
    )
    .addTag('Waitlist', 'Waitlist management endpoints')
    .addTag('Portfolio', 'User portfolio and trading history')
    .addTag('Markets', 'Market management and listing')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 Skepsis Backend running on http://localhost:${port}`);
  console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
  console.log(`📊 MongoDB: ${process.env.MONGODB_URI}`);
}

bootstrap();
