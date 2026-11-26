import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editorial Login",
  robots: { index: false, follow: false },
};

export default function ContentManagerLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
