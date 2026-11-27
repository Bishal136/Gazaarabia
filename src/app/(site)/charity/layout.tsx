import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Charity & Ethical Relief Initiatives",
  description:
    "Explore Gazaarabia's charity partnerships with Palestine Solidarity Campaign, Al Khair Foundation, and Islamic Relief UK. Modest fashion with purpose.",
  path: "/charity",
  ogDescription:
    "See how Gazaarabia funds humanitarian initiatives through ethical UK modest fashion.",
});

export default function CharityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
