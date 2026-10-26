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
      <div className="mb-4 text-center">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-[#009639] border border-emerald-200 rounded-full text-xs font-semibold">
          🤝 Affiliate Partner Registration
        </span>
      </div>
      <UnifiedRegisterForm initialRole="affiliate" callbackUrl="/affiliate" />
    </UnifiedAuthCard>
  );
}
