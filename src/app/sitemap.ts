import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { IMPACT_SLUGS } from "@/lib/seo/initiatives";

export const dynamic = "force-dynamic";

const baseUrl = "https://gazaarabia.com";
const STATIC_LAST_MODIFIED = new Date("2026-11-26T00:00:00.000Z");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/shop/all",
    "/about",
    "/contact",
    "/faq",
    "/blogs/journal",
    "/privacy-policy",
    "/terms-and-conditions",
    "/shipping-and-delivery",
    "/returns-exchanges",
    "/cookies-policy",
    "/ambassador-terms",
    "/legal",
    "/impact",
    "/charity",
    "/solidarity-receipts",
    "/loyalty",
    "/become-partner",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: route === "" || route === "/shop/all" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/shop/all" ? 0.9 : 0.7,
  }));

  const impactRoutes: MetadataRoute.Sitemap = IMPACT_SLUGS.map((slug) => ({
    url: `${baseUrl}/impact/${slug}`,
    lastModified: STATIC_LAST_MODIFIED,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  try {
    const [products, menus, submenus, categories, subcategories, blogs] =
      await Promise.all([
        prisma.products.findMany({
          where: { active: true, isDeleted: false },
          select: { slug: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.menus.findMany({
          where: { type: "product" },
          select: { slug: true, updatedAt: true },
        }),
        prisma.submenus.findMany({
          select: { slug: true, updatedAt: true },
        }),
        prisma.categories.findMany({
          select: { slug: true, updatedAt: true },
        }),
        prisma.subcategory.findMany({
          select: { slug: true, updatedAt: true },
        }),
        prisma.blogs.findMany({
          select: { slug: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
        }),
      ]);

    const productRoutes: MetadataRoute.Sitemap = products
      .filter((p: any) => Boolean(p?.slug))
      .map((p: any) => ({
        url: `${baseUrl}/products/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : STATIC_LAST_MODIFIED,
        changeFrequency: "daily",
        priority: 0.9,
      }));

    // Deduplicate all taxonomy slugs across menus, submenus, categories, subcategories
    const taxonomyMap = new Map<string, MetadataRoute.Sitemap[number]>();
    const addTaxonomy = (items: any[], priority: number) => {
      for (const item of items || []) {
        if (!item?.slug || item.slug === "all") continue;
        const url = `${baseUrl}/shop/${item.slug}`;
        if (!taxonomyMap.has(url)) {
          taxonomyMap.set(url, {
            url,
            lastModified: item.updatedAt ? new Date(item.updatedAt) : STATIC_LAST_MODIFIED,
            changeFrequency: "weekly",
            priority,
          });
        }
      }
    };

    addTaxonomy(menus, 0.85);
    addTaxonomy(submenus, 0.8);
    addTaxonomy(categories, 0.8);
    addTaxonomy(subcategories, 0.75);

    const blogRoutes: MetadataRoute.Sitemap = (blogs || [])
      .filter((b: any) => Boolean(b?.slug))
      .map((b: any) => ({
        url: `${baseUrl}/blogs/journal/${b.slug}`,
        lastModified: b.updatedAt ? new Date(b.updatedAt) : STATIC_LAST_MODIFIED,
        changeFrequency: "monthly",
        priority: 0.7,
      }));

    return [
      ...staticRoutes,
      ...impactRoutes,
      ...Array.from(taxonomyMap.values()),
      ...productRoutes,
      ...blogRoutes,
    ];
  } catch (error) {
    console.error("Sitemap error:", error);
    return [...staticRoutes, ...impactRoutes];
  }
}
