import { createBrowserRouter } from 'react-router';

// Placeholder components - will be replaced in Plan 02
const WelcomePlaceholder = () => <div>Welcome Screen (placeholder)</div>;
const LoginPlaceholder = () => <div>Login Screen (placeholder)</div>;
const RegisterPlaceholder = () => <div>Register Screen (placeholder)</div>;
const CharacterSelectPlaceholder = () => <div>Character Select (placeholder)</div>;
const GamePlaceholder = () => <div>Game (placeholder)</div>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <WelcomePlaceholder />,
  },
  {
    path: '/login',
    element: <LoginPlaceholder />,
  },
  {
    path: '/register',
    element: <RegisterPlaceholder />,
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
