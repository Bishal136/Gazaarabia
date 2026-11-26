import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solidarity Receipts — Verified Humanitarian Proof",
  description:
    "Browse verified donation certificates, receipts, and transparent humanitarian contribution records from Gazaarabia's charity partners.",
  alternates: { canonical: "https://gazaarabia.com/solidarity-receipts" },
  openGraph: {
    title: "Solidarity Receipts — Verified Humanitarian Proof | GAZAARABIA",
    description:
      "Verified donation certificates and humanitarian contribution records from Gazaarabia.",
    url: "https://gazaarabia.com/solidarity-receipts",
    type: "website",
  },
};

export default function SolidarityReceiptsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
