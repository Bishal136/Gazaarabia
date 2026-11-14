import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Charity & Mission | Ethical Fashion & Relief Initiatives - Gazaarabia",
  description: "Explore Gazaarabia's charity partnerships with Palestine Solidarity Campaign, Al Khair Foundation, and Islamic Relief UK. Modest fashion with purpose.",
};

export default function CharityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
