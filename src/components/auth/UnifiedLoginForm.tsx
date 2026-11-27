"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession, getSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import GoogleAuthButton from "./GoogleAuthButton";
import OtpVerificationScreen from "./OtpVerificationScreen";
import { mergeLocalCartWithServer } from "@/lib/services/front-end/cartMergeService";
import { useCart } from "@/app/context/CartContext";
import { loadWithExpiry, saveWithExpiry } from "@/lib/helpers/localExpiry";
import { getRedirectUrlByRole } from "@/lib/authRedirect";

interface UnifiedLoginFormProps {
  initialRole?: string;
  callbackUrl?: string;
  onOtpStepChange?: (isOtpStep: boolean) => void;
}

const INPUT_BASE_CLASS =
  "no-focus-ring w-full py-2.5 text-sm text-[#111111] placeholder:text-[#9ca3af] bg-white/65 hover:bg-white/85 focus:bg-white backdrop-blur-md border border-black/[0.10] hover:border-black/[0.18] focus:border-[#111111]/45 focus:outline-none focus:ring-4 focus:ring-black/[0.06] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200";

const LABEL_CLASS =
  "block text-[11px] font-medium text-[#525252] tracking-[0.04em] uppercase mb-1.5";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: { duration: 0.18 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

function UnifiedLoginFormContent({
  initialRole,
  callbackUrl: propCallbackUrl,
  onOtpStepChange,
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

  useEffect(() => {
    onOtpStepChange?.(!!otpRequiredEmail);
  }, [otpRequiredEmail, onOtpStepChange]);

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = loadWithExpiry("gaza_arabia_remember_unified");
    if (rememberedEmail) {
      setForm((p) => ({ ...p, email: rememberedEmail, rememberMe: true }));
    }
  }, []);

  // Handle post-login redirection when NextAuth session is already authenticated on mount
  useEffect(() => {
    if (status === "authenticated" && session?.user && !loading) {
      const userRole = (session.user as any).role || "customer";
      const token = (session.user as any).token;

      if (token) {
        mergeLocalCartWithServer(token).catch(() => {});
        refreshCart().catch(() => {});
      }

      const destination = getRedirectUrlByRole(userRole, callbackUrl);
      router.replace(destination);
    }
  }, [status, session, router, callbackUrl, refreshCart, loading]);

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

      if (form.rememberMe) {
        saveWithExpiry("gaza_arabia_remember_unified", emailTrimmed);
      } else {
        localStorage.removeItem("gaza_arabia_remember_unified");
      }

      setSuccessAlert("Signed in. Redirecting to your account...");

      let userRole = initialRole;
      let freshSession = await getSession();
      if (!freshSession?.user) {
        await new Promise((r) => setTimeout(r, 150));
        freshSession = await getSession();
      }

      if (freshSession?.user) {
        userRole = (freshSession.user as any).role || userRole;
        const token = (freshSession.user as any).token;

        if (token) {
          mergeLocalCartWithServer(token).catch(() => {});
          refreshCart().catch(() => {});
        }
      }

      const destination = getRedirectUrlByRole(userRole, callbackUrl);
      window.location.href = destination;
    } catch (err: any) {
      if (err.requiresOtp) {
        setOtpRequiredEmail(err.email || emailTrimmed);
      } else {
        setErrorAlert(
          err.message || "An unexpected error occurred during login.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Dynamic editorial header based on portal / role
  const getRoleHeader = () => {
    switch (initialRole) {
      case "seller":
        return {
          title: "Seller Sign In",
          subtitle: "Manage your boutique catalog, orders, and payouts.",
        };
      case "admin":
        return {
          title: "Staff Sign In",
          subtitle: "Restricted platform console for authorized personnel.",
        };
      case "affiliate":
        return {
          title: "Partner Sign In",
          subtitle: "Track your campaigns, referrals, and commissions.",
        };
      default:
        return {
          title: "Sign In",
          subtitle: "Access your orders, saved pieces, and account details.",
        };
    }
  };

  const roleInfo = getRoleHeader();
  const isAdmin = initialRole === "admin";

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {otpRequiredEmail ? (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <OtpVerificationScreen
              email={otpRequiredEmail}
              password={form.password}
              role={initialRole || "unified"}
              callbackUrl={callbackUrl}
              onBack={() => {
                setOtpRequiredEmail(null);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="login-step"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-4"
          >
            {/* Header Section */}
            <motion.div variants={itemVariants}>
              <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold text-[#111111] tracking-[-0.02em] leading-tight">
                {roleInfo.title}
              </h1>
              <p className="text-[13px] text-[#666666] mt-1 leading-relaxed">
                {roleInfo.subtitle}
              </p>
            </motion.div>

            {/* Notification Alerts */}
            <AnimatePresence mode="wait">
              {errorAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.99 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    x: [0, -5, 5, -2, 2, 0],
                  }}
                  exit={{ opacity: 0, y: -4, scale: 0.99 }}
                  transition={{ duration: 0.28 }}
                  className="rounded-xl bg-[#fff5f6]/90 backdrop-blur-md border border-[#E82C3F]/20 text-[#9f1239] text-xs px-3.5 py-2.5 flex items-start gap-2.5 shadow-[0_4px_12px_rgba(232,44,63,0.06)]"
                >
                  <AlertCircle className="w-4 h-4 text-[#E82C3F] flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">
                    {errorAlert}
                  </span>
                </motion.div>
              )}

              {successAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="rounded-xl bg-[#f2fbf5]/90 backdrop-blur-md border border-[#009639]/20 text-[#065f46] text-xs px-3.5 py-2.5 flex items-start gap-2.5 shadow-[0_4px_12px_rgba(0,150,57,0.06)]"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#009639] flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">
                    {successAlert}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Email Address */}
              <motion.div variants={itemVariants}>
                <label htmlFor="login-email" className={LABEL_CLASS}>
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 z-10 flex items-center pointer-events-none text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors duration-200">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="name@example.com"
                    className={`${INPUT_BASE_CLASS} pl-10 pr-4`}
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants}>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-medium text-[#525252] tracking-[0.04em] uppercase"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#666666] hover:text-[#111111] font-medium transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 z-10 flex items-center pointer-events-none text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors duration-200">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    placeholder="••••••••"
                    className={`${INPUT_BASE_CLASS} pl-10 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-0 pr-2.5 z-10 flex items-center text-[#8a8a8a] hover:text-[#111111] transition-colors focus:outline-none cursor-pointer"
                  >
                    <span className="p-1 rounded-lg hover:bg-black/[0.05] transition-colors">
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                </div>
              </motion.div>

              {/* Remember Me Checkbox */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between pt-0.5"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={form.rememberMe}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      rememberMe: !prev.rememberMe,
                    }))
                  }
                  className="flex items-center gap-2.5 text-xs text-[#666666] hover:text-[#111111] select-none cursor-pointer group"
                >
                  <span
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-200 ${
                      form.rememberMe
                        ? "bg-[#111111] border-[#111111] text-white shadow-[0_2px_6px_rgba(0,0,0,0.18)]"
                        : "border-black/[0.18] bg-white/75 backdrop-blur-sm group-hover:border-black/[0.35]"
                    }`}
                  >
                    {form.rememberMe && (
                      <Check className="w-3 h-3 stroke-[2.75]" />
                    )}
                  </span>
                  <span className="font-normal text-[#525252] group-hover:text-[#111111] transition-colors">
                    Remember me on this device
                  </span>
                </button>
              </motion.div>

              {/* Submit CTA */}
              <motion.div variants={itemVariants} className="pt-1">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : { y: -1 }}
                  whileTap={loading ? {} : { scale: 0.99 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="group w-full py-3 px-4 bg-[#111111] hover:bg-[#222222] active:bg-[#000000] text-white rounded-xl font-medium text-sm tracking-[0.02em] transition-all duration-200 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_14px_28px_-8px_rgba(0,0,0,0.34)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>

            {/* Social Divider & Google OAuth (Public accounts only, not Admin) */}
            {!isAdmin && (
              <motion.div variants={itemVariants} className="space-y-3.5 pt-0.5">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-black/[0.08]" />
                  <span className="text-[11px] uppercase tracking-[0.14em] font-medium text-[#8a8a8a]">
                    or
                  </span>
                  <span className="h-px flex-1 bg-black/[0.08]" />
                </div>

                <GoogleAuthButton
                  callbackUrl={callbackUrl || "/account/details"}
                />
              </motion.div>
            )}

            {/* Role-Aware Registration & Footer Options */}
            <motion.div variants={itemVariants} className="pt-1">
              {isAdmin ? (
                <div className="text-center space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/75 backdrop-blur-md border border-black/[0.08] text-[11px] text-[#666666] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#111111]/70" />
                    <span>
                      Staff credentials only. Admin registration restricted.
                    </span>
                  </div>
                  <div>
                    <Link
                      href="/"
                      className="text-xs text-[#111111] hover:text-[#E82C3F] font-medium transition-colors"
                    >
                      &larr; Return to Gazaarabia Store
                    </Link>
                  </div>
                </div>
              ) : initialRole === "seller" ? (
                <p className="text-center text-xs text-[#666666]">
                  New merchant?{" "}
                  <Link
                    href={`/seller/register${
                      callbackUrl
                        ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
                        : ""
                    }`}
                    className="text-[#111111] hover:text-[#E82C3F] font-medium transition-colors"
                  >
                    Register as a Seller
                  </Link>
                </p>
              ) : initialRole === "affiliate" ? (
                <p className="text-center text-xs text-[#666666]">
                  Want to earn commissions?{" "}
                  <Link
                    href={`/affiliate/register${
                      callbackUrl
                        ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
                        : ""
                    }`}
                    className="text-[#111111] hover:text-[#E82C3F] font-medium transition-colors"
                  >
                    Apply as an Affiliate
                  </Link>
                </p>
              ) : (
                <p className="text-center text-xs text-[#666666]">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={`/account/register${
                      callbackUrl
                        ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
                        : ""
                    }`}
                    className="text-[#111111] hover:text-[#E82C3F] font-medium transition-colors"
                  >
                    Create Account
                  </Link>
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function UnifiedLoginForm(props: UnifiedLoginFormProps) {
  return (
    <Suspense fallback={null}>
      <UnifiedLoginFormContent {...props} />
    </Suspense>
  );
}
