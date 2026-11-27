import type { Metadata } from "next";
import HomeContent from "./HomeContent";
import { fetchHomepageData } from "@/lib/server/homepage";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 60; // ISR cache revalidation every 60s

export const metadata: Metadata = buildPageMetadata({
  title: "GAZAARABIA | Modest Fashion, Abayas, Kaftans & Hijabs UK",
  absoluteTitle: "GAZAARABIA | Modest Fashion, Abayas, Kaftans & Hijabs UK",
  description:
    "Shop ethically crafted abayas, Moroccan kaftans & hijabs from Muslim-owned UK brands. Every order funds verified humanitarian aid in Gaza, Sudan & beyond.",
  path: "/",
  ogTitle: "GAZAARABIA | Modest Fashion, Abayas, Kaftans & Hijabs UK",
  ogDescription:
    "Shop ethically crafted abayas, Moroccan kaftans & hijabs from Muslim-owned UK brands with verified humanitarian purpose.",
  twitterDescription:
    "Ethically crafted abayas, kaftans & hijabs from Muslim-owned UK brands supporting humanitarian relief.",
  imageUrl: "/images/og-banner.jpg",
  imageAlt: "GAZAARABIA UK Modest Fashion Marketplace",
});

export default async function Page() {
  let initialData = null;
  try {
    initialData = await fetchHomepageData();
  } catch (err) {
    console.error("SSR fetchHomepageData error:", err);
  }

  return <HomeContent initialData={initialData} />;
}
