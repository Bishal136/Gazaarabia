import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Loyalty Rewards Program — Earn Points on Every Order",
  description:
    "Join the Gazaarabia Loyalty Program to earn points on UK modest fashion orders, unlock Member, Insider & Elite tiers, and enjoy early collection access.",
  path: "/loyalty",
  ogTitle: "Loyalty Rewards Program | GAZAARABIA",
  ogDescription:
    "Earn points on every ethical modestwear purchase and unlock exclusive VIP perks.",
});

export default function LoyaltyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
