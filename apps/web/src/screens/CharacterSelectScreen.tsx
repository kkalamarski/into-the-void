import React from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/authStore';
import { useCharacterStore } from '../store/characterStore';
import { apiCall } from '../utils/api';
import { CharacterCard } from '../components/CharacterCard';
import { EmptyCharacterState } from '../components/EmptyCharacterState';
import '../styles/screens.css';
import '../styles/characters.css';

interface Character {
  id: string;
  name: string;
  faction: string;
  level: number;
  lastPlayedAt: string | null;
}

interface LoaderData {
  characters: Character[];
}

export async function loader(): Promise<LoaderData> {
  try {
    const characters = await apiCall<Character[]>('/characters');
    return { characters };
  } catch (error) {
    throw new Response('Failed to load characters', { status: 500 });
  }
}

interface CharacterSelectScreenProps {
  loaderData: LoaderData;
}

const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
  loaderData,
}) => {
  const { user, logout } = useAuthStore();
  const { selectCharacter } = useCharacterStore();
  const navigate = useNavigate();
  const { characters } = loaderData;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCharacterSelect = (characterId: string) => {
    selectCharacter(characterId);
    navigate('/game');
  };

  return (
    <div className="character-select-container">
      <div className="character-header">
        <div>
          <h1 className="screen-title">Select Character</h1>
          <p className="screen-subtitle">Welcome back, {user?.email}</p>
        </div>
        <button onClick={handleLogout} className="btn-secondary">
          Logout
        </button>
      </div>

      {characters.length === 0 ? (
        <EmptyCharacterState />
      ) : (
        <div className="character-grid">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onSelect={handleCharacterSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CharacterSelectScreen;
