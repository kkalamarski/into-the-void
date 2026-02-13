import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router';

const CharacterSelectScreen: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="screen">
      <div className="screen-card">
        <h1 className="screen-title">Character Selection</h1>
        <p className="screen-subtitle">Welcome, {user?.email}</p>

        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-secondary)' }}>
          <p>Character selection will be available in Phase 2.</p>
          <p style={{ marginTop: '10px' }}>For now, you're successfully authenticated!</p>
        </div>

        <button
          onClick={handleLogout}
          className="submit-btn"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default CharacterSelectScreen;
