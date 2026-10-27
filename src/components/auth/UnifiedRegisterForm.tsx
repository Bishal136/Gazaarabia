"use client";

import React, { useState } from "react";
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
  Check,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import GoogleAuthButton from "./GoogleAuthButton";
import OtpVerificationScreen from "./OtpVerificationScreen";
import { authService } from "@/lib/services/authService";

interface UnifiedRegisterFormProps {
  initialRole?: string;
  callbackUrl?: string;
}

type PublicRole = "customer" | "seller" | "affiliate";

const ROLE_OPTIONS = [
  {
    id: "customer" as PublicRole,
    label: "Customer",
    tagline: "Shop modest luxury & support causes",
    icon: ShoppingBag,
  },
  {
    id: "seller" as PublicRole,
    label: "Seller / Brand",
    tagline: "Sell your boutique fashion & access buyers",
    icon: Store,
  },
  {
    id: "affiliate" as PublicRole,
    label: "Affiliate Partner",
    tagline: "Earn commissions by sharing collections",
    icon: Share2,
  },
];

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    x: -12,
    transition: { duration: 0.2 },
  },
};

const itemVariants: any = {
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

export default function UnifiedRegisterForm({
  initialRole = "customer",
  callbackUrl: propCallbackUrl,
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

  // Header info based on portal / role
  const getRoleHeader = () => {
    switch (initialRole) {
      case "seller":
        return {
          badge: "Seller Onboarding",
          badgeIcon: Store,
          title: "Create Seller Account",
          subtitle: "Join our curated collective of UK modest fashion brands",
        };
      case "affiliate":
        return {
          badge: "Partner Program",
          badgeIcon: Sparkles,
          title: "Affiliate Registration",
          subtitle:
            "Promote modest luxury collections & earn competitive commissions",
        };
      default:
        return {
          badge: "Join the Movement",
          badgeIcon: ShoppingBag,
          title: "Create an Account",
          subtitle: "Join Gazaarabia — The UK Modest Fashion Movement",
        };
    }
  };

  const roleInfo = getRoleHeader();
  const BadgeIcon = roleInfo.badgeIcon;

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {pendingOtpEmail ? (
          <motion.div
            key="otp-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <OtpVerificationScreen
              email={pendingOtpEmail}
              password={form.password}
              role={selectedRole}
              callbackUrl={callbackUrl}
              onBack={() => setPendingOtpEmail(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="register-step"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-5"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="text-center">
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

            {/* Role Selection Cards (Visible if in generic registration) */}
            {initialRole !== "seller" && initialRole !== "affiliate" && (
              <motion.div variants={itemVariants}>
                <label className="block text-xs font-semibold text-gray-700 tracking-wide mb-2">
                  Select Account Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedRole === opt.id;
                    return (
                      <motion.button
                        key={opt.id}
                        type="button"
                        whileHover={{ scale: 1.015 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                          setSelectedRole(opt.id);
                          setErrorAlert(null);
                        }}
                        className={`relative flex flex-col items-start text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "border-[#009639] bg-emerald-50/50 ring-2 ring-[#009639]/15 shadow-xs"
                            : "border-gray-200 bg-gray-50/40 hover:bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-[#009639] text-white shadow-xs"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                              className="w-4 h-4 rounded-full bg-[#009639] text-white flex items-center justify-center shadow-xs"
                            >
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </motion.div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {opt.label}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 leading-tight">
                          {opt.tagline}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Error Alert */}
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
                  <span className="leading-relaxed font-medium">
                    {errorAlert}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold text-gray-700 tracking-wide"
                >
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#009639] group-focus-within:scale-105 transition-all duration-200">
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
                    placeholder="e.g. Maryam Khan"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#009639] focus:ring-4 focus:ring-[#009639]/10 transition-all duration-200"
                  />
                </div>
              </motion.div>

              {/* Email & Phone Grid */}
              <motion.div
                variants={itemVariants}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-email"
                    className="block text-xs font-semibold text-gray-700 tracking-wide"
                  >
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#009639] group-focus-within:scale-105 transition-all duration-200">
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
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#009639] focus:ring-4 focus:ring-[#009639]/10 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-phone"
                    className="block text-xs font-semibold text-gray-700 tracking-wide"
                  >
                    Phone Number
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#009639] group-focus-within:scale-105 transition-all duration-200">
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#009639] focus:ring-4 focus:ring-[#009639]/10 transition-all duration-200"
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
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label
                      htmlFor="reg-shop"
                      className="block text-xs font-semibold text-gray-700 tracking-wide"
                    >
                      Boutique / Brand Name{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#009639] group-focus-within:scale-105 transition-all duration-200">
                        <Store className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-shop"
                        type="text"
                        name="shopName"
                        value={form.shopName}
                        onChange={handleChange}
                        placeholder="e.g. Al-Noor Modestwear"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#009639] focus:ring-4 focus:ring-[#009639]/10 transition-all duration-200"
                      />
                    </div>
                  </motion.div>
                )}

                {selectedRole === "affiliate" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label
                      htmlFor="reg-website"
                      className="block text-xs font-semibold text-gray-700 tracking-wide"
                    >
                      Website / Social Profile URL
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#009639] group-focus-within:scale-105 transition-all duration-200">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-website"
                        type="text"
                        name="website"
                        value={form.website}
                        onChange={handleChange}
                        placeholder="https://instagram.com/yourhandle"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#009639] focus:ring-4 focus:ring-[#009639]/10 transition-all duration-200"
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
                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-semibold text-gray-700 tracking-wide"
                  >
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#009639] group-focus-within:scale-105 transition-all duration-200">
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
                      placeholder="Min 8 characters"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#009639] focus:ring-4 focus:ring-[#009639]/10 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
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
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-confirm-password"
                    className="block text-xs font-semibold text-gray-700 tracking-wide"
                  >
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#009639] group-focus-within:scale-105 transition-all duration-200">
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
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 text-sm placeholder-gray-400 focus:bg-white focus:outline-none focus:border-[#009639] focus:ring-4 focus:ring-[#009639]/10 transition-all duration-200"
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
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                    >
                      <motion.div
                        key={showConfirmPassword ? "hide" : "show"}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="p-1 rounded-md hover:bg-gray-100/80 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </motion.div>
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Password Requirement Hint */}
              <motion.p
                variants={itemVariants}
                className="text-[11px] text-gray-400 leading-normal font-medium"
              >
                Must be at least 8 characters with a mix of letters and numbers.
              </motion.p>

              {/* Submit Button */}
              <motion.div variants={itemVariants} className="pt-1">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : { scale: 1.012, y: -1 }}
                  whileTap={loading ? {} : { scale: 0.988, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="group relative w-full overflow-hidden py-3 px-4 bg-gradient-to-r from-[#009639] via-[#008d35] to-[#007a2e] hover:from-[#008733] hover:to-[#007029] text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-emerald-700/20 hover:shadow-lg hover:shadow-emerald-700/30 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none ease-in-out" />

                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Creating your account...</span>
                    </>
                  ) : (
                    <>
                      <span>Register & Verify Email</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>

            {/* Social Divider & Google OAuth (Customer / public roles) */}
            {selectedRole === "customer" && (
              <motion.div variants={itemVariants} className="space-y-4 pt-1">
                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
                    <span className="bg-white px-3 text-gray-400">
                      or sign up with
                    </span>
                  </div>
                </div>

                <GoogleAuthButton
                  callbackUrl={callbackUrl || "/account/details"}
                  text="Continue with Google"
                />
              </motion.div>
            )}

            {/* Switch to Login Link */}
            <motion.div variants={itemVariants} className="pt-2">
              <p className="text-center text-xs text-gray-500">
                Already have an account?{" "}
                <Link
                  href={`/account/login${
                    callbackUrl
                      ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
                      : ""
                  }`}
                  className="text-[#009639] font-semibold hover:underline"
                >
                  Log In
                </Link>
              </p>

              {/* Trust Badge */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 pt-4 font-medium"></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
