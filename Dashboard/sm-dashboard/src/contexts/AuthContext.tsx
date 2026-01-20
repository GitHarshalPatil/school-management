import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { authService } from '../services/authService';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout: 15 minutes (900000 ms)
const SESSION_TIMEOUT = 15 * 60 * 1000;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if token is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch {
      return true;
    }
  };

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      // 15 minutes of inactivity - logout
      handleAutoLogout();
    }, SESSION_TIMEOUT);
  };

  // Handle auto logout
  const handleAutoLogout = () => {
    authService.logout();
    setUser(null);
    window.location.href = '/login';
  };

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (user) {
        resetInactivityTimer();
      }
    };

    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = authService.getStoredUser();
      const accessToken = sessionStorage.getItem('accessToken');
      const refreshToken = sessionStorage.getItem('refreshToken');

      // If no tokens or user, clear everything
      if (!accessToken || !refreshToken || !storedUser) {
        authService.logout();
        setIsLoading(false);
        return;
      }

      // Check if access token is expired
      if (isTokenExpired(accessToken)) {
        // Try to refresh token
        try {
          const response = await authService.refreshToken(refreshToken);
          sessionStorage.setItem('accessToken', response.accessToken);
          // If refresh token is also expired, it will throw error
          setUser(storedUser);
          resetInactivityTimer();
        } catch (error) {
          // Refresh failed - logout
          authService.logout();
        }
      } else {
        // Token is valid
        setUser(storedUser);
        resetInactivityTimer();
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    authService.storeUser(response.user, response.tokens);
    setUser(response.user);
    resetInactivityTimer();
  };

  const logout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    authService.logout();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

