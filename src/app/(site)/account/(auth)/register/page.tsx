import type { Metadata } from "next";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedRegisterForm from "@/components/auth/UnifiedRegisterForm";

export const metadata: Metadata = {
  title: "Create Account | Gazaarabia",
  description: "Join Gazaarabia as a Customer, Seller, or Affiliate partner with email verification.",
};

export default function RegisterPage() {
  return (
    <UnifiedAuthCard activeTab="register">
      <UnifiedRegisterForm initialRole="customer" />
    </UnifiedAuthCard>
  );
}
