import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Portal",
  robots: { index: false, follow: false },
};

export default function AdminSectionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
