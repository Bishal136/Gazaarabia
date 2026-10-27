import { apiFetch } from "../api";

export const authService = {
  signup: async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    phone?: string;
    shopName?: string;
    website?: string;
  }) => {
    const res = await fetch("/api/front-end/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({ message: "Signup failed" }));
    if (!res.ok) {
      const detailedError =
        Array.isArray(result.errors) && result.errors.length > 0
          ? result.errors.join(". ")
          : result.message || "Signup failed";
      throw new Error(detailedError);
    }
    return result;
  },

  verifyOtp: async (data: { email: string; otp: string }) => {
    const res = await fetch("/api/front-end/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({ message: "OTP verification failed" }));
    if (!res.ok) throw new Error(result.message || "OTP verification failed");
    return result;
  },

  resendOtp: async (data: { email: string }) => {
    const res = await fetch("/api/front-end/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({ message: "Failed to resend code" }));
    if (!res.ok) throw new Error(result.message || "Failed to resend code");
    return result;
  },

  login: async (data: { email: string; password: string; role?: string }) => {
    const baseUrl =
      typeof window === "undefined"
        ? process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || ""
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
      const err: any = new Error(errorData.message || "Login failed");
      err.requiresOtp = errorData.requiresOtp;
      err.email = errorData.email;
      throw err;
    }

    return res.json();
  },

  getProfile: async (token: string) => {
    const res = await fetch("/api/front-end/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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

  // Universal Logout API
  logout: async (callbackUrl?: string) => {
    const { logoutUser } = await import("@/lib/logout");
    return logoutUser({ callbackUrl });
  },
};
