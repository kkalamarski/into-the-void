import React from 'react';
import { formatRelativeTime } from '../utils/dateFormat';
import '../styles/characters.css';

interface Character {
  id: string;
  name: string;
  faction: string;
  level: number;
  lastPlayedAt: string | null;
}

interface CharacterCardProps {
  character: Character;
  onSelect: (id: string) => void;
}

// Faction color mapping for border accents
const FACTION_COLORS: Record<string, string> = {
  dominion: '#7b68ee',
  frontier: '#44ff44',
  collective: '#00bfff',
  neutral: '#a0a0a0',
};

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onSelect,
}) => {
  const factionColor = FACTION_COLORS[character.faction.toLowerCase()] || FACTION_COLORS.neutral;

  const handleClick = () => {
    onSelect(character.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(character.id);
    }
  };

  return (
    <div
      className="character-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      style={{
        borderLeftColor: factionColor,
        borderLeftWidth: '4px',
      }}
    >
      <div className="character-card-header">
        <h3 className="character-name">{character.name}</h3>
        <span className="character-level">Lv {character.level}</span>
      </div>
      <div className="character-faction">{character.faction}</div>
      <div className="character-last-played">
        Last played: {formatRelativeTime(character.lastPlayedAt)}
      </div>
    </div>
  );
};
