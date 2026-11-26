import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import JournalContent from "./JournalContent";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { CollectionPageSchema } from "@/components/CollectionPageSchema";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Modest Fashion Journal — Stories, Heritage & Style Guides",
  description:
    "Explore the Gazaarabia Journal for UK modest fashion styling guides, abaya and kaftan craft stories, cultural heritage essays, and humanitarian impact updates.",
  alternates: {
    canonical: "https://gazaarabia.com/blogs/journal",
  },
  openGraph: {
    title: "Modest Fashion Journal — Stories, Heritage & Style Guides | GAZAARABIA",
    description:
      "Read Gazaarabia Journal stories covering modest haute couture, cultural heritage, and humanitarian impact.",
    url: "https://gazaarabia.com/blogs/journal",
    type: "website",
    images: [
      {
        url: "https://gazaarabia.com/images/og-banner.jpg",
        width: 1200,
        height: 630,
        alt: "GAZAARABIA Modest Fashion Journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Modest Fashion Journal | GAZAARABIA",
    description:
      "Editorial essays on modest fashion, Islamic textile heritage, and humanitarian solidarity.",
    images: ["https://gazaarabia.com/images/og-banner.jpg"],
  },
};

export default async function JournalPage() {
  let initialBlogs: any[] = [];
  let initialCategories: any[] = [];

  try {
    const [blogsRaw, catsRaw] = await Promise.all([
      prisma.blogs.findMany({
        include: { category: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.blogCategories.findMany({
        orderBy: { createdAt: "desc" },
      }),
    ]);

    initialBlogs = JSON.parse(JSON.stringify(blogsRaw || []));
    initialCategories = JSON.parse(JSON.stringify(catsRaw || []));
  } catch (err) {
    console.error("SSR Journal fetch error:", err);
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://gazaarabia.com" },
          { name: "Journal", url: "https://gazaarabia.com/blogs/journal" },
        ]}
      />
      <CollectionPageSchema
        name="GAZAARABIA Modest Fashion Journal"
        description="Editorial essays on modest fashion, UK styling guides, textile craftsmanship, and humanitarian impact."
        url="https://gazaarabia.com/blogs/journal"
      />
      <JournalContent
        initialBlogs={initialBlogs}
        initialCategories={initialCategories}
      />
    </>
  );
}
