import type { Metadata } from "next";

export const SITE_URL = "https://gazaarabia.com";
export const SITE_NAME = "GAZAARABIA";
export const SITE_LOCALE = "en_GB";

export const DEFAULT_OG_IMAGE = {
  url: `${SITE_URL}/images/og-banner.jpg`,
  secureUrl: `${SITE_URL}/images/og-banner.jpg`,
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "GAZAARABIA — UK Modest Fashion Marketplace",
} as const;

export function toAbsoluteUrl(url?: string | null): string {
  if (!url) return DEFAULT_OG_IMAGE.url;
  const trimmed = url.trim();
  if (!trimmed) return DEFAULT_OG_IMAGE.url;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/ /g, "%20");
  }
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${SITE_URL}${normalized.replace(/ /g, "%20")}`;
}

export interface PageMetadataOptions {
  title: string;
  absoluteTitle?: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  imageUrl?: string;
  imageAlt?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  robots?: Metadata["robots"];
}

/**
 * Generates consistent SEO, Open Graph (WhatsApp/Meta-compatible), and Twitter metadata
 * while preserving siteName, locale, and valid 1200x630 image defaults across route overrides.
 */
export function buildPageMetadata({
  title,
  absoluteTitle,
  description,
  path,
  ogTitle,
  ogDescription,
  twitterTitle,
  twitterDescription,
  imageUrl,
  imageAlt,
  type = "website",
  publishedTime,
  modifiedTime,
  robots = { index: true, follow: true },
}: PageMetadataOptions): Metadata {
  const cleanPath = path === "/" || path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = `${SITE_URL}${cleanPath}`;
  const resolvedOgTitle = ogTitle || absoluteTitle || `${title} | ${SITE_NAME}`;
  const resolvedOgDescription = ogDescription || description;
  const resolvedTwitterTitle = twitterTitle || resolvedOgTitle;
  const resolvedTwitterDescription = twitterDescription || resolvedOgDescription;
  const resolvedImageUrl = toAbsoluteUrl(imageUrl);
  const resolvedImageAlt = imageAlt || resolvedOgTitle;
  const isJpeg = /\.jpe?g($|\?)/i.test(resolvedImageUrl);
  const isPng = /\.png($|\?)/i.test(resolvedImageUrl);

  const primaryImage = {
    url: resolvedImageUrl,
    ...(resolvedImageUrl.startsWith("https://") ? { secureUrl: resolvedImageUrl } : {}),
    width: 1200,
    height: 630,
    ...(isJpeg ? { type: "image/jpeg" } : isPng ? { type: "image/png" } : {}),
    alt: resolvedImageAlt,
  };

  return {
    title: absoluteTitle ? { absolute: absoluteTitle } : title,
    description,
    robots,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: resolvedOgTitle,
      description: resolvedOgDescription,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type,
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
      ...(type === "article" && modifiedTime ? { modifiedTime } : {}),
      images: [primaryImage],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTwitterTitle,
      description: resolvedTwitterDescription,
      images: [resolvedImageUrl],
      creator: "@gazaarabia",
    },
  };
}
