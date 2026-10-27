"use client";

import React, { useState } from "react";
import UnifiedAuthCard from "@/components/auth/UnifiedAuthCard";
import UnifiedRegisterForm from "@/components/auth/UnifiedRegisterForm";

export default function RegisterClient() {
  const [isOtpStep, setIsOtpStep] = useState(false);

  return (
    <UnifiedAuthCard activeTab={isOtpStep ? undefined : "register"}>
      <UnifiedRegisterForm
        initialRole="customer"
        onOtpStepChange={setIsOtpStep}
      />
    </UnifiedAuthCard>
  );
}
