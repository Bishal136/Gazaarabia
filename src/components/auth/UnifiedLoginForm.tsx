"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import GoogleAuthButton from "./GoogleAuthButton";
import OtpVerificationScreen from "./OtpVerificationScreen";
import { mergeLocalCartWithServer } from "@/lib/services/front-end/cartMergeService";
import { useCart } from "@/app/context/CartContext";
import { loadWithExpiry, saveWithExpiry } from "@/lib/helpers/localExpiry";
import { getRedirectUrlByRole } from "@/lib/authRedirect";

interface UnifiedLoginFormProps {
  initialRole?: string;
  callbackUrl?: string;
}

export default function UnifiedLoginForm({
  initialRole,
  callbackUrl: propCallbackUrl,
}: UnifiedLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { refreshCart } = useCart();

  const callbackUrl = propCallbackUrl || searchParams.get("callbackUrl") || "";

  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [successAlert, setSuccessAlert] = useState<string | null>(null);

  // OTP Fallback state if user is unverified
  const [otpRequiredEmail, setOtpRequiredEmail] = useState<string | null>(null);

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = loadWithExpiry("gaza_arabia_remember_unified");
    if (rememberedEmail) {
      setForm((p) => ({ ...p, email: rememberedEmail, rememberMe: true }));
    }
  }, []);

  // Handle post-login redirection when NextAuth session resolves
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const userRole = (session.user as any).role || "customer";
      const token = (session.user as any).token;

      if (token) {
        mergeLocalCartWithServer(token).catch(() => {});
        refreshCart().catch(() => {});
      }

      const destination = getRedirectUrlByRole(userRole, callbackUrl);
      router.replace(destination);
    }
  }, [status, session, router, callbackUrl, refreshCart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert(null);
    setSuccessAlert(null);

    const emailTrimmed = form.email.trim().toLowerCase();
    const passwordTrimmed = form.password.trim();

    if (!emailTrimmed || !passwordTrimmed) {
      setErrorAlert("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const response: any = await signIn("credentials", {
        redirect: false,
        email: emailTrimmed,
        password: passwordTrimmed,
        role: initialRole || "unified",
      });

      if (response?.error) {
        // If error indicates unverified OTP
        if (
          response.error.toLowerCase().includes("verify your email") ||
          response.error.toLowerCase().includes("otp")
        ) {
          setOtpRequiredEmail(emailTrimmed);
          return;
        }

        const msg =
          response.error === "CredentialsSignin"
            ? "Invalid email or password. Please double-check your credentials."
            : response.error;
        setErrorAlert(msg);
        return;
      }

      // Remember Me persistence
      if (form.rememberMe) {
        saveWithExpiry("gaza_arabia_remember_unified", emailTrimmed);
      } else {
        localStorage.removeItem("gaza_arabia_remember_unified");
      }

      setSuccessAlert("Login successful! Redirecting to your dashboard...");
    } catch (err: any) {
      if (err.requiresOtp) {
        setOtpRequiredEmail(err.email || emailTrimmed);
      } else {
        setErrorAlert(err.message || "An unexpected error occurred during login.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {otpRequiredEmail ? (
          <OtpVerificationScreen
            key="otp-step"
            email={otpRequiredEmail}
            callbackUrl={callbackUrl}
            onBack={() => setOtpRequiredEmail(null)}
          />
        ) : (
          <motion.div
            key="login-step"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-gray-500 text-sm mt-1.5">
                Sign in to manage orders, products, or account settings
              </p>
            </div>

            {/* Alerts */}
            <AnimatePresence mode="wait">
              {errorAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorAlert}</span>
                </motion.div>
              )}

              {successAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successAlert}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all bg-white"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Password
                  </label>
                  <a
                    href="/forgot-password"
                    className="text-xs text-[#009639] hover:text-[#007a2e] font-medium hover:underline transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={form.password}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.rememberMe}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, rememberMe: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#009639] border-gray-300 rounded focus:ring-[#009639] cursor-pointer"
                  />
                  <span>Remember me on this device</span>
                </label>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3.5 px-4 bg-[#009639] hover:bg-[#007a2e] text-white rounded-xl font-semibold text-sm transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-400 font-medium tracking-wider">
                  or continue with
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <GoogleAuthButton callbackUrl={callbackUrl || "/account/details"} />

            {/* Switch to Register */}
            <p className="text-center text-xs text-gray-500 pt-3">
              Don’t have an account?{" "}
              <a
                href={`/account/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                className="text-[#009639] font-semibold hover:underline"
              >
                Create an account
              </a>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
