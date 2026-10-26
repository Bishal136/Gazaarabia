import "../globals.css";
import SiteLayoutWrapper from "@/components/layout/SiteLayoutWrapper";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteLayoutWrapper>{children}</SiteLayoutWrapper>;
}
