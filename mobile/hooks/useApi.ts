import { useAuth } from "@clerk/clerk-expo";
import { useCallback } from "react";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export function useApi() {
  const { getToken } = useAuth();

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init?.headers || {}),
        },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text}`);
      }
      return res.json();
    },
    [getToken]
  );

  return { request };
}
