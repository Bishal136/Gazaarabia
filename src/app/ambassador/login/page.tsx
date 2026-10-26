import type { Metadata } from "next";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedLoginForm from "@/components/auth/UnifiedLoginForm";

export const metadata: Metadata = {
  title: "Ambassador Portal Login | Gazaarabia",
  description: "Sign in to your Gazaarabia Brand Ambassador dashboard to track referrals and payouts.",
};

export default function AmbassadorLoginPage() {
  return (
    <UnifiedAuthCard>
      <UnifiedLoginForm initialRole="affiliate" callbackUrl="/affiliate" />
    </UnifiedAuthCard>
  );
}
