import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Solidarity Receipts — Verified Humanitarian Proof",
  description:
    "Browse verified donation certificates, receipts, and transparent humanitarian contribution records from Gazaarabia's charity partners.",
  path: "/solidarity-receipts",
  ogDescription:
    "Verified donation certificates and humanitarian contribution records from Gazaarabia.",
});

export default function SolidarityReceiptsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
