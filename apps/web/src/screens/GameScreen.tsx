import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/authStore';
import { useCharacterStore } from '../store/characterStore';
import { useGameStore } from '../store/gameStore';
import { gameSocket } from '../network/socket';
import { ErrorCodeInfo, getErrorInfo } from '@into-the-void/shared-types';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorModal } from '../components/ErrorModal';
import GameContainer from '../components/GameContainer';

const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<ErrorCodeInfo | null>(null);

  // Get from stores
  const { token } = useAuthStore();
  const { selectedCharacterId } = useCharacterStore();
  const { loadingStage, setLoadingStage, setLoadingProgress, setPlayer, setConnectionState } = useGameStore();

  // Connection flow
  useEffect(() => {
    const connect = async () => {
      // Validate we have auth data
      if (!token || !selectedCharacterId) {
        navigate('/character-select');
        return;
      }

      try {
        // Stage 1: Connecting (0-20%)
        setLoadingStage('connecting');
        setLoadingProgress(10);

        const serverUrl = import.meta.env.VITE_GAME_SERVER_URL || 'http://localhost:3001';
        gameSocket.connect(serverUrl);

        // Listen for connection state changes
        gameSocket.onConnectionStateChange((state) => {
          setConnectionState(state);
        });

        setLoadingProgress(20);

        // Stage 2: Authenticating (20-40%)
        setLoadingStage('authenticating');
        setLoadingProgress(30);

        const player = await gameSocket.authenticate(token, selectedCharacterId);
        setPlayer(player);
        setLoadingProgress(40);

        // Stage 3: Loading world (40-90%)
        setLoadingStage('loading-world');
        // zone:state event listener (Task 1) will receive initial game state
        // and update loadingProgress to 80%
        setLoadingProgress(70);

        // Wait for zone:state to be received (Brief delay for event processing)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Stage 4: Spawning (90-100%)
        setLoadingStage('spawning');
        setLoadingProgress(90);

        // Brief delay for visual completion
        await new Promise(resolve => setTimeout(resolve, 500));

        setLoadingProgress(100);
        setLoadingStage('ready');

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Connection failed';

        // Map error to ErrorCodeInfo
        if (message.includes('timeout')) {
          setError(getErrorInfo('AUTH_TIMEOUT'));
        } else if (message.includes('token') || message.includes('Authentication')) {
          setError(getErrorInfo('AUTH_FAILED'));
        } else if (message.includes('Character')) {
          setError(getErrorInfo('INVALID_CHARACTER'));
        } else {
          setError(getErrorInfo('SERVER_ERROR'));
        }
      }
    };

    connect();

    return () => {
      // Cleanup on unmount
      gameSocket.disconnect();
      setLoadingStage('idle');
    };
  }, [token, selectedCharacterId, navigate, setLoadingStage, setLoadingProgress, setPlayer, setConnectionState]);

  // Handle error actions
  const handleErrorAction = () => {
    if (!error) return;

    switch (error.action) {
      case 'redirect-login':
        navigate('/login', { state: { error: error.message } });
        break;
      case 'redirect-characters':
        navigate('/character-select', { state: { error: error.message } });
        break;
      case 'retry':
        setError(null);
        window.location.reload(); // Simple retry
        break;
      default:
        setError(null);
    }
  };

  return (
    <>
      {error && (
        <ErrorModal error={error} onRetry={handleErrorAction} />
      )}

      {loadingStage !== 'ready' && loadingStage !== 'idle' && !error && (
        <LoadingScreen />
      )}

      {loadingStage === 'ready' && (
        <GameContainer />
      )}
    </>
  );
};

export default GameScreen;
