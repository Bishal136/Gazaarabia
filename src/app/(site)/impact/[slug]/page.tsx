import type { Metadata } from "next";
import { notFound } from "next/navigation";
import InitiativeContent from "./InitiativeContent";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { IMPACT_INITIATIVES_META, IMPACT_SLUGS } from "@/lib/seo/initiatives";

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

  const canonicalUrl = `https://gazaarabia.com/impact/${slug}`;
  const ogImage = `https://gazaarabia.com${initiative.hero}`;

  return {
    title: `${initiative.eyebrow} — ${initiative.title}`,
    description: initiative.desc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${initiative.eyebrow} | GAZAARABIA Impact`,
      description: initiative.desc,
      url: canonicalUrl,
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: initiative.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${initiative.eyebrow} | GAZAARABIA`,
      description: initiative.desc,
      images: [ogImage],
    },
  };
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
