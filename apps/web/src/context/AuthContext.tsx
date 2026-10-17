import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ApiResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kasbareng_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on load
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json: ApiResponse<User> = await res.json();
        if (res.ok && json.data) {
          setUser(json.data);
        } else {
          // Token expired or invalid
          setToken(null);
          setUser(null);
          localStorage.removeItem('kasbareng_token');
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json: ApiResponse<{ user: User; token: string }> = await res.json();

    if (!res.ok || !json.data) {
      throw new Error(json.error?.message || 'Gagal masuk akun. Periksa kembali email dan kata sandi.');
    }

    localStorage.setItem('kasbareng_token', json.data.token);
    setToken(json.data.token);
    setUser(json.data.user);
  };

  const register = async (fullName: string, email: string, password: string) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password }),
    });

    const json: ApiResponse<{ user: User; token: string }> = await res.json();

    if (!res.ok || !json.data) {
      throw new Error(json.error?.message || 'Pendaftaran gagal. Silakan coba kembali.');
    }

    localStorage.setItem('kasbareng_token', json.data.token);
    setToken(json.data.token);
    setUser(json.data.user);
  };

  const logout = () => {
    localStorage.removeItem('kasbareng_token');
    localStorage.removeItem('kasbareng_active_wallet_id');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}