import type { Metadata } from "next";
import { Poppins, Playfair_Display } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper";
import PayPalProviderWrapper from "@/components/PayPalProviderWrapper";
import { CartProvider } from "./context/CartContext";
import CookieConsentModal from "@/components/CookieConsentModal";
import GoogleTagManager from "@/components/analytics/GoogleTagManager";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import FacebookPixel from "@/components/analytics/FacebookPixel";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://gazaarabia.com"),
  title: {
    default: "GAZAARABIA | UK's Muslim Fashion Marketplace",
    template: "%s | GAZAARABIA",
  },
  description:
    "Shop modest fashion from Muslim-owned UK brands. Abayas, kaftans & hijabs — every purchase helps people in Palestine, Gaza, Sudan, Yemen & Beyond.",
  keywords: [
    "GAZAARABIA",
    "modest fashion UK",
    "abayas UK",
    "Moroccan kaftans UK",
    "hijabs UK",
  ],
  authors: [{ name: "GAZAARABIA Team" }],
  creator: "GAZAARABIA",
  publisher: "GAZAARABIA",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://gazaarabia.com",
    siteName: "GAZAARABIA",
    title: "GAZAARABIA | Modest Fashion With Purpose",
    description:
      "The UK's Muslim Fashion Movement. Shop abayas, kaftans & hijabs from Muslim-owned brands — every order helps people in Palestine, Gaza, Sudan, Yemen & Beyond.",
    images: [
      {
        url: "/images/og-banner.jpg",
        width: 1200,
        height: 630,
        alt: "GAZAARABIA - UK Muslim Fashion Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GAZAARABIA | UK's Muslim Fashion Marketplace",
    description:
      "Modest fashion. Muslim brands. Real purpose. Every purchase funds The Ummah Fund — Gaza, Sudan, Yemen & beyond.",
    images: ["/images/og-banner.jpg"],
    creator: "@gazaarabia",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const globalJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://gazaarabia.com/#organization",
      name: "GAZAARABIA",
      url: "https://gazaarabia.com",
      logo: {
        "@type": "ImageObject",
        url: "https://gazaarabia.com/images/logo.png",
      },
      description:
        "UK's ethical modest fashion marketplace supporting humanitarian relief through The Ummah Fund.",
      address: {
        "@type": "PostalAddress",
        addressCountry: "GB",
      },
      sameAs: [
        "https://www.instagram.com/gazaarabia/",
        "https://www.facebook.com/gazaarabia/",
        "https://www.tiktok.com/@gazaarabia/",
        "https://www.youtube.com/@GazaArabia_Official",
        "https://uk.pinterest.com/gazaarabia/",
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://gazaarabia.com/#website",
      url: "https://gazaarabia.com",
      name: "GAZAARABIA",
      publisher: { "@id": "https://gazaarabia.com/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://gazaarabia.com/search?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${playfairDisplay.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="dns-prefetch" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(globalJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        <GoogleTagManager />
        <GoogleAnalytics />
        <FacebookPixel />
        <SessionProviderWrapper>
          <PayPalProviderWrapper>
            <CartProvider>
              <CookieConsentModal />
              {children}
            </CartProvider>
          </PayPalProviderWrapper>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
