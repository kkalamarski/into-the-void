import React from 'react';
import { useNavigate } from 'react-router';
import { ErrorCodeInfo } from '@into-the-void/shared-types';

interface ErrorModalProps {
  error: {
    code: string;      // E-XXXX
    message: string;   // User-friendly message
    action: 'redirect-login' | 'redirect-characters' | 'retry' | 'none';
  };
  onRetry?: () => void;
  onClose?: () => void;
}

export function ErrorModal({ error, onRetry, onClose }: ErrorModalProps) {
  const navigate = useNavigate();

  const handleAction = () => {
    switch (error.action) {
      case 'redirect-login':
        navigate('/login');
        break;
      case 'redirect-characters':
        navigate('/character-select');
        break;
      case 'retry':
        if (onRetry) {
          onRetry();
        }
        break;
      case 'none':
        if (onClose) {
          onClose();
        }
        break;
    }
  };

  const getButtonText = (): string => {
    switch (error.action) {
      case 'redirect-login':
        return 'Go to Login';
      case 'redirect-characters':
        return 'Select Character';
      case 'retry':
        return 'Try Again';
      case 'none':
        return 'Close';
    }
  };

  return (
    <div className="error-modal-overlay">
      <div className="error-modal">
        <div className="error-modal-icon">⚠</div>
        <div className="error-modal-message">{error.message}</div>
        <div className="error-modal-code">({error.code})</div>
        <button
          className="error-modal-button"
          onClick={handleAction}
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
}
