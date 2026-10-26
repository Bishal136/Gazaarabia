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
      <UnifiedLoginForm initialRole="seller" callbackUrl="/seller" />
    </UnifiedAuthCard>
  );
}
