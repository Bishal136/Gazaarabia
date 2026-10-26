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
      <UnifiedRegisterForm initialRole="affiliate" callbackUrl="/affiliate" />
    </UnifiedAuthCard>
  );
}
