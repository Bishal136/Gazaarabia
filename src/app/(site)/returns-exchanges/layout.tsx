import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Returns & Exchanges Policy — 14-Day UK Return Window",
  description:
    "Read Gazaarabia's 14-day UK, EU, and international returns and size exchange policy, eligibility criteria, and tracked refund processing timelines.",
  alternates: { canonical: "https://gazaarabia.com/returns-exchanges" },
  openGraph: {
    title: "Returns & Exchanges Policy | GAZAARABIA",
    description:
      "Simple 14-day UK & international return and size exchange guidelines at Gazaarabia.",
    url: "https://gazaarabia.com/returns-exchanges",
    type: "website",
  },
};

export default function ReturnsExchangesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
