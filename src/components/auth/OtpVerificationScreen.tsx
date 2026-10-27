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
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#009639] shadow-inner"
        >
          {isVerified ? (
            <CheckCircle2 className="w-8 h-8 text-[#009639]" />
          ) : (
            <Mail className="w-8 h-8" />
          )}
        </motion.div>

        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          {isVerified ? "Verification Complete!" : "Check Your Inbox"}
        </h2>
        <p className="text-gray-600 text-sm mt-1.5 max-w-sm mx-auto">
          {isVerified
            ? "Your account has been activated. Redirecting to your dashboard..."
            : "Enter the 6-digit code sent to:"}
        </p>
        {!isVerified && (
          <p className="font-semibold text-gray-900 text-sm mt-0.5">{email}</p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}

        {successMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
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
          className="space-y-6"
        >
          {/* 6 Digit Inputs */}
          <div className="flex justify-center gap-2 sm:gap-3 my-4">
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
                className="w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-bold rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all shadow-sm"
              />
            ))}
          </div>

          <motion.button
            type="submit"
            disabled={loading || digits.join("").length !== 6}
            whileHover={loading || digits.join("").length !== 6 ? {} : { scale: 1.012, y: -1 }}
            whileTap={loading || digits.join("").length !== 6 ? {} : { scale: 0.988, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="group relative w-full overflow-hidden py-3.5 px-4 bg-gradient-to-r from-[#009639] via-[#008d35] to-[#007a2e] hover:from-[#008733] hover:to-[#007029] text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none ease-in-out" />
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Verifying code...</span>
              </>
            ) : (
              <span>Verify & Continue</span>
            )}
          </motion.button>

          {/* Resend and Countdown */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-medium hover:underline transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit email</span>
              </button>
            ) : (
              <span />
            )}

            <div>
              {countdown > 0 ? (
                <span className="text-gray-400">
                  Resend code in <strong className="text-gray-700">{countdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="flex items-center gap-1 text-[#009639] hover:text-[#007a2e] font-semibold hover:underline transition-colors"
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
