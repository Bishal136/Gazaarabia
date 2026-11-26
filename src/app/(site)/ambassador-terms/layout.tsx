import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ambassador Program Terms & Conditions",
  description:
    "Read the official terms and guidelines governing commission links, ASA/FTC disclosures, and participation in the Gazaarabia Brand Ambassador Program.",
  alternates: { canonical: "https://gazaarabia.com/ambassador-terms" },
  openGraph: {
    title: "Ambassador Program Terms & Conditions | GAZAARABIA",
    description:
      "Commission policies and disclosure requirements for Gazaarabia Brand Ambassadors.",
    url: "https://gazaarabia.com/ambassador-terms",
    type: "website",
  },
};

export default function AmbassadorTermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
