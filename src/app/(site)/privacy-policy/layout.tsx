import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy & UK GDPR Compliance",
  description:
    "Read Gazaarabia's Privacy Policy outlining how your personal data, payments, and browsing preferences are collected, processed, and safeguarded under UK GDPR.",
  path: "/privacy-policy",
  ogDescription:
    "How Gazaarabia collects, processes, and safeguards customer data under UK GDPR.",
});

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
