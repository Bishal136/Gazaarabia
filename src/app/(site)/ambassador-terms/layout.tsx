import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Ambassador Program Terms & Conditions",
  description:
    "Read the official terms and guidelines governing commission links, ASA/FTC disclosures, and participation in the Gazaarabia Brand Ambassador Program.",
  path: "/ambassador-terms",
  ogDescription:
    "Commission policies and disclosure requirements for Gazaarabia Brand Ambassadors.",
});

export default function AmbassadorTermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
