import { Suspense } from "react";
import { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import SearchContent from "./SearchContent";
import ProductGridSkeleton from "@/components/shop/ProductGridSkeleton";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = (params.q as string) || "";

  return {
    title: q
      ? `Search results for "${q}" | GAZAARABIA`
      : "Search | GAZAARABIA",
    description: q
      ? `Find beautiful modest fashion matching "${q}" - GAZAARABIA collection`
      : "Search our collection of modest fashion, abayas, hijabs, and traditional wear",
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `https://gazaarabia.com/search${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    },
  };
}

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q as string) || "";

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://gazaarabia.com" },
          {
            name: "Search",
            url: `https://gazaarabia.com/search${q ? `?q=${encodeURIComponent(q)}` : ""}`,
          },
        ]}
      />
      <Suspense
        fallback={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <ProductGridSkeleton count={8} />
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </>
  );
}
