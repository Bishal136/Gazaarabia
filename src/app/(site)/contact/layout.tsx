import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Customer Support & Collaborations",
  description:
    "Get in touch with the Gazaarabia UK team for inquiries regarding orders, modest fashion products, brand partnerships, and ambassador collaborations.",
  alternates: { canonical: "https://gazaarabia.com/contact" },
  openGraph: {
    title: "Contact Us — Customer Support & Collaborations | GAZAARABIA",
    description:
      "Reach the Gazaarabia customer support and brand partnership desk.",
    url: "https://gazaarabia.com/contact",
    type: "website",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
