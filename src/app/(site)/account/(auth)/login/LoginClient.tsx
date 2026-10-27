"use client";

import React, { useState } from "react";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedLoginForm from "@/components/auth/UnifiedLoginForm";

export default function LoginClient() {
  const [isOtpStep, setIsOtpStep] = useState(false);

  return (
    <UnifiedAuthCard activeTab={isOtpStep ? undefined : "login"}>
      <UnifiedLoginForm
        onOtpStepChange={setIsOtpStep}
      />
    </UnifiedAuthCard>
  );
}
