import type { Metadata } from "next";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedRegisterForm from "@/components/auth/UnifiedRegisterForm";

export const metadata: Metadata = {
  title: "Register as a Seller | Gazaarabia",
  description: "Join Gazaarabia marketplace as a vendor and sell modest fashion to thousands of UK customers.",
};

export default function SellerRegisterPage() {
  return (
    <UnifiedAuthCard>
      <div className="mb-4 text-center">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-[#009639] border border-emerald-200 rounded-full text-xs font-semibold">
          🏪 Vendor & Merchant Registration
        </span>
      </div>
      <UnifiedRegisterForm initialRole="seller" callbackUrl="/seller" />
    </UnifiedAuthCard>
  );
}
