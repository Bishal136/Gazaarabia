import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Gazaarabia | Muslim Fashion With Purpose",
  description: "Learn about Gazaarabia's mission, story, and values. Discover how our modest fashion collections support humanitarian causes in Gaza, Palestine, and beyond.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
