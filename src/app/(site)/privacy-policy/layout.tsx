import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & GDPR Compliance | Gazaarabia",
  description: "Read Gazaarabia's Privacy Policy outlining how your personal data, payments, and browsing preferences are collected, processed, and safeguarded.",
};

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
