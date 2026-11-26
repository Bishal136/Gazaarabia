import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Legal, Privacy & Customer Rights Hub",
  description:
    "Access all Gazaarabia legal documentation including Privacy Policy, Cookies Policy, Returns & Exchanges, and Terms & Conditions.",
  alternates: { canonical: "https://gazaarabia.com/legal" },
  openGraph: {
    title: "Legal, Privacy & Customer Rights Hub | GAZAARABIA",
    description:
      "Central hub for Gazaarabia policies, UK GDPR compliance, and customer rights.",
    url: "https://gazaarabia.com/legal",
    type: "website",
  },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
