import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Returns & Exchanges Policy — 14-Day UK Return Window",
  description:
    "Read Gazaarabia's 14-day UK, EU, and international returns and size exchange policy, eligibility criteria, and tracked refund processing timelines.",
  path: "/returns-exchanges",
  ogTitle: "Returns & Exchanges Policy | GAZAARABIA",
  ogDescription:
    "Simple 14-day UK & international return and size exchange guidelines at Gazaarabia.",
});

export default function ReturnsExchangesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
