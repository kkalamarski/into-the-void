import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  addMute,
  removeMute,
  getMutes,
  addBlock,
  removeBlock,
  getBlocks,
  isCharacterOwnedByAccount,
} from '@into-the-void/database';

@Injectable()
export class ModerationService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async verifyOwnership(accountId: string, characterId: string): Promise<void> {
    const db = this.databaseService.getClient();
    const isOwner = await isCharacterOwnedByAccount(db, characterId, accountId);
    if (!isOwner) {
      throw new ForbiddenException('Character does not belong to this account');
    }
  }

  async addMute(accountId: string, characterId: string, targetCharacterId: string) {
    await this.verifyOwnership(accountId, characterId);

    if (characterId === targetCharacterId) {
      throw new BadRequestException('Cannot mute yourself');
    }

    const db = this.databaseService.getClient();
    return addMute(db, characterId, targetCharacterId);
  }

  async removeMute(accountId: string, characterId: string, targetCharacterId: string) {
    await this.verifyOwnership(accountId, characterId);

    const db = this.databaseService.getClient();
    await removeMute(db, characterId, targetCharacterId);
  }

  async getMutes(accountId: string, characterId: string) {
    await this.verifyOwnership(accountId, characterId);

    const db = this.databaseService.getClient();
    return getMutes(db, characterId);
  }

  async addBlock(accountId: string, characterId: string, targetCharacterId: string) {
    await this.verifyOwnership(accountId, characterId);

    if (characterId === targetCharacterId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const db = this.databaseService.getClient();
    return addBlock(db, characterId, targetCharacterId);
  }

  async removeBlock(accountId: string, characterId: string, targetCharacterId: string) {
    await this.verifyOwnership(accountId, characterId);

    const db = this.databaseService.getClient();
    await removeBlock(db, characterId, targetCharacterId);
  }

  async getBlocks(accountId: string, characterId: string) {
    await this.verifyOwnership(accountId, characterId);

    const db = this.databaseService.getClient();
    return getBlocks(db, characterId);
  }
}
