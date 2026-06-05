import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { parseJwt } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem("token"));

  const setToken = useCallback((t) => {
    if (t) {
      localStorage.setItem("token", t);
    } else {
      localStorage.removeItem("token");
    }
    setTokenState(t);
  }, []);

  const logout = useCallback(() => setToken(null), [setToken]);

  const payload = useMemo(() => (token ? parseJwt(token) : null), [token]);
  const role = payload?.role ?? null;
  const userId = payload?.user_id ?? null;
  const userName = payload?.name ?? null;

  const value = useMemo(
    () => ({
      token,
      setToken,
      logout,
      role,
      userId,
      userName,
      payload,
    }),
    [token, setToken, logout, role, userId, userName, payload]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
