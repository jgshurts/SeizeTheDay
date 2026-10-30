import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import { api, clearToken, getToken, setToken } from "../lib/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signInWithToken: (token: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first mount, rehydrate the session from a token already in
  // sessionStorage and resolve /auth/me to populate the user.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }

    api
      .get<User>("/auth/me")
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  async function signInWithToken(token: string) {
    setToken(token);
    try {
      setUser(await api.get<User>("/auth/me"));
    } catch (err) {
      clearToken();
      throw err;
    }
  }

  async function login(identifier: string, password: string) {
    const { token } = await api.post<{ token: string }>("/auth/login", { identifier, password });
    await signInWithToken(token);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signInWithToken, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
