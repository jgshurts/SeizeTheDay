import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";
import { api, clearToken, getToken, setToken } from "../lib/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On first mount, either pick up a fresh token from the OAuth callback
  // redirect (?token=...) or rehydrate the session from one already in
  // sessionStorage, then resolve /auth/me to populate the user.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectToken = params.get("token");
    if (redirectToken) {
      setToken(redirectToken);
      params.delete("token");
      const rest = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (rest ? `?${rest}` : ""));
    }

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

  function loginWithGoogle() {
    window.location.href = "/api/auth/google/start";
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
