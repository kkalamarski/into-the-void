import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateCharacterDto } from './dto/character.dto';
import { DatabaseService } from '../database/database.service';
import {
  createCharacter,
  findCharacterById,
  findCharacterByName,
  getAccountCharacters,
  deleteCharacter,
  isCharacterOwnedByAccount,
  createInventory,
} from '@into-the-void/database';

const MAX_CHARACTERS_PER_ACCOUNT = 5;

// Starter kit item definitions (Common rarity, Level 1)
const STARTER_SUIT_ID = 'suit_basic_common';
const STARTER_TOOL_ID = 'tool_universal_common'; // Multi-Tool: works for mining, combat, research

@Injectable()
export class CharactersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getAccountCharacters(accountId: string) {
    const db = this.databaseService.getClient();
    const characters = await getAccountCharacters(db, accountId);

    return characters.map((char) => ({
      id: char.id,
      name: char.name,
      faction: char.factionId,
      level: char.level,
      createdAt: char.createdAt,
      lastPlayedAt: char.lastPlayedAt,
    }));
  }

  async getCharacter(accountId: string, characterId: string) {
    const db = this.databaseService.getClient();

    // Verify ownership
    const isOwner = await isCharacterOwnedByAccount(db, characterId, accountId);
    if (!isOwner) {
      throw new ForbiddenException('Character does not belong to this account');
    }

    const character = await findCharacterById(db, characterId);
    if (!character) {
      throw new NotFoundException('Character not found');
    }

    return {
      id: character.id,
      name: character.name,
      faction: character.factionId,
      level: character.level,
      xp: character.xp,
      health: character.health,
      maxHealth: character.maxHealth,
      position: character.position,
      stats: character.stats,
      createdAt: character.createdAt,
      lastPlayedAt: character.lastPlayedAt,
    };
  }

  async createCharacter(accountId: string, dto: CreateCharacterDto) {
    const db = this.databaseService.getClient();

    // Check character limit
    const existingCharacters = await getAccountCharacters(db, accountId);
    if (existingCharacters.length >= MAX_CHARACTERS_PER_ACCOUNT) {
      throw new ConflictException(
        `Maximum of ${MAX_CHARACTERS_PER_ACCOUNT} characters allowed per account`
      );
    }

    // Check if name is taken
    const existingName = await findCharacterByName(db, dto.name);
    if (existingName) {
      throw new ConflictException('Character name already taken');
    }

    // Create character
    const character = await createCharacter(db, {
      accountId,
      name: dto.name,
      factionId: dto.faction,
    });

    // Create inventory for character with starter kit
    await createInventory(db, {
      characterId: character.id,
      equipment: {
        exosuit: {
          instanceId: randomUUID(),
          itemId: STARTER_SUIT_ID,
          quantity: 1,
          slot: -1, // equipped, not in inventory grid
          properties: {},
        },
        modules: [],
        tool: {
          instanceId: randomUUID(),
          itemId: STARTER_TOOL_ID,
          quantity: 1,
          slot: -1, // equipped, not in inventory grid
          properties: {},
        },
      },
    });

    return {
      id: character.id,
      name: character.name,
      faction: character.factionId,
      level: character.level,
      createdAt: character.createdAt,
    };
  }

  async deleteCharacter(accountId: string, characterId: string) {
    const db = this.databaseService.getClient();

    // Verify ownership
    const isOwner = await isCharacterOwnedByAccount(db, characterId, accountId);
    if (!isOwner) {
      throw new ForbiddenException('Character does not belong to this account');
    }

    await deleteCharacter(db, characterId);
  }
}
