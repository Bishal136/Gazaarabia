import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import CategoryContent from "./CategoryContent";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { CollectionPageSchema } from "@/components/CollectionPageSchema";

import { fetchShopData } from "@/lib/server/shopData";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCategoryData(slug: string) {
  if (slug === "all") {
    return { name: "All Products", description: "Explore our full collection of modest fashion, including hijabs, abayas, thobes, and more." };
  }

  // 1. Check Menu (e.g. Women, Men)
  const menu = await prisma.menus.findFirst({ where: { slug } });
  if (menu) {
    const displayName = menu.name.toUpperCase() === "WOMEN" ? "Women's Collection" : menu.name.toUpperCase() === "MEN" ? "Men's Collection" : menu.name;
    return {
      name: displayName,
      description: `Explore our ${displayName} featuring ethically crafted modest wear, abayas, kaftans, thobes, and accessories.`,
    };
  }

  // 2. Check Submenu (e.g. Clothing, New In)
  const submenu = await prisma.submenus.findFirst({ where: { slug } });
  if (submenu) {
    return {
      name: submenu.name,
      description: `Explore our ${submenu.name} collection at Gazaarabia.`,
    };
  }

  // 3. Check Category
  const category = await prisma.categories.findUnique({
    where: { slug },
  });
  if (category) return category;

  // 4. Check Subcategory
  const subcategory = await prisma.subcategory.findUnique({
    where: { slug },
  });
  if (subcategory) return subcategory;

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryData(slug);

  if (!category) {
    return {
      title: "Shop Modest Fashion | Gazaarabia",
      description: "Explore our curated collections of modest fashion, thobes, and abayas.",
      robots: { index: true, follow: true },
      alternates: { canonical: `https://gazaarabia.com/shop/${slug}` },
    };
  }

  return {
    title: `${category.name} | Gazaarabia`,
    description: category.description || `Discover our ${category.name} collection.`,
    robots: { index: true, follow: true },
    alternates: { canonical: `https://gazaarabia.com/shop/${slug}` },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const [category, initialData] = await Promise.all([
    slug !== "all" ? getCategoryData(slug) : null,
    fetchShopData(slug, 1, 16).catch(() => null),
  ]);
  const categoryName = category?.name || initialData?.parentCategory?.name || "All Products";

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://gazaarabia.com" },
          { name: "Shop", url: "https://gazaarabia.com/shop/all" },
          { name: categoryName, url: `https://gazaarabia.com/shop/${slug}` },
        ]}
      />
      <CollectionPageSchema
        name={categoryName}
        description={
          category?.description ||
          `Explore our ${categoryName} collection - Modest Fashion from GAZAARABIA`
        }
        url={`https://gazaarabia.com/shop/${slug}`}
      />
      <CategoryContent initialData={initialData} />
    </>
  );
}
