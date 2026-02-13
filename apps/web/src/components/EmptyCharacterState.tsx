import React from 'react';
import { Link } from 'react-router';
import '../styles/characters.css';

export const EmptyCharacterState: React.FC = () => {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">👤</div>
      <h2 className="empty-state-title">No Characters Yet</h2>
      <p className="empty-state-description">
        Create your first character to begin your adventure into the void
      </p>
      <Link to="/character-create" className="btn-primary">
        Create Character
      </Link>
    </div>
  );
};
