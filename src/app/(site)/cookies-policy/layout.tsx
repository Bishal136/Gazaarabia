import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookies Policy — UK Privacy & Tracking Preferences",
  description:
    "Understand how Gazaarabia uses essential, analytics, and marketing cookies across our UK modest fashion marketplace and how you can manage your consent.",
  alternates: { canonical: "https://gazaarabia.com/cookies-policy" },
  openGraph: {
    title: "Cookies Policy | GAZAARABIA",
    description:
      "How Gazaarabia uses cookies and how to manage your privacy settings.",
    url: "https://gazaarabia.com/cookies-policy",
    type: "website",
  },
};

export default function CookiesPolicyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
