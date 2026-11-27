import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InitiativeContent from "./InitiativeContent";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { IMPACT_INITIATIVES_META, IMPACT_SLUGS } from "@/lib/seo/initiatives";
import { buildPageMetadata } from "@/lib/seo/metadata";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return IMPACT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const initiative = IMPACT_INITIATIVES_META[slug];

  if (!initiative) {
    return {
      title: "Initiative Not Found",
      robots: { index: false, follow: false },
    };
  }

  return buildPageMetadata({
    title: `${initiative.eyebrow} — ${initiative.title}`,
    description: initiative.desc,
    path: `/impact/${slug}`,
    ogTitle: `${initiative.eyebrow} | GAZAARABIA Impact`,
    twitterTitle: `${initiative.eyebrow} | GAZAARABIA`,
    type: "article",
    imageUrl: `/images/og-impact-${slug}.jpg`,
    imageAlt: initiative.title,
  });
}

export default async function ImpactInitiativePage({ params }: Props) {
  const { slug } = await params;
  const initiative = IMPACT_INITIATIVES_META[slug];

  if (!initiative) {
    notFound();
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://gazaarabia.com" },
          { name: "Impact", url: "https://gazaarabia.com/impact" },
          { name: initiative.eyebrow, url: `https://gazaarabia.com/impact/${slug}` },
        ]}
      />
      <InitiativeContent />
    </>
  );
}
