import { createBrowserRouter } from 'react-router';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Still placeholders for protected routes - will be added in Plan 03
const CharacterSelectPlaceholder = () => <div>Character Select (placeholder)</div>;
const GamePlaceholder = () => <div>Game (placeholder)</div>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WelcomeScreen />,
  },
  {
    path: '/login',
    element: <LoginScreen />,
  },
  {
    path: '/register',
    element: <RegisterScreen />,
  },
  {
    path: '/character-select',
    element: <CharacterSelectPlaceholder />,
  },
  {
    path: '/game',
    element: <GamePlaceholder />,
  },
]);
