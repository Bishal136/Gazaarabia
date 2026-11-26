import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ambassador Portal",
  robots: { index: false, follow: false },
};

export default function AmbassadorSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
