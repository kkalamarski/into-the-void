import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { InventoryService } from './inventory.service';
import { StorageService } from './storage.service';
import { EntityService } from './entity.service';
import { AiService } from './ai.service';
import { CombatService } from './combat.service';
import { TradeService } from './trade.service';
import { AbilityService } from './ability.service';
import { QuestService } from './quest.service';
import { DiscoveryService } from './discovery.service';
import { ZonesModule } from '../zones/zones.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
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
  providers: [GameGateway, GameService, PlayerService, InventoryService, StorageService, EntityService, AiService, CombatService, TradeService, AbilityService, QuestService, DiscoveryService],
  exports: [GameService, PlayerService, InventoryService, StorageService, EntityService, AiService, CombatService, TradeService, AbilityService, QuestService, DiscoveryService],
})
export class GameModule {}
