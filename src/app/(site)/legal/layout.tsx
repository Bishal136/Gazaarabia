import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Legal, Privacy & Customer Rights Hub",
  description:
    "Access all Gazaarabia legal documentation including Privacy Policy, Cookies Policy, Returns & Exchanges, and Terms & Conditions.",
  path: "/legal",
  ogDescription:
    "Central hub for Gazaarabia policies, UK GDPR compliance, and customer rights.",
});

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
