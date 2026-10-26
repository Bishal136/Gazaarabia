import type { Metadata } from "next";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedLoginForm from "@/components/auth/UnifiedLoginForm";

export const metadata: Metadata = {
  title: "Sign In | Gazaarabia",
  description: "Sign in to your Gazaarabia account to manage orders, wishlist, or vendor dashboard.",
};

export default function LoginPage() {
  return (
    <UnifiedAuthCard activeTab="login">
      <UnifiedLoginForm />
    </UnifiedAuthCard>
  );
}
