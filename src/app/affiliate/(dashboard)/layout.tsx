import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ROUTES } from "@/constants/routes";
import "../../globals.css";
import AffiliateLayout from "@/components/affiliate/AffiliateLayout";

export const metadata: Metadata = {
  title: "Affiliate Dashboard",
  description: "Affiliate panel for managing earnings, payouts, and performance.",
  robots: { index: false, follow: false },
};

export default async function AffiliateRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: any = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(ROUTES.AFFILIATE.LOGIN);
  }

  if (session.user.role !== "affiliate") {
    redirect(ROUTES.HOME);
  }

  return (
    <div className="antialiased bg-[#f5f6fa] text-[var(--text-primary)]">
      <AffiliateLayout
        initialAuthorized={true}
        initialAffiliateType={session.user.affiliateType ?? null}
      >
        {children}
      </AffiliateLayout>
    </div>
  );
}
