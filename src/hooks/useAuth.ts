"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SafeUser } from "@/types";

export function useAuth() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    let done = false;
    const timeout = setTimeout(() => {
      if (done) return;
      done = true;
      setLoading(false);
      setUser(null);
    }, 10000);

    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (done) return;
      if (data.success) {
        setUser(data.data);
      } else {
        setUser(null);
      }
    } catch {
      if (!done) setUser(null);
    } finally {
      done = true;
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/me", { method: "DELETE" });
    } catch {}
    setUser(null);
    router.push("/login");
  }, [router]);

  return { user, loading, logout, refetch: fetchUser };
}
