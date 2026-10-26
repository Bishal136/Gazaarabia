import type { Metadata } from "next";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedLoginForm from "@/components/auth/UnifiedLoginForm";

export const metadata: Metadata = {
  title: "Seller Portal Login | Gazaarabia",
  description: "Sign in to manage your Gazaarabia merchant storefront, inventory, and orders.",
};

export default function SellerLoginPage() {
  return (
    <UnifiedAuthCard>
      <div className="mb-4 text-center">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-[#009639] border border-emerald-200 rounded-full text-xs font-semibold">
          🏪 Vendor & Merchant Portal
        </span>
      </div>
      <UnifiedLoginForm initialRole="seller" callbackUrl="/seller" />
    </UnifiedAuthCard>
  );
}
