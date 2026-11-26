import "../globals.css";
import SiteLayoutWrapper from "@/components/layout/SiteLayoutWrapper";
import { fetchHeaderData } from "@/lib/server/header";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerData = await fetchHeaderData().catch(() => null);

  return (
    <SiteLayoutWrapper
      initialMenus={headerData?.data || []}
      initialHeaderText={headerData?.headerText || ""}
    >
      {children}
    </SiteLayoutWrapper>
  );
}
