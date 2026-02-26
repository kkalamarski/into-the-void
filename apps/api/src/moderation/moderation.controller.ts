import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { CreateMuteDto, CreateBlockDto } from './dto/moderation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  // --- Mutes ---

  @Post('mutes')
  async addMute(
    @Request() req: { user: { accountId: string } },
    @Body() dto: CreateMuteDto
  ) {
    return this.moderationService.addMute(
      req.user.accountId,
      dto.characterId,
      dto.targetCharacterId
    );
  }

  @Get('mutes/:characterId')
  async getMutes(
    @Request() req: { user: { accountId: string } },
    @Param('characterId', ParseUUIDPipe) characterId: string
  ) {
    return this.moderationService.getMutes(req.user.accountId, characterId);
  }

  @Delete('mutes/:characterId/:targetCharacterId')
  async removeMute(
    @Request() req: { user: { accountId: string } },
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('targetCharacterId', ParseUUIDPipe) targetCharacterId: string
  ) {
    await this.moderationService.removeMute(
      req.user.accountId,
      characterId,
      targetCharacterId
    );
    return { message: 'Mute removed' };
  }

  // --- Blocks ---

  @Post('blocks')
  async addBlock(
    @Request() req: { user: { accountId: string } },
    @Body() dto: CreateBlockDto
  ) {
    return this.moderationService.addBlock(
      req.user.accountId,
      dto.characterId,
      dto.targetCharacterId
    );
  }

  @Get('blocks/:characterId')
  async getBlocks(
    @Request() req: { user: { accountId: string } },
    @Param('characterId', ParseUUIDPipe) characterId: string
  ) {
    return this.moderationService.getBlocks(req.user.accountId, characterId);
  }

  @Delete('blocks/:characterId/:targetCharacterId')
  async removeBlock(
    @Request() req: { user: { accountId: string } },
    @Param('characterId', ParseUUIDPipe) characterId: string,
    @Param('targetCharacterId', ParseUUIDPipe) targetCharacterId: string
  ) {
    await this.moderationService.removeBlock(
      req.user.accountId,
      characterId,
      targetCharacterId
    );
    return { message: 'Block removed' };
  }
}
