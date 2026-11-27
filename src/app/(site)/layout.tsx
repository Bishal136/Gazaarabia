import "../globals.css";
import SiteLayoutWrapper from "@/components/layout/SiteLayoutWrapper";
import { fetchHeaderData } from "@/lib/server/header";
import CookieConsentModal from "@/components/CookieConsentModal";
import GoogleTagManager from "@/components/analytics/GoogleTagManager";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import FacebookPixel from "@/components/analytics/FacebookPixel";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerData = await fetchHeaderData().catch(() => null);

  return (
    <>
      <GoogleTagManager />
      <GoogleAnalytics />
      <FacebookPixel />
      <CookieConsentModal />
      <SiteLayoutWrapper
        initialMenus={headerData?.data || []}
        initialHeaderText={headerData?.headerText || ""}
      >
        {children}
      </SiteLayoutWrapper>
    </>
  );
}
