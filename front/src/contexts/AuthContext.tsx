import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextValue {
  token: string | null;
  user: { id?: string; username?: string } | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthContextValue['user']>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = (newToken: string) => {
    setToken(newToken);
    // 如需从token解析用户信息，可在此扩展
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value: AuthContextValue = { token, user, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth必须在AuthProvider中使用');
  return ctx;
}