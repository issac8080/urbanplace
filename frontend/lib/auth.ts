"use client";

import { useEffect, useState } from "react";
import type { User } from "./api";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const setUserAndToken = (u: User, token: string) => {
    setUser(u);
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(u));
      localStorage.setItem("token", token);
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  };

  return { user, loading, setUserAndToken, logout };
}
