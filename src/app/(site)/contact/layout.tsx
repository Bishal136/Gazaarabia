import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact Us — Customer Support & Collaborations",
  description:
    "Get in touch with the Gazaarabia UK team for inquiries regarding orders, modest fashion products, brand partnerships, and ambassador collaborations.",
  path: "/contact",
  ogDescription:
    "Reach the Gazaarabia customer support and brand partnership desk.",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
