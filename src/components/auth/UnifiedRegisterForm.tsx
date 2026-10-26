"use client";

import React, { useState } from "react";
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
    tagline: "Shop modest collections & track orders",
    icon: ShoppingBag,
  },
  {
    id: "seller" as PublicRole,
    label: "Seller / Brand",
    tagline: "Sell your boutique fashion on Gazaarabia",
    icon: Store,
  },
  {
    id: "affiliate" as PublicRole,
    label: "Affiliate Partner",
    tagline: "Promote products & earn commissions",
    icon: Share2,
  },
];

export default function UnifiedRegisterForm({
  initialRole = "customer",
  callbackUrl: propCallbackUrl,
}: UnifiedRegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = propCallbackUrl || searchParams.get("callbackUrl") || "";

  // Sanitize initial role to ensure admin can never be set
  const cleanInitialRole: PublicRole =
    initialRole === "seller" || initialRole === "affiliate" ? initialRole : "customer";

  const [selectedRole, setSelectedRole] = useState<PublicRole>(cleanInitialRole);
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
      setErrorAlert(err.message || "An error occurred during account registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {pendingOtpEmail ? (
          <OtpVerificationScreen
            key="otp-step"
            email={pendingOtpEmail}
            callbackUrl={callbackUrl}
            onBack={() => setPendingOtpEmail(null)}
          />
        ) : (
          <motion.div
            key="register-step"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Create an Account
              </h1>
              <p className="text-gray-500 text-sm mt-1.5">
                Join Gazaarabia — The UK Modest Fashion Movement
              </p>
            </div>

            {/* Role Selection Cards */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2.5">
                Select Account Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedRole === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setSelectedRole(opt.id);
                        setErrorAlert(null);
                      }}
                      className={`relative flex flex-col items-start text-left p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? "border-[#009639] bg-emerald-50/50 ring-2 ring-[#009639]/20 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            isSelected
                              ? "bg-[#009639] text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[#009639] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-gray-900">{opt.label}</span>
                      <span className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 leading-tight">
                        {opt.tagline}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Error Alert */}
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
            </AnimatePresence>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Maryam Khan"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all bg-white"
                  />
                </div>
              </div>

              {/* Email & Phone Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
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
                      onChange={handleChange}
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+44 7123 456789"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Contextual Role Fields */}
              <AnimatePresence>
                {selectedRole === "seller" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Store / Boutique Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Store className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="shopName"
                        value={form.shopName}
                        onChange={handleChange}
                        placeholder="e.g. Al-Noor Modestwear"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all bg-white"
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
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Website / Social Media URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="website"
                        value={form.website}
                        onChange={handleChange}
                        placeholder="https://instagram.com/yourhandle"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all bg-white"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      required
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#009639] focus:border-[#009639] transition-all bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Requirement Hint */}
              <p className="text-[11px] text-gray-400 leading-normal">
                Must be at least 8 characters with letters and numbers.
              </p>

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
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <span>Register & Verify Email</span>
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
                  or sign up with
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <GoogleAuthButton
              callbackUrl={callbackUrl || "/account/details"}
              text="Continue with Google"
            />

            {/* Switch to Login */}
            <p className="text-center text-xs text-gray-500 pt-3">
              Already have an account?{" "}
              <a
                href={`/account/login${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
                className="text-[#009639] font-semibold hover:underline"
              >
                Log In
              </a>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
