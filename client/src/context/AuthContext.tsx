import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import { api, clearToken, setToken } from "../lib/api";

interface AuthContextValue {
  user: User | null;
  login: (nickname: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_KEY = "std_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  });

  async function login(nickname: string, password: string) {
    const { token, user: loggedInUser } = await api.post<{ token: string; user: User }>(
      "/auth/login",
      { nickname, password },
    );
    setToken(token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  function logout() {
    clearToken();
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
