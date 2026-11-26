import type { Metadata } from "next";
import "../../globals.css";
import AffiliateLayout from "@/components/affiliate/AffiliateLayout";

export const metadata: Metadata = {
  title: "Affiliate Dashboard",
  description: "Affiliate panel for managing earnings, payouts, and performance.",
  robots: { index: false, follow: false },
};

export default function AffiliateRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="antialiased bg-[#f5f6fa] text-[var(--text-primary)]">
      <AffiliateLayout>{children}</AffiliateLayout>
    </div>
  );
}
