import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: { username: string; email: string; password: string; displayName: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check persistent authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await apiClient.get('/auth/me');
          if (response.data && response.data.success && response.data.data.user) {
            setUser(response.data.data.user);
            setAccessToken(token);
            setIsAuthenticated(true);
          } else {
            logout();
          }
        } catch (error) {
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data && response.data.success) {
        const { accessToken: token, user: userData } = response.data.data;
        localStorage.setItem('accessToken', token);
        setAccessToken(token);
        setUser(userData);
        setIsAuthenticated(true);
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Invalid credentials';
      return { success: false, message: errMsg };
    }
  };

  const register = async (data: { username: string; email: string; password: string; displayName: string }) => {
    try {
      const response = await apiClient.post('/auth/register', data);
      if (response.data && response.data.success) {
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message || 'Registration failed' };
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Registration failed';
      return { success: false, message: errMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
