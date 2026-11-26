import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductDetails from "./ProductDetails";
import { BreadcrumbSchema } from "@/components/BreadcrumbSchema";
import { fetchProductBySlug } from "@/lib/server/productDetails";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

function toAbsoluteUrl(url?: string | null): string {
  if (!url) return "https://gazaarabia.com/images/og-banner.jpg";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://gazaarabia.com${url.startsWith("/") ? "" : "/"}${url}`;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;

  const product = await prisma.products.findUnique({
    where: { slug },
    include: {
      productimage: {
        orderBy: { primary: "desc" },
        take: 1,
      },
    },
  });

  if (!product || product.isDeleted || product.active === false) {
    return {
      title: "Product Not Found",
      description: "The requested product could not be found.",
      robots: { index: false, follow: false },
    };
  }

  const previousImages = (await parent).openGraph?.images || [];
  const productImage = toAbsoluteUrl(product.productimage?.[0]?.url);
  const rawDescription =
    product.shortDescription ||
    product.description ||
    `Shop ${product.title} at Gazaarabia — UK modest fashion inspired by heritage and humanitarian purpose.`;
  const cleanDescription = rawDescription
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return {
    title: product.title,
    description: cleanDescription,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `https://gazaarabia.com/products/${slug}`,
    },
    openGraph: {
      title: `${product.title} | GAZAARABIA`,
      description: cleanDescription,
      url: `https://gazaarabia.com/products/${slug}`,
      images: [productImage, ...previousImages],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.title} | GAZAARABIA`,
      description: cleanDescription,
      images: [productImage],
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;

  // Pre-fetch complete product details on the server to eliminate client waterfall
  const product = await fetchProductBySlug(slug);

  if (!product || product.isDeleted || product.active === false) {
    notFound();
  }

  const regularPrice = Number(product.sellingPrice || 0);
  const discountPrice = Number(product.discountPrice || 0);
  const effectivePrice =
    discountPrice > 0 && discountPrice < regularPrice ? discountPrice : regularPrice;

  const allAbsoluteImages: string[] = Array.isArray(product.productimage)
    ? product.productimage
        .map((img: any) => toAbsoluteUrl(img?.url))
        .filter((url: string, idx: number, arr: string[]) => Boolean(url) && arr.indexOf(url) === idx)
    : [];

  const inStock = Array.isArray(product.productvariant)
    ? product.productvariant.some((v: any) => (v.availableStock ?? v.stock ?? 0) > 0)
    : Number(product.baseQty || 0) > 0;

  const categorySlug = product.categories?.slug || "all";
  const categoryName = product.categories?.name || "Modest Fashion";
  const brandName = product.brand?.name || product.seller?.shopName || "GAZAARABIA";
  const sellerName = product.seller?.shopName || "GAZAARABIA";

  const reviewsList = product.reviewsData?.list || product.reviews || [];
  const averageRating = Number(product.reviewsData?.averageRating || 0);

  const cleanSchemaDesc = (
    product.shortDescription ||
    product.description ||
    product.title
  )
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image:
      allAbsoluteImages.length > 0
        ? allAbsoluteImages
        : ["https://gazaarabia.com/images/og-banner.jpg"],
    description: cleanSchemaDesc,
    sku: product.barcode || `GA-${product.id}`,
    category: categoryName,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    offers: {
      "@type": "Offer",
      url: `https://gazaarabia.com/products/${slug}`,
      priceCurrency: "GBP",
      price: effectivePrice.toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: sellerName,
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "GB",
        },
        shippingRate: {
          "@type": "MonetaryAmount",
          value: effectivePrice >= 60 ? "0.00" : "4.99",
          currency: "GBP",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 2,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 5,
            unitCode: "DAY",
          },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "GB",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
      },
    },
    ...(reviewsList.length > 0 && averageRating > 0 && {
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <ProductDetails initialProduct={product} />
    </>
  );
}
