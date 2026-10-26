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
      <div className="mb-4 text-center">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-[#009639] border border-emerald-200 rounded-full text-xs font-semibold">
          🤝 Affiliate & Ambassador Portal
        </span>
      </div>
      <UnifiedLoginForm initialRole="affiliate" callbackUrl="/affiliate" />
    </UnifiedAuthCard>
  );
}
