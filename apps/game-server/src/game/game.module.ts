import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { InventoryService } from './inventory.service';
import { StorageService } from './storage.service';
import { EntityService } from './entity.service';
import { AiService } from './ai.service';
import { ZonesModule } from '../zones/zones.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret-change-in-production'),
      }),
      inject: [ConfigService],
    }),
    ZonesModule,
  ],
  providers: [GameGateway, GameService, PlayerService, InventoryService, StorageService, EntityService, AiService],
  exports: [GameService, PlayerService, InventoryService, StorageService, EntityService, AiService],
})
export class GameModule {}
