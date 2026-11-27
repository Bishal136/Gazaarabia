import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "About Us — Muslim Fashion With Purpose",
  description:
    "Learn about Gazaarabia's mission, story, and ethical values. Discover how our UK modest fashion collections support humanitarian relief in Gaza, Palestine, and beyond.",
  path: "/about",
  ogDescription:
    "Discover how Gazaarabia's modest fashion marketplace empowers Muslim brands and supports humanitarian aid.",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
