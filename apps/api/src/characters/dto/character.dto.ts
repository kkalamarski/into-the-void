import { IsString, MinLength, MaxLength, Matches, IsIn } from 'class-validator';

export class CreateCharacterDto {
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters' })
  @MaxLength(20, { message: 'Name must be at most 20 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Name can only contain letters, numbers, and underscores',
  })
  name!: string;

  @IsIn(['dominion', 'frontier', 'collective', 'neutral'], {
    message: 'Invalid faction',
  })
  faction!: string;
}
