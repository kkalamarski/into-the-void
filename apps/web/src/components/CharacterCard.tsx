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

// Faction color mapping for border accents (from world-bible.md lore)
const FACTION_COLORS: Record<string, string> = {
  verdant: '#44cc44',
  helix: '#ff6b35',
  nexus: '#00bfff',
  neutral: '#a0a0a0',
};

// Faction display names
const FACTION_NAMES: Record<string, string> = {
  verdant: 'Verdant Dynamics',
  helix: 'Helix Extraction',
  nexus: 'Nexus Frontiers',
  neutral: 'Unaffiliated',
};

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onSelect,
}) => {
  const factionKey = character.faction.toLowerCase();
  const factionColor = FACTION_COLORS[factionKey] || FACTION_COLORS.neutral;
  const factionName = FACTION_NAMES[factionKey] || character.faction;

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
      <div className="character-faction">{factionName}</div>
      <div className="character-last-played">
        Last played: {formatRelativeTime(character.lastPlayedAt)}
      </div>
    </div>
  );
};
