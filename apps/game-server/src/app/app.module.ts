import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { GameModule } from '../game/game.module';
import { ZonesModule } from '../zones/zones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    GameModule,
    ZonesModule,
  ],
})
export class AppModule {}
