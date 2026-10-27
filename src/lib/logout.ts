import { signOut } from "next-auth/react";
import { ROUTES } from "@/constants/routes";

export interface LogoutOptions {
  /**
   * The destination URL to navigate to after logging out.
   * Defaults to "/account/login".
   */
  callbackUrl?: string;
  /**
   * Whether NextAuth should handle the redirect automatically.
   * Defaults to true.
   */
  redirect?: boolean;
}

/**
 * Universal logout handler for all user types (Customer, Seller, Admin, Affiliate, Ambassador, etc.).
 *
 * Responsibilities:
 * 1. Purges client-side authentication tokens, cached user objects, and session markers from localStorage & sessionStorage.
 * 2. Invalidates legacy direct auth cookies.
 * 3. Triggers NextAuth signOut to revoke session cookies.
 * 4. Redirects the user directly to the unified login page at /account/login.
 */
export async function logoutUser(options?: LogoutOptions): Promise<void> {
  const targetUrl = options?.callbackUrl || ROUTES.USER.LOGIN || "/account/login";
  const shouldRedirect = options?.redirect ?? true;

  if (typeof window !== "undefined") {
    try {
      // 1. Purge sessionStorage completely
      window.sessionStorage?.clear();

      // 2. Remove known auth items from localStorage
      const authKeysToRemove = [
        "auth_token",
        "token",
        "accessToken",
        "refreshToken",
        "user",
        "user_role",
        "user_email",
        "gaza_arabia_remember_content_manager",
        "gaza_arabia_remember_unified",
      ];

      for (const key of authKeysToRemove) {
        try {
          window.localStorage?.removeItem(key);
        } catch {
          // Ignore isolated storage exceptions
        }
      }

      // 3. Clear direct auth cookies if set
      const expiredSuffix = "=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
      document.cookie = `auth_token${expiredSuffix}`;
      document.cookie = `token${expiredSuffix}`;
      document.cookie = `accessToken${expiredSuffix}`;
      document.cookie = `refreshToken${expiredSuffix}`;
    } catch (storageError) {
      console.warn("Storage cleanup notice during logout:", storageError);
    }
  }

  // 4. Invalidate NextAuth session and redirect to /account/login
  try {
    await signOut({
      callbackUrl: targetUrl,
      redirect: shouldRedirect,
    });
  } catch (error) {
    console.error("NextAuth signOut error, falling back to direct navigation:", error);
    if (typeof window !== "undefined" && shouldRedirect) {
      window.location.href = targetUrl;
    }
  }
}
