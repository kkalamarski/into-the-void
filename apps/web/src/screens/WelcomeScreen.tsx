import React from 'react';
import { Link } from 'react-router';
import '../styles/screens.css';

const WelcomeScreen: React.FC = () => {
  return (
    <div className="screen">
      <div className="screen-card">
        <div className="game-logo">INTO THE VOID</div>
        <p className="screen-subtitle">Begin your journey</p>
        <div className="welcome-buttons">
          <Link to="/login" className="welcome-btn welcome-btn-primary">
            Login
          </Link>
          <Link to="/register" className="welcome-btn welcome-btn-secondary">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
