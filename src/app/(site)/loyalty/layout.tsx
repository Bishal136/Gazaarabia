import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loyalty Rewards Program — Earn Points on Every Order",
  description:
    "Join the Gazaarabia Loyalty Program to earn points on UK modest fashion orders, unlock Member, Insider & Elite tiers, and enjoy early collection access.",
  alternates: { canonical: "https://gazaarabia.com/loyalty" },
  openGraph: {
    title: "Loyalty Rewards Program | GAZAARABIA",
    description:
      "Earn points on every ethical modestwear purchase and unlock exclusive VIP perks.",
    url: "https://gazaarabia.com/loyalty",
    type: "website",
  },
};

export default function LoyaltyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
