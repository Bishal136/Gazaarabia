import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import FaqContent from "./FaqContent";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Frequently Asked Questions — UK Delivery, Returns & Sizing",
  description:
    "Find answers to common questions about Gazaarabia UK shipping, 14-day returns, abaya and kaftan sizing, modestwear care, and our humanitarian charity model.",
  alternates: {
    canonical: "https://gazaarabia.com/faq",
  },
  openGraph: {
    title: "Frequently Asked Questions — UK Delivery, Returns & Sizing | GAZAARABIA",
    description:
      "Answers about Gazaarabia shipping, returns, sizing, ethical sourcing, and humanitarian impact.",
    url: "https://gazaarabia.com/faq",
    type: "website",
  },
};

function stripHtml(html: string): string {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function FaqPage() {
  let initialCategories: any[] = [];
  let initialFaqs: any[] = [];

  try {
    const [catsRaw, faqsRaw] = await Promise.all([
      prisma.faqCategory.findMany({ orderBy: { name: "asc" } }),
      prisma.faq.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    initialCategories = JSON.parse(JSON.stringify(catsRaw || []));
    initialFaqs = JSON.parse(JSON.stringify(faqsRaw || []));
  } catch (err) {
    console.error("SSR FAQ fetch error:", err);
  }

  const faqSchema =
    initialFaqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: initialFaqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: stripHtml(faq.answer),
            },
          })),
        }
      : null;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://gazaarabia.com" },
          { name: "FAQs", url: "https://gazaarabia.com/faq" },
        ]}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <FaqContent
        initialCategories={initialCategories}
        initialFaqs={initialFaqs}
      />
    </>
  );
}
