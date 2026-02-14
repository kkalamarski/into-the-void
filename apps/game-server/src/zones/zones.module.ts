import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZonesService } from './zones.service';

@Module({
  imports: [ConfigModule],
  providers: [ZonesService],
  exports: [ZonesService],
})
export class ZonesModule {}
