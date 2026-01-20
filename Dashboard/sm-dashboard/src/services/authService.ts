import api from '../config/api';
import type { User, LoginCredentials, LoginResponse } from '../types';

export type { User, LoginCredentials, LoginResponse };

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await api.post('/api/auth/login', credentials);
    return response.data.data;
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await api.post('/api/auth/refresh', { refreshToken });
    return response.data.data;
  },

  logout() {
    // Clear sessionStorage (tokens)
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('loginTime');
    // Clear localStorage (user info)
    localStorage.removeItem('user');
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  storeUser(user: User, tokens: { accessToken: string; refreshToken: string }) {
    // Store user in localStorage (for display purposes, not security)
    localStorage.setItem('user', JSON.stringify(user));
    // Store tokens in sessionStorage (cleared on browser close)
    sessionStorage.setItem('accessToken', tokens.accessToken);
    sessionStorage.setItem('refreshToken', tokens.refreshToken);
    sessionStorage.setItem('loginTime', Date.now().toString());
  },

  // Check if token is expired
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch {
      return true;
    }
  },
};

