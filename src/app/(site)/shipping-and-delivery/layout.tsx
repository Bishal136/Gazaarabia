import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "UK & International Shipping & Delivery Information",
  description:
    "Check Gazaarabia's UK and international shipping rates, Free UK delivery thresholds over £60, dispatch cut-offs, and tracked courier timelines.",
  path: "/shipping-and-delivery",
  ogTitle: "Shipping & Delivery Information | GAZAARABIA",
  ogDescription:
    "Tracked UK next-day, standard, and worldwide delivery options for Gazaarabia modest fashion.",
});

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
