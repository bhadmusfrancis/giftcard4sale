"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, setToken, clearToken, getToken } from "./api";

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: "USER" | "ADMIN";
  emailVerified: boolean;
  goodScore: number;
  badScore: number;
  trustLevel: number;
  referralCode: string;
  balanceUsdt: number;
  balanceNgn: number;
  balanceGhs: number;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    displayName?: string;
    referralCode?: string;
    acceptTerms: boolean;
  }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await api<{ user: User }>("/auth/me");
      setUser(user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await api<{ token: string; user: User }>("/auth/login", {
      body: { email, password },
    });
    setToken(token);
    setUser(user);
    return user;
  }

  async function register(data: {
    email: string;
    password: string;
    displayName?: string;
    referralCode?: string;
    acceptTerms: boolean;
  }) {
    const { token, user } = await api<{ token: string; user: User }>("/auth/register", { body: data });
    setToken(token);
    setUser(user);
    return user;
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
