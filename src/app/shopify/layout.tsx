import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shopify Integration",
  robots: { index: false, follow: false },
};

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
