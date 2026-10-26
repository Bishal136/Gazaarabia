import type { Metadata } from "next";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedRegisterForm from "@/components/auth/UnifiedRegisterForm";

export const metadata: Metadata = {
  title: "Ambassador Program Registration | Gazaarabia",
  description: "Apply to become a Gazaarabia Brand Ambassador and share modest fashion with your community.",
};

export default function AmbassadorRegisterPage() {
  return (
    <UnifiedAuthCard>
      <div className="mb-4 text-center">
        <span className="inline-block px-3 py-1 bg-emerald-50 text-[#009639] border border-emerald-200 rounded-full text-xs font-semibold">
          ✨ Brand Ambassador Registration
        </span>
      </div>
      <UnifiedRegisterForm initialRole="affiliate" callbackUrl="/affiliate" />
    </UnifiedAuthCard>
  );
}
