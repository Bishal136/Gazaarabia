import type { Metadata } from "next";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedLoginForm from "@/components/auth/UnifiedLoginForm";

export const metadata: Metadata = {
  title: "Admin Portal Login | Gazaarabia",
  description: "Secure administrator sign-in for the Gazaarabia platform management console.",
};

export default function AdminLoginPage() {
  return (
    <UnifiedAuthCard>
      <UnifiedLoginForm initialRole="admin" callbackUrl="/admin" />
    </UnifiedAuthCard>
  );
}
