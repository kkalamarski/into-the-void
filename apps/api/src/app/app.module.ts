import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CharactersModule } from '../characters/characters.module';
import { ModerationModule } from '../moderation/moderation.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    CharactersModule,
    ModerationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
