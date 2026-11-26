import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us — Muslim Fashion With Purpose",
  description:
    "Learn about Gazaarabia's mission, story, and ethical values. Discover how our UK modest fashion collections support humanitarian relief in Gaza, Palestine, and beyond.",
  alternates: { canonical: "https://gazaarabia.com/about" },
  openGraph: {
    title: "About Us — Muslim Fashion With Purpose | GAZAARABIA",
    description:
      "Discover how Gazaarabia's modest fashion marketplace empowers Muslim brands and supports humanitarian aid.",
    url: "https://gazaarabia.com/about",
    type: "website",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
