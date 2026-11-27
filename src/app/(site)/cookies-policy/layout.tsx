import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Cookies Policy — UK Privacy & Tracking Preferences",
  description:
    "Understand how Gazaarabia uses essential, analytics, and marketing cookies across our UK modest fashion marketplace and how you can manage your consent.",
  path: "/cookies-policy",
  ogTitle: "Cookies Policy | GAZAARABIA",
  ogDescription:
    "How Gazaarabia uses cookies and how to manage your privacy settings.",
});

export default function CookiesPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
