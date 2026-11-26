import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Review Gazaarabia's Terms & Conditions governing marketplace orders, product pricing, delivery, intellectual property, and UK consumer rights.",
  alternates: { canonical: "https://gazaarabia.com/terms-and-conditions" },
  openGraph: {
    title: "Terms & Conditions | GAZAARABIA",
    description:
      "Gazaarabia marketplace terms of service and UK consumer rights.",
    url: "https://gazaarabia.com/terms-and-conditions",
    type: "website",
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
