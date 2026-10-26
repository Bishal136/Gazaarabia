import type { Metadata } from "next";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedLoginForm from "@/components/auth/UnifiedLoginForm";

export const metadata: Metadata = {
  title: "Affiliate Partner Login | Gazaarabia",
  description: "Sign in to your Gazaarabia Affiliate partner dashboard to view commissions and analytics.",
};

export default function AffiliateLoginPage() {
  return (
    <UnifiedAuthCard>
      <UnifiedLoginForm initialRole="affiliate" callbackUrl="/affiliate" />
    </UnifiedAuthCard>
  );
}
