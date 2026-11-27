"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  ShoppingBag,
  Store,
  Share2,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import GoogleAuthButton from "./GoogleAuthButton";
import OtpVerificationScreen from "./OtpVerificationScreen";
import { authService } from "@/lib/services/authService";

interface UnifiedRegisterFormProps {
  initialRole?: string;
  callbackUrl?: string;
  onOtpStepChange?: (isOtpStep: boolean) => void;
}

type PublicRole = "customer" | "seller" | "affiliate";

const ROLE_OPTIONS: {
  id: PublicRole;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "customer",
    label: "Customer",
    icon: ShoppingBag,
  },
  {
    id: "seller",
    label: "Seller / Brand",
    icon: Store,
  },
];

const INPUT_BASE_CLASS =
  "no-focus-ring w-full py-2.5 text-sm text-[#111111] placeholder:text-[#9ca3af] bg-white/65 hover:bg-white/85 focus:bg-white backdrop-blur-md border border-black/[0.10] hover:border-black/[0.18] focus:border-[#111111]/45 focus:outline-none focus:ring-4 focus:ring-black/[0.06] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200";

const LABEL_CLASS =
  "block text-[11px] font-medium text-[#525252] tracking-[0.04em] uppercase mb-1.5";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
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

function UnifiedRegisterFormContent({
  initialRole = "customer",
  callbackUrl: propCallbackUrl,
  onOtpStepChange,
}: UnifiedRegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = propCallbackUrl || searchParams.get("callbackUrl") || "";

  // Sanitize initial role to ensure admin can never be set
  const cleanInitialRole: PublicRole =
    initialRole === "seller" || initialRole === "affiliate"
      ? initialRole
      : "customer";

  const [selectedRole, setSelectedRole] =
    useState<PublicRole>(cleanInitialRole);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    shopName: "",
    website: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // State when OTP is required to activate
  const [pendingOtpEmail, setPendingOtpEmail] = useState<string | null>(null);

  React.useEffect(() => {
    onOtpStepChange?.(!!pendingOtpEmail);
  }, [pendingOtpEmail, onOtpStepChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrorAlert(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAlert(null);

    const email = form.email.trim().toLowerCase();
    const name = form.name.trim();

    if (!name || !email || !form.password) {
      setErrorAlert("Please complete all required fields.");
      return;
    }

    if (form.password.length < 8) {
      setErrorAlert("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setErrorAlert("Password must contain a mix of letters and numbers.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorAlert("Passwords do not match. Please verify both entries.");
      return;
    }

    try {
      setLoading(true);

      const res = await authService.signup({
        name,
        email,
        phone: form.phone.trim(),
        password: form.password,
        role: selectedRole,
        shopName: selectedRole === "seller" ? form.shopName.trim() : undefined,
        website: selectedRole === "affiliate" ? form.website.trim() : undefined,
      });

      if (res.requiresOtp) {
        setPendingOtpEmail(email);
      } else {
        router.push(`/account/login?email=${encodeURIComponent(email)}`);
      }
    } catch (err: any) {
      setErrorAlert(
        err.message || "An error occurred during account registration.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Editorial header info based on portal / role
  const getRoleHeader = () => {
    switch (initialRole) {
      case "seller":
        return {
          title: "Create Seller Account",
          subtitle: "Apply to showcase your boutique on Gazaarabia.",
        };
      case "affiliate":
        return {
          title: "Partner Registration",
          subtitle: "Share curated collections and earn commissions.",
        };
      default:
        return {
          title: "Create Account",
          subtitle: "Shop curated modest fashion and manage your orders.",
        };
    }
  };

  const roleInfo = getRoleHeader();

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {pendingOtpEmail ? (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <OtpVerificationScreen
              email={pendingOtpEmail}
              password={form.password}
              role={selectedRole}
              callbackUrl={callbackUrl}
              onBack={() => {
                setPendingOtpEmail(null);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="register-step"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-3"
          >
            {/* Header */}
            <motion.div variants={itemVariants}>
              <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold text-[#111111] tracking-[-0.02em] leading-tight">
                {roleInfo.title}
              </h1>
              <p className="text-[13px] text-[#666666] mt-1 leading-snug">
                {roleInfo.subtitle}
              </p>
            </motion.div>

            {/* Sleek Frosted-Glass Segmented Role Switcher */}
            {initialRole !== "seller" && initialRole !== "affiliate" && (
              <motion.div variants={itemVariants}>
                <div
                  role="tablist"
                  aria-label="Account type"
                  className="grid grid-cols-2 p-1 rounded-xl bg-black/[0.04] backdrop-blur-md border border-black/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
                >
                  {ROLE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedRole === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedRole(opt.id);
                          setErrorAlert(null);
                        }}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-[9px] text-xs transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "bg-white text-[#111111] font-medium shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)] ring-1 ring-black/[0.05]"
                            : "text-[#666666] hover:text-[#111111] font-normal"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Error Alert */}
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
            </AnimatePresence>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Full Name */}
              <motion.div variants={itemVariants}>
                <label htmlFor="reg-name" className={LABEL_CLASS}>
                  Full Name <span className="text-[#E82C3F]">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 z-10 flex items-center pointer-events-none text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors duration-200">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-name"
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Maryam Khan"
                    className={`${INPUT_BASE_CLASS} pl-10 pr-4`}
                  />
                </div>
              </motion.div>

              {/* Email & Phone Grid */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div>
                  <label htmlFor="reg-email" className={LABEL_CLASS}>
                    Email Address <span className="text-[#E82C3F]">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 z-10 flex items-center pointer-events-none text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors duration-200">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@email.com"
                      className={`${INPUT_BASE_CLASS} pl-9 pr-3`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-phone" className={LABEL_CLASS}>
                    Phone Number
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 z-10 flex items-center pointer-events-none text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors duration-200">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-phone"
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+44 7123 456789"
                      className={`${INPUT_BASE_CLASS} pl-9 pr-3`}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Contextual Role Fields */}
              <AnimatePresence>
                {selectedRole === "seller" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <label htmlFor="reg-shop" className={LABEL_CLASS}>
                      Boutique / Brand Name{" "}
                      <span className="text-[#E82C3F]">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 z-10 flex items-center pointer-events-none text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors duration-200">
                        <Store className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-shop"
                        type="text"
                        name="shopName"
                        value={form.shopName}
                        onChange={handleChange}
                        placeholder="Al-Noor Modestwear"
                        className={`${INPUT_BASE_CLASS} pl-10 pr-4`}
                      />
                    </div>
                  </motion.div>
                )}

                {selectedRole === "affiliate" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <label htmlFor="reg-website" className={LABEL_CLASS}>
                      Website / Social Profile URL
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 z-10 flex items-center pointer-events-none text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors duration-200">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-website"
                        type="text"
                        name="website"
                        value={form.website}
                        onChange={handleChange}
                        placeholder="https://instagram.com/yourhandle"
                        className={`${INPUT_BASE_CLASS} pl-10 pr-4`}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Password & Confirm Password Grid */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div>
                  <label htmlFor="reg-password" className={LABEL_CLASS}>
                    Password <span className="text-[#E82C3F]">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 z-10 flex items-center pointer-events-none text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors duration-200">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      required
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min 8 chars"
                      className={`${INPUT_BASE_CLASS} pl-9 pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute inset-y-0 right-0 pr-2 z-10 flex items-center text-[#8a8a8a] hover:text-[#111111] transition-colors focus:outline-none cursor-pointer"
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
                </div>

                <div>
                  <label htmlFor="reg-confirm-password" className={LABEL_CLASS}>
                    Confirm Password <span className="text-[#E82C3F]">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 z-10 flex items-center pointer-events-none text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors duration-200">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      autoComplete="new-password"
                      required
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter"
                      className={`${INPUT_BASE_CLASS} pl-9 pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      className="absolute inset-y-0 right-0 pr-2 z-10 flex items-center text-[#8a8a8a] hover:text-[#111111] transition-colors focus:outline-none cursor-pointer"
                    >
                      <span className="p-1 rounded-lg hover:bg-black/[0.05] transition-colors">
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Password Requirement Hint */}
              <motion.p
                variants={itemVariants}
                className="text-[11px] text-[#737373] leading-snug -mt-1"
              >
                Use at least 8 characters with a mix of letters and numbers.
              </motion.p>

              {/* Submit Button */}
              <motion.div variants={itemVariants} className="pt-0.5">
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
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>

            {/* Social Divider & Google OAuth (Customer role) */}
            {selectedRole === "customer" && (
              <motion.div variants={itemVariants} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-black/[0.08]" />
                  <span className="text-[11px] uppercase tracking-[0.14em] font-medium text-[#8a8a8a]">
                    or
                  </span>
                  <span className="h-px flex-1 bg-black/[0.08]" />
                </div>

                <GoogleAuthButton
                  callbackUrl={callbackUrl || "/account/details"}
                  text="Continue with Google"
                />
              </motion.div>
            )}

            {/* Switch to Login Link */}
            <motion.div variants={itemVariants} className="pt-0.5">
              <p className="text-center text-xs text-[#666666]">
                Already have an account?{" "}
                <Link
                  href={`/account/login${
                    callbackUrl
                      ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
                      : ""
                  }`}
                  className="text-[#111111] hover:text-[#E82C3F] font-medium transition-colors"
                >
                  Sign In
                </Link>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function UnifiedRegisterForm(props: UnifiedRegisterFormProps) {
  return (
    <Suspense fallback={null}>
      <UnifiedRegisterFormContent {...props} />
    </Suspense>
  );
}
