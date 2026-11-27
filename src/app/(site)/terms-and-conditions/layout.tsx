import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms & Conditions",
  description:
    "Review Gazaarabia's Terms & Conditions governing marketplace orders, product pricing, delivery, intellectual property, and UK consumer rights.",
  path: "/terms-and-conditions",
  ogDescription:
    "Gazaarabia marketplace terms of service and UK consumer rights.",
});

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
