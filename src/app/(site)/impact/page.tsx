import type { Metadata } from "next";
import ImpactContent from "./ImpactContent";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Our Impact — Ethical Fashion & Women Empowerment",
  description:
    "Discover how Gazaarabia empowers women artisans, preserves Middle Eastern textile heritage, champions sustainable modestwear, and funds verified humanitarian relief.",
  path: "/impact",
  ogDescription:
    "Every Gazaarabia creation supports sustainable production, artisan communities, and humanitarian aid.",
  twitterTitle: "Our Impact — Fashion With Purpose | GAZAARABIA",
  twitterDescription:
    "Ethical modestwear empowering women artisans and preserving cultural textile crafts.",
  imageUrl: "/images/og-impact.jpg",
  imageAlt: "Gazaarabia Ethical Modest Fashion Impact",
});

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
