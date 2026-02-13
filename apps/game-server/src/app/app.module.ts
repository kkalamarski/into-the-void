import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from '../game/game.module';
import { ZonesModule } from '../zones/zones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    GameModule,
    ZonesModule,
  ],
})
export class AppModule {}
