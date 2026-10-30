import type { Metadata, ResolvingMetadata } from "next";
import { prisma } from "@/lib/prisma";
import ProductDetails from "./ProductDetails";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { fetchProductBySlug } from "@/lib/server/productDetails";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  // Fetch product data
  const product = await prisma.products.findUnique({
    where: { slug },
    include: {
      productimage: {
        where: { primary: true },
        take: 1,
      },
    },
  });

  if (!product) {
    return {
      title: "Product Not Found | Gazaarabia",
    };
  }

  const previousImages = (await parent).openGraph?.images || [];
  const productImage = product.productimage[0]?.url || "/images/logo.png";

  return {
    title: product.title,
    description: product.shortDescription || `Buy ${product.title} at Gazaarabia. Modern modest fashion inspired by Gaza.`,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `https://gazaarabia.com/products/${slug}`,
    },
    openGraph: {
      title: `${product.title} | Gazaarabia`,
      description: product.shortDescription || `Explore ${product.title} in our collection.`,
      url: `https://gazaarabia.com/products/${slug}`,
      images: [productImage, ...previousImages],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.shortDescription || `Explore ${product.title} in our collection.`,
      images: [productImage],
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;

  // Pre-fetch complete product details on the server to eliminate client waterfall
  const product = await fetchProductBySlug(slug);

  if (!product) return <ProductDetails />;

  const price = product.sellingPrice;
  const productImage = product.productimage?.[0]?.url || "https://gazaarabia.com/images/logo.png";
  const inStock = Array.isArray(product.productvariant)
    ? product.productvariant.some((v: any) => (v.availableStock ?? v.stock ?? 0) > 0)
    : false;
  const categorySlug = product.categories?.slug || "all";
  const categoryName = product.categories?.name || "Products";

  const reviewsList = product.reviewsData?.list || product.reviews || [];
  const averageRating = product.reviewsData?.averageRating || 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: productImage,
    description: product.shortDescription || product.title,
    sku: product.barcode || `GA-${product.id}`,
    category: categoryName,
    brand: {
      "@type": "Brand",
      name: "Gazaarabia",
    },
    offers: {
      "@type": "Offer",
      url: `https://gazaarabia.com/products/${slug}`,
      priceCurrency: "GBP",
      price: price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "Gazaarabia",
      },
    },
    ...(reviewsList.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: averageRating.toFixed(1),
        reviewCount: reviewsList.length,
      },
    }),
  };

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://gazaarabia.com" },
          { name: "Shop", url: "https://gazaarabia.com/shop/all" },
          { name: categoryName, url: `https://gazaarabia.com/shop/${categorySlug}` },
          { name: product.title, url: `https://gazaarabia.com/products/${slug}` },
        ]}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetails initialProduct={product} />
    </>
  );
}

