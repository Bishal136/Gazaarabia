function getBaseUrl(): string {
  // In the browser, ALWAYS use relative URLs so requests hit the current host/protocol/port
  if (typeof window !== "undefined") {
    return "";
  }
  // Server-side (Node.js SSR / Server Components / background actions):
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL;
  }
  const port = process.env.PORT || 3000;
  return `http://127.0.0.1:${port}`;
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
  token?: string      // ✅ Accept token as optional third argument
): Promise<T> {
  const baseUrl = getBaseUrl();
  const fullUrl = url.startsWith("http://") || url.startsWith("https://") ? url : `${baseUrl}${url}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),  // ✅ use token if provided
      ...options?.headers,
    },
    cache: "no-store",
  });

  let result: any = null;
  try {
    result = await res.json();
  } catch {
    result = {};
  }

  if (!res.ok) {
    const message =
      result?.message ||
      result?.error ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return result;
}
