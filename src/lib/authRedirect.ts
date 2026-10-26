import { ROUTES } from "@/constants/routes";

/**
 * Determines the target dashboard route based on the authenticated user's role.
 */
export function getRedirectUrlByRole(
  role: string | undefined | null,
  callbackUrl?: string | null
): string {
  const normalizedRole = (role || "customer").toLowerCase().trim();

  // If callbackUrl is provided and safe (relative path, not an auth loop)
  if (
    callbackUrl &&
    callbackUrl.startsWith("/") &&
    !callbackUrl.includes("/login") &&
    !callbackUrl.includes("/register")
  ) {
    if (normalizedRole === "customer") {
      return callbackUrl;
    }
  }

  switch (normalizedRole) {
    case "admin":
      return ROUTES.ADMIN.DASHBOARD || "/admin";
    case "seller":
      return ROUTES.SELLER.DASHBOARD || "/seller";
    case "affiliate":
    case "ambassador":
      return ROUTES.AFFILIATE.DASHBOARD || "/affiliate";
    case "content_manager":
      return "/admin/blogs";
    case "customer":
    default:
      return callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.includes("/login")
        ? callbackUrl
        : ROUTES.USER.PROFILE || "/account/details";
  }
}
