import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UK & International Shipping & Delivery Information",
  description:
    "Check Gazaarabia's UK and international shipping rates, Free UK delivery thresholds over £60, dispatch cut-offs, and tracked courier timelines.",
  alternates: { canonical: "https://gazaarabia.com/shipping-and-delivery" },
  openGraph: {
    title: "Shipping & Delivery Information | GAZAARABIA",
    description:
      "Tracked UK next-day, standard, and worldwide delivery options for Gazaarabia modest fashion.",
    url: "https://gazaarabia.com/shipping-and-delivery",
    type: "website",
  },
};

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
