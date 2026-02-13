import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for WebSocket
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.GAME_SERVER_PORT || 3001;
  await app.listen(port);

  console.log(`Game server running on http://localhost:${port}`);
}

bootstrap();
