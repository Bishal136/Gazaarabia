import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Solidarity Receipts | Verified Humanitarian Proof - Gazaarabia",
  description: "Browse verified donation certificates, receipts, and humanitarian contribution records from Gazaarabia's charity partners.",
};

export default function SolidarityReceiptsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
