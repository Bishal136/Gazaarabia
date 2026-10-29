import type { Metadata } from "next";
import HomeContent from "./HomeContent";
import { fetchHomepageData } from "@/lib/server/homepage";

export const revalidate = 60; // ISR cache revalidation every 60s

export const metadata: Metadata = {
  title: "Gazaarabia | Modern Modest Fashion Inspired by Gaza",
  description:
    "Gazaarabia combines timeless modest fashion with a humanitarian mission. Shop our unique collection of hijabs, abayas, and modest wear that makes a difference.",
  openGraph: {
    title: "Gazaarabia | Modern Modest Fashion",
    description: "Modern modest fashion inspired by the resilience and beauty of Gaza.",
    url: "https://gazaarabia.com",
    images: ["/images/logo.png"],
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
