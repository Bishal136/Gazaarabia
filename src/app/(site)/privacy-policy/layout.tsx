import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & UK GDPR Compliance",
  description:
    "Read Gazaarabia's Privacy Policy outlining how your personal data, payments, and browsing preferences are collected, processed, and safeguarded under UK GDPR.",
  alternates: { canonical: "https://gazaarabia.com/privacy-policy" },
  openGraph: {
    title: "Privacy Policy & UK GDPR Compliance | GAZAARABIA",
    description:
      "How Gazaarabia collects, processes, and safeguards customer data under UK GDPR.",
    url: "https://gazaarabia.com/privacy-policy",
    type: "website",
  },
};

export default function PrivacyPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
