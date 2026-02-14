import { useAuthStore } from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = useAuthStore.getState().token;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
