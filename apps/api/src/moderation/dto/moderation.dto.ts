import { IsUUID } from 'class-validator';

export class CreateMuteDto {
  @IsUUID()
  characterId!: string;

  @IsUUID()
  targetCharacterId!: string;
}

export class CreateBlockDto {
  @IsUUID()
  characterId!: string;

  @IsUUID()
  targetCharacterId!: string;
}
