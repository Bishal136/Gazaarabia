"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
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
  Store,
  Sparkles,
  ShoppingBag,
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
}

// Staggered motion variants for smooth entrance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    x: -12,
    transition: { duration: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 28,
    },
  },
};

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

  // Dynamic context based on portal / role
  const getRoleHeader = () => {
    switch (initialRole) {
      case "seller":
        return {
          badge: "Seller Center",
          badgeIcon: Store,
          title: "Vendor Sign In",
          subtitle: "Access your boutique catalog, orders, and sales performance",
        };
      case "admin":
        return {
          badge: "Security Console",
          badgeIcon: ShieldCheck,
          title: "Staff Sign In",
          subtitle: "Restricted platform management console for authorized staff",
        };
      case "affiliate":
        return {
          badge: "Affiliate Network",
          badgeIcon: Sparkles,
          title: "Partner Sign In",
          subtitle: "Track your affiliate campaigns, clicks, and commission earnings",
        };
      default:
        return {
          badge: "Modest Fashion Hub",
          badgeIcon: ShoppingBag,
          title: "Welcome Back",
          subtitle: "Sign in to access your orders, saved styles, and account preferences",
        };
    }
  };

  const roleInfo = getRoleHeader();
  const BadgeIcon = roleInfo.badgeIcon;
  const isAdmin = initialRole === "admin";

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {otpRequiredEmail ? (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <OtpVerificationScreen
              email={otpRequiredEmail}
              callbackUrl={callbackUrl}
              onBack={() => setOtpRequiredEmail(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="login-step"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-5"
          >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="text-center">
              {/* Context Pill Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#009639] border border-emerald-200/60 shadow-xs mb-2.5">
                <BadgeIcon className="w-3.5 h-3.5" />
                <span>{roleInfo.badge}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                {roleInfo.title}
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">
                {roleInfo.subtitle}
              </p>
            </motion.div>

            {/* Notification Alerts */}
            <AnimatePresence mode="wait">
              {errorAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    x: [0, -6, 6, -3, 3, 0],
                  }}
                  exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5 shadow-xs"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{errorAlert}</span>
                </motion.div>
              )}

              {successAlert && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-start gap-2.5 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{successAlert}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-gray-700 tracking-wide"
                >
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#009639] group-focus-within:scale-105 transition-all duration-200">
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#009639] focus:ring-4 focus:ring-[#009639]/10 transition-all duration-200"
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-gray-700 tracking-wide"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#009639] hover:text-[#007a2e] font-semibold hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#009639] group-focus-within:scale-105 transition-all duration-200">
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
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#009639] focus:ring-4 focus:ring-[#009639]/10 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                  >
                    <motion.div
                      key={showPassword ? "hide" : "show"}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="p-1 rounded-md hover:bg-gray-100/80 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </motion.div>
                  </button>
                </div>
              </motion.div>

              {/* Remember Me Checkbox */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-between pt-1"
              >
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, rememberMe: !prev.rememberMe }))
                  }
                  className="flex items-center gap-2.5 text-xs text-gray-600 hover:text-gray-900 select-none cursor-pointer group"
                >
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-200 ${
                      form.rememberMe
                        ? "bg-[#009639] border-[#009639] text-white shadow-xs"
                        : "border-gray-300 bg-white group-hover:border-gray-400"
                    }`}
                  >
                    {form.rememberMe && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </motion.div>
                    )}
                  </div>
                  <span className="font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                    Remember me on this device
                  </span>
                </button>
              </motion.div>

              {/* Submit CTA */}
              <motion.div variants={itemVariants} className="pt-1">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : { scale: 1.012, y: -1 }}
                  whileTap={loading ? {} : { scale: 0.988, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="group relative w-full overflow-hidden py-3 px-4 bg-gradient-to-r from-[#009639] via-[#008d35] to-[#007a2e] hover:from-[#008733] hover:to-[#007029] text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {/* Subtle Shimmer Sweep */}
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none ease-in-out" />

                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>

            {/* Social Divider & Google OAuth (Public accounts only, not Admin) */}
            {!isAdmin && (
              <motion.div variants={itemVariants} className="space-y-4 pt-1">
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
                    <span className="bg-white px-3 text-gray-400">
                      or continue with
                    </span>
                  </div>
                </div>

                <GoogleAuthButton callbackUrl={callbackUrl || "/account/details"} />
              </motion.div>
            )}

            {/* Role-Aware Registration & Footer Options */}
            <motion.div variants={itemVariants} className="pt-2">
              {isAdmin ? (
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200/80 text-[11px] text-gray-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
                    <span>Staff credentials only. Admin registration restricted.</span>
                  </div>
                  <div>
                    <Link
                      href="/"
                      className="text-xs text-[#009639] hover:text-[#007a2e] font-semibold hover:underline"
                    >
                      ← Return to Gazaarabia Store
                    </Link>
                  </div>
                </div>
              ) : initialRole === "seller" ? (
                <p className="text-center text-xs text-gray-500">
                  New merchant?{" "}
                  <Link
                    href={`/seller/register${
                      callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
                    }`}
                    className="text-[#009639] font-semibold hover:underline"
                  >
                    Register as a Seller
                  </Link>
                </p>
              ) : initialRole === "affiliate" ? (
                <p className="text-center text-xs text-gray-500">
                  Want to earn commissions?{" "}
                  <Link
                    href={`/affiliate/register${
                      callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
                    }`}
                    className="text-[#009639] font-semibold hover:underline"
                  >
                    Apply as an Affiliate
                  </Link>
                </p>
              ) : (
                <p className="text-center text-xs text-gray-500">
                  Don’t have an account?{" "}
                  <Link
                    href={`/account/register${
                      callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
                    }`}
                    className="text-[#009639] font-semibold hover:underline"
                  >
                    Create an account
                  </Link>
                </p>
              )}

              {/* Trust Badge */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 pt-4 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#009639]" />
                <span>Bank-grade 256-bit TLS encrypted security</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
