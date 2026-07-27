import { useState, useEffect, useCallback } from "react";

export interface User {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  province?: string;
  industry?: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  isAdmin: boolean;
  token: string | null;
}

export function useAuth(): AuthState & {
  login: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => void;
} {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    const user = userStr ? (JSON.parse(userStr) as User) : null;
    return {
      isLoggedIn: !!token,
      user,
      isAdmin: user?.role === "admin",
      token,
    };
  });

  useEffect(() => {
    const handleStorage = () => {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      const user = userStr ? (JSON.parse(userStr) as User) : null;
      setState({
        isLoggedIn: !!token,
        user,
        isAdmin: user?.role === "admin",
        token,
      });
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = useCallback((token: string, user: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setState({
      isLoggedIn: true,
      user,
      isAdmin: user.role === "admin",
      token,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setState({
      isLoggedIn: false,
      user: null,
      isAdmin: false,
      token: null,
    });
  }, []);

  const refresh = useCallback(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    const user = userStr ? (JSON.parse(userStr) as User) : null;
    setState({
      isLoggedIn: !!token,
      user,
      isAdmin: user?.role === "admin",
      token,
    });
  }, []);

  return { ...state, login, logout, refresh };
}
