import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Customer Support & Collaborations - Gazaarabia",
  description: "Get in touch with the Gazaarabia team. We are here to support your inquiries regarding orders, products, partnerships, and ambassador collaborations.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
