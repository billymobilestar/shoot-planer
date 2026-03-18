const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export async function apiFetch(
  path: string,
  token: string | null,
  init?: RequestInit
) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}
