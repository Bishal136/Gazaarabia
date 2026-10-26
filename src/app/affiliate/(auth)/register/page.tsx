import type { Metadata } from "next";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedRegisterForm from "@/components/auth/UnifiedRegisterForm";

export const metadata: Metadata = {
  title: "Join Affiliate Partner Program | Gazaarabia",
  description: "Sign up as an Affiliate or Brand Ambassador on Gazaarabia and earn recurring commissions.",
};

export default function AffiliateRegisterPage() {
  return (
    <UnifiedAuthCard>
      <UnifiedRegisterForm initialRole="affiliate" callbackUrl="/affiliate" />
    </UnifiedAuthCard>
  );
}
