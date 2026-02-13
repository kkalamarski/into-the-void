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
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/character.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('characters')
@UseGuards(JwtAuthGuard)
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  async getCharacters(@Request() req: { user: { accountId: string } }) {
    return this.charactersService.getAccountCharacters(req.user.accountId);
  }

  @Get(':id')
  async getCharacter(
    @Request() req: { user: { accountId: string } },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.charactersService.getCharacter(req.user.accountId, id);
  }

  @Post()
  async createCharacter(
    @Request() req: { user: { accountId: string } },
    @Body() dto: CreateCharacterDto
  ) {
    return this.charactersService.createCharacter(req.user.accountId, dto);
  }

  @Delete(':id')
  async deleteCharacter(
    @Request() req: { user: { accountId: string } },
    @Param('id', ParseUUIDPipe) id: string
  ) {
    await this.charactersService.deleteCharacter(req.user.accountId, id);
    return { message: 'Character deleted successfully' };
  }
}
