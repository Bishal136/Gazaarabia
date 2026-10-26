import { apiFetch } from "../api";

export const authService = {
  signup: async (data: {
    name: string; email: string; password: string, role?: string;
    phone?: string;
  }) => {
    const res = await fetch("/api/front-end/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).message);
    return res.json();
  },

  login: async (data: { email: string; password: string, role: string }) => {
    const baseUrl =
      typeof window === "undefined"
        ? process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL
        : "";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window === "undefined") {
      headers["x-internal-auth"] = process.env.NEXTAUTH_SECRET || "internal-auth-secret";
    }

    const res = await fetch(`${baseUrl}/api/front-end/login`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: "Login failed" }));
      throw new Error(errorData.message || "Login failed");
    }

    return res.json();
  },

  getProfile: async (token: string) => {
    const res = await fetch("/api/front-end/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error((await res.json()).message);
    return res.json();
  },



  // Forgot Password API
  forgotPassword: (email: string): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/front-end/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  // Reset Password API
  resetPassword: (token: string, password: string): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/front-end/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),

};
