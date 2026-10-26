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
      <UnifiedRegisterForm initialRole="seller" callbackUrl="/seller" />
    </UnifiedAuthCard>
  );
}
