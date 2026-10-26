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
      <div className="mb-4 text-center">
        <span className="inline-block px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-semibold">
          🛡️ Administrator Console
        </span>
      </div>
      <UnifiedLoginForm initialRole="admin" callbackUrl="/admin" />
    </UnifiedAuthCard>
  );
}
