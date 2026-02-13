import { createBrowserRouter, redirect } from 'react-router';
import { useAuthStore } from '../store/authStore';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CharacterSelectScreen, { loader as characterSelectLoader } from '../screens/CharacterSelectScreen';
import GameContainer from '../components/GameContainer';

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
    path: '/game',
    loader: protectedLoader,
    element: <GameContainer />,
  },
]);
