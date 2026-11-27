"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AlertMessage from "@/components/AlertMessage";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { authService } from "@/lib/services/authService";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const [alert, setAlert] = useState({
        isOpen: false,
        type: "",
        message: "",
    });

    const submitHandler = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = await authService.forgotPassword(email);

            setAlert({
                isOpen: true,
                type: data.success ? "success" : "error",
                message: data.message,
            });

            if (data.success) setEmail("");

        } catch (err: any) {
            setAlert({
                isOpen: true,
                type: "error",
                message: err.message || "Something went wrong",
            });
        }

        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-40 h-dvh w-screen overflow-hidden max-sm:overflow-y-auto flex flex-col bg-gradient-to-br from-[#ffffff] via-[#fafafa] to-[#f1f3f6] text-[#111111] antialiased">
            {/* Ambient refraction orbs for crisp white frosted glass */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 h-96 w-96 rounded-full bg-[#e4e7ec]/75 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-[#E82C3F]/[0.05] blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute top-1/3 left-1/4 h-72 w-72 rounded-full bg-[#009639]/[0.04] blur-3xl" />

            <div className="relative z-10 m-auto w-full max-w-[440px] px-4 py-6">
                <div className="rounded-[24px] sm:rounded-[28px] bg-white/75 backdrop-blur-2xl border border-white/95 ring-1 ring-black/[0.05] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)] p-6 sm:p-8 w-full">

                    {/* Brand & Title */}
                    <div className="text-center mb-6">
                        <Link href="/" className="inline-block mb-5 focus:outline-none">
                            <Image
                                src="/images/logo-dark.png"
                                alt="Gazaarabia"
                                width={132}
                                height={36}
                                className="h-8 w-auto mx-auto object-contain"
                                priority
                            />
                        </Link>
                        <h1 className="font-serif text-[24px] sm:text-[26px] font-semibold text-[#111111] tracking-[-0.02em] leading-tight">
                            Forgot Password?
                        </h1>
                        <p className="text-[13px] text-[#666666] mt-1.5">
                            Enter your email address to receive a reset link.
                        </p>
                    </div>

                    {/* Alert */}
                    {alert.isOpen && (
                        <div className="mb-4">
                            <AlertMessage
                                type={alert.type as any}
                                message={alert.message}
                                onClose={() => setAlert({ ...alert, isOpen: false })}
                            />
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={submitHandler} className="space-y-4">

                        {/* Email Field */}
                        <div>
                            <label
                                htmlFor="forgot-email"
                                className="block text-[11px] font-medium text-[#525252] tracking-[0.04em] uppercase mb-1.5"
                            >
                                Email Address
                            </label>
                            <div className="relative group">
                                <Mail
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10 text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors"
                                    size={17}
                                />
                                <input
                                    id="forgot-email"
                                    type="email"
                                    required
                                    className="no-focus-ring w-full pl-10 pr-4 py-2.5 text-sm text-[#111111] placeholder:text-[#9ca3af] bg-white/65 hover:bg-white/85 focus:bg-white backdrop-blur-md border border-black/[0.10] hover:border-black/[0.18] focus:border-[#111111]/45 focus:outline-none focus:ring-4 focus:ring-black/[0.06] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-[#111111] hover:bg-[#222222] active:bg-[#000000] text-white rounded-xl font-medium text-sm tracking-[0.02em] transition-all duration-200 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_14px_28px_-8px_rgba(0,0,0,0.34)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading && <Loader2 className="animate-spin h-4 w-4" />}
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>

                        {/* Small Note */}
                        <p className="text-center text-[#666666] text-xs pt-1 leading-relaxed">
                            You will receive an email if the address is associated with an account.
                        </p>
                    </form>

                    {/* Footer Navigation */}
                    <div className="mt-6 pt-5 border-t border-black/[0.08] text-center">
                        <Link
                            href="/account/login"
                            className="inline-flex items-center gap-1.5 text-xs text-[#666666] hover:text-[#111111] font-medium transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back to Sign In
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
}
