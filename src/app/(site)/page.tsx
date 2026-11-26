import type { Metadata } from "next";
import HomeContent from "./HomeContent";
import { fetchHomepageData } from "@/lib/server/homepage";

export const revalidate = 60; // ISR cache revalidation every 60s

export const metadata: Metadata = {
  title: {
    absolute: "GAZAARABIA | Modest Fashion, Abayas, Kaftans & Hijabs UK",
  },
  description:
    "Shop ethically crafted abayas, Moroccan kaftans & hijabs from Muslim-owned UK brands. Every order funds verified humanitarian aid in Gaza, Sudan & beyond.",
  openGraph: {
    title: "GAZAARABIA | Modest Fashion, Abayas, Kaftans & Hijabs UK",
    description:
      "Shop ethically crafted abayas, Moroccan kaftans & hijabs from Muslim-owned UK brands with verified humanitarian purpose.",
    url: "https://gazaarabia.com",
    type: "website",
    images: [
      {
        url: "/images/og-banner.jpg",
        width: 1200,
        height: 630,
        alt: "GAZAARABIA UK Modest Fashion Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GAZAARABIA | Modest Fashion, Abayas, Kaftans & Hijabs UK",
    description:
      "Ethically crafted abayas, kaftans & hijabs from Muslim-owned UK brands supporting humanitarian relief.",
    images: ["/images/og-banner.jpg"],
  },
  alternates: {
    canonical: "https://gazaarabia.com",
  },
};

export default async function Page() {
  let initialData = null;
  try {
    initialData = await fetchHomepageData();
  } catch (err) {
    console.error("SSR fetchHomepageData error:", err);
  }

  return <HomeContent initialData={initialData} />;
}
