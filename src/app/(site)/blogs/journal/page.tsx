import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import JournalContent from "./JournalContent";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { CollectionPageSchema } from "@/components/CollectionPageSchema";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 60;

export const metadata: Metadata = buildPageMetadata({
  title: "Modest Fashion Journal — Stories, Heritage & Style Guides",
  description:
    "Explore the Gazaarabia Journal for UK modest fashion styling guides, abaya and kaftan craft stories, cultural heritage essays, and humanitarian impact updates.",
  path: "/blogs/journal",
  ogDescription:
    "Read Gazaarabia Journal stories covering modest haute couture, cultural heritage, and humanitarian impact.",
  twitterTitle: "Modest Fashion Journal | GAZAARABIA",
  twitterDescription:
    "Editorial essays on modest fashion, Islamic textile heritage, and humanitarian solidarity.",
  imageUrl: "/images/og-banner.jpg",
  imageAlt: "GAZAARABIA Modest Fashion Journal",
});

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
