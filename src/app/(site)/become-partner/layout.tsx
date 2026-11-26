import type { Metadata } from "next";

const domain = "https://gazaarabia.com";
const pageUrl = `${domain}/become-partner`;
const ogImage = `${domain}/images/partner-banner.png`;

export const metadata: Metadata = {
  title: "Become a Partner — Affiliate & Ambassador Program",
  description:
    "Earn up to 10-15% per sale as an Affiliate or become a Gazaarabia Brand Ambassador for recurring commissions and creative rewards in the UK modest fashion movement.",
  openGraph: {
    title: "Become a Partner — Affiliate & Ambassador Program | GAZAARABIA",
    description:
      "Choose Affiliate (earn 10-15% per sale) or Ambassador (recurring revenue + creative rewards). Start earning today.",
    url: pageUrl,
    siteName: "GAZAARABIA",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "GAZAARABIA Partner Program",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Become a Partner — Affiliate & Ambassador Program | GAZAARABIA",
    description:
      "Earn 10-15% per sale as an Affiliate or become an Ambassador for recurring revenue and creative bonuses.",
    images: [ogImage],
  },
  alternates: {
    canonical: pageUrl,
  },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
