import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { ZonesModule } from '../zones/zones.module';

@Module({
  imports: [ZonesModule],
  providers: [GameGateway, GameService, PlayerService],
  exports: [GameService, PlayerService],
})
export class GameModule {}
