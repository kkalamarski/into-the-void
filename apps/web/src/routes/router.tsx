import { createBrowserRouter, redirect } from 'react-router';
import { useAuthStore } from '../store/authStore';
import { useCharacterStore } from '../store/characterStore';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CharacterSelectScreen, { loader as characterSelectLoader } from '../screens/CharacterSelectScreen';
import CharacterCreateScreen, { action as characterCreateAction } from '../screens/CharacterCreateScreen';
import GameScreen from '../screens/GameScreen';

// Loader for protected routes - redirects to login if not authenticated
function protectedLoader() {
  const { token } = useAuthStore.getState();
  if (!token) {
    throw redirect('/login');
  }
  return null;
}

// Loader for auth screens - redirects to character-select if already authenticated
function authScreenLoader() {
  const { token } = useAuthStore.getState();
  if (token) {
    throw redirect('/character-select');
  }
  return null;
}

// Loader for game screen - checks auth and character selection
function gameScreenLoader() {
  const { token } = useAuthStore.getState();
  const { selectedCharacterId } = useCharacterStore.getState();

  if (!token) {
    throw redirect('/login');
  }
  if (!selectedCharacterId) {
    throw redirect('/character-select');
  }
  return null;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WelcomeScreen />,
  },
  {
    path: '/login',
    loader: authScreenLoader,
    element: <LoginScreen />,
  },
  {
    path: '/register',
    loader: authScreenLoader,
    element: <RegisterScreen />,
  },
  {
    path: '/character-select',
    loader: async () => {
      // First check auth
      const { token } = useAuthStore.getState();
      if (!token) {
        throw redirect('/login');
      }
      // Then load characters
      return characterSelectLoader();
    },
    element: <CharacterSelectScreen />,
  },
  {
    path: '/character-create',
    loader: protectedLoader,
    action: characterCreateAction,
    element: <CharacterCreateScreen />,
  },
  {
    path: '/game',
    loader: gameScreenLoader,
    element: <GameScreen />,
  },
]);
