import type { Metadata } from "next";
import ImpactContent from "./ImpactContent";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "Our Impact — Ethical Fashion & Women Empowerment",
  description:
    "Discover how Gazaarabia empowers women artisans, preserves Middle Eastern textile heritage, champions sustainable modestwear, and funds verified humanitarian relief.",
  alternates: {
    canonical: "https://gazaarabia.com/impact",
  },
  openGraph: {
    title: "Our Impact — Ethical Fashion & Women Empowerment | GAZAARABIA",
    description:
      "Every Gazaarabia creation supports sustainable production, artisan communities, and humanitarian aid.",
    url: "https://gazaarabia.com/impact",
    type: "website",
    images: [
      {
        url: "https://gazaarabia.com/images/impact/hero.png",
        width: 1200,
        height: 630,
        alt: "Gazaarabia Ethical Modest Fashion Impact",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Impact — Fashion With Purpose | GAZAARABIA",
    description:
      "Ethical modestwear empowering women artisans and preserving cultural textile crafts.",
    images: ["https://gazaarabia.com/images/impact/hero.png"],
  },
};

export default function ImpactPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://gazaarabia.com" },
          { name: "Impact", url: "https://gazaarabia.com/impact" },
        ]}
      />
      <ImpactContent />
    </>
  );
}
