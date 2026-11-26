import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Charity & Ethical Relief Initiatives",
  description:
    "Explore Gazaarabia's charity partnerships with Palestine Solidarity Campaign, Al Khair Foundation, and Islamic Relief UK. Modest fashion with purpose.",
  alternates: { canonical: "https://gazaarabia.com/charity" },
  openGraph: {
    title: "Charity & Ethical Relief Initiatives | GAZAARABIA",
    description:
      "See how Gazaarabia funds humanitarian initiatives through ethical UK modest fashion.",
    url: "https://gazaarabia.com/charity",
    type: "website",
  },
};

export default function CharityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
