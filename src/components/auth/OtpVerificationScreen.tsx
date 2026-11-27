"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, Loader2, RotateCw } from "lucide-react";
import { authService } from "@/lib/services/authService";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getRedirectUrlByRole } from "@/lib/authRedirect";

interface OtpVerificationScreenProps {
  email: string;
  password?: string;
  role?: string;
  onSuccess?: (user: any) => void;
  onBack?: () => void;
  callbackUrl?: string;
}

export default function OtpVerificationScreen({
  email,
  password,
  role,
  onSuccess,
  onBack,
  callbackUrl,
}: OtpVerificationScreenProps) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleDigitChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMsg(null);

    // If a digit was entered, auto-focus next
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 6 digits are filled, auto-submit
    const code = newDigits.join("");
    if (code.length === 6) {
      submitOtp(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || "";
    }
    setDigits(newDigits);
    setErrorMsg(null);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === 6) {
      submitOtp(pastedData);
    }
  };

  const submitOtp = async (codeOverride?: string) => {
    const code = codeOverride || digits.join("");
    if (code.length !== 6) {
      setErrorMsg("Please enter all 6 digits of your verification code.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await authService.verifyOtp({
        email,
        otp: code,
      });

      setIsVerified(true);
      setSuccessMsg(res.message || "Email verified successfully!");

      // If callback provides custom hook
      if (onSuccess) {
        onSuccess(res.user);
      }

      // If password provided, establish NextAuth session automatically
      let signInOk = false;
      if (password) {
        try {
          const signInRes = await signIn("credentials", {
            redirect: false,
            email,
            password,
            role: role || res.user?.roleName || "unified",
          });
          signInOk = !!(signInRes && !signInRes.error);
        } catch (e) {
          console.warn("Auto sign-in error after OTP:", e);
        }
      }

      // Determine redirect target
      const loginBase =
        role === "seller"
          ? "/seller/login"
          : role === "affiliate"
          ? "/affiliate/login"
          : "/account/login";

      const targetUrl = signInOk
        ? getRedirectUrlByRole(res.user?.roleName, callbackUrl)
        : `${loginBase}?verified=true&email=${encodeURIComponent(email)}`;

      setTimeout(() => {
        window.location.href = targetUrl;
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    try {
      setResending(true);
      setErrorMsg(null);
      await authService.resendOtp({ email });
      setCountdown(60);
      setSuccessMsg("A fresh 6-digit verification code was sent to your inbox.");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full"
    >
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3.5 rounded-2xl bg-white/85 backdrop-blur-md border border-black/[0.08] flex items-center justify-center text-[#111111] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)]"
        >
          {isVerified ? (
            <CheckCircle2 className="w-6 h-6 text-[#009639]" />
          ) : (
            <Mail className="w-6 h-6" />
          )}
        </motion.div>

        <h2 className="font-serif text-[24px] sm:text-[26px] font-semibold text-[#111111] tracking-[-0.02em] leading-tight">
          {isVerified ? "Verification Complete" : "Check Your Inbox"}
        </h2>
        <p className="text-[#666666] text-[13px] mt-1.5 max-w-sm mx-auto">
          {isVerified
            ? "Your account has been activated. Redirecting to your dashboard..."
            : "Enter the 6-digit code sent to:"}
        </p>
        {!isVerified && (
          <p className="font-medium text-[#111111] text-sm mt-1">{email}</p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 px-3.5 py-2.5 rounded-xl bg-[#fff5f6]/90 backdrop-blur-md border border-[#E82C3F]/20 text-[#9f1239] text-xs flex items-center gap-2.5 shadow-[0_4px_12px_rgba(232,44,63,0.06)]"
          >
            <AlertCircle className="w-4 h-4 text-[#E82C3F] flex-shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 px-3.5 py-2.5 rounded-xl bg-[#f2fbf5]/90 backdrop-blur-md border border-[#009639]/20 text-[#065f46] text-xs flex items-center gap-2.5 shadow-[0_4px_12px_rgba(0,150,57,0.06)]"
          >
            <CheckCircle2 className="w-4 h-4 text-[#009639] flex-shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!isVerified && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitOtp();
          }}
          className="space-y-5"
        >
          {/* 6 Digit Inputs */}
          <div className="flex justify-center gap-2 sm:gap-2.5 my-3">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                disabled={loading}
                className="no-focus-ring w-11 h-12 sm:w-12 sm:h-14 text-center text-2xl font-semibold rounded-xl border border-black/[0.10] bg-white/75 hover:bg-white/90 focus:bg-white backdrop-blur-md text-[#111111] shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)] focus:outline-none focus:ring-4 focus:ring-black/[0.06] focus:border-[#111111]/45 transition-all"
              />
            ))}
          </div>

          <motion.button
            type="submit"
            disabled={loading || digits.join("").length !== 6}
            whileHover={loading || digits.join("").length !== 6 ? {} : { y: -1 }}
            whileTap={loading || digits.join("").length !== 6 ? {} : { scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full py-3 px-4 bg-[#111111] hover:bg-[#222222] active:bg-[#000000] text-white rounded-xl font-medium text-sm tracking-[0.02em] transition-all duration-200 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_14px_28px_-8px_rgba(0,0,0,0.34)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Verifying code...</span>
              </>
            ) : (
              <span>Verify &amp; Continue</span>
            )}
          </motion.button>

          {/* Resend and Countdown */}
          <div className="flex items-center justify-between text-xs text-[#666666] pt-3 border-t border-black/[0.08]">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 text-[#525252] hover:text-[#111111] font-medium hover:underline transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit email</span>
              </button>
            ) : (
              <span />
            )}

            <div>
              {countdown > 0 ? (
                <span className="text-[#666666]">
                  Resend code in <strong className="text-[#111111]">{countdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="flex items-center gap-1 text-[#111111] hover:text-[#E82C3F] font-semibold hover:underline transition-colors"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                  <span>Resend Code</span>
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </motion.div>
  );
}
