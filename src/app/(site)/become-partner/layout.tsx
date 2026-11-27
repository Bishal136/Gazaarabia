import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Become a Partner — Affiliate & Ambassador Program",
  description:
    "Earn up to 10-15% per sale as an Affiliate or become a Gazaarabia Brand Ambassador for recurring commissions and creative rewards in the UK modest fashion movement.",
  path: "/become-partner",
  ogDescription:
    "Choose Affiliate (earn 10-15% per sale) or Ambassador (recurring revenue + creative rewards). Start earning today.",
  twitterDescription:
    "Earn 10-15% per sale as an Affiliate or become an Ambassador for recurring revenue and creative bonuses.",
  imageUrl: "/images/og-partner.jpg",
  imageAlt: "GAZAARABIA Partner Program",
});

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
