import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Portal",
  robots: { index: false, follow: false },
};

export default function AffiliateSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
