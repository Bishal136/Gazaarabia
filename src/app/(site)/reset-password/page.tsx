"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import AlertMessage from "@/components/AlertMessage";
import { authService } from "@/lib/services/authService";

function ResetPasswordContent() {
    const params = useSearchParams();
    const token = params.get("token");
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const [alert, setAlert] = useState({
        isOpen: false,
        type: "",
        message: "",
    });


    const MIN_LENGTH = 8;

    const passwordChangeHandler = (value: string) => {
        setPassword(value);

        if (value.length < MIN_LENGTH) {
            setAlert({
                isOpen: true,
                type: "error",
                message: `Password must be at least ${MIN_LENGTH} characters`,
            });
        } else {
            setAlert({
                isOpen: false,
                type: "",
                message: ""
            });
        }
    };


    const submitHandler = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = await authService.resetPassword(token!, password);

            setAlert({
                isOpen: true,
                type: data.success ? "success" : "error",
                message: data.message,
            });

            if (data.success) {
                setTimeout(() => router.replace("/login"), 1200);
            }

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
                            Reset Password
                        </h1>
                        <p className="text-[13px] text-[#666666] mt-1.5">
                            Choose a strong and secure password.
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

                        <div>
                            <label
                                htmlFor="reset-password"
                                className="block text-[11px] font-medium text-[#525252] tracking-[0.04em] uppercase mb-1.5"
                            >
                                New Password
                            </label>
                            <div className="relative group">
                                <Lock
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10 text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors"
                                    size={17}
                                />

                                <input
                                    id="reset-password"
                                    type={isVisible ? "text" : "password"}
                                    className="no-focus-ring w-full pl-10 pr-11 py-2.5 text-sm text-[#111111] placeholder:text-[#9ca3af] bg-white/65 hover:bg-white/85 focus:bg-white backdrop-blur-md border border-black/[0.10] hover:border-black/[0.18] focus:border-[#111111]/45 focus:outline-none focus:ring-4 focus:ring-black/[0.06] rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200"
                                    placeholder="Enter your new password"
                                    value={password}
                                    onChange={(e) => passwordChangeHandler(e.target.value)}
                                    required
                                />

                                {/* Password visibility toggle */}
                                <button
                                    type="button"
                                    aria-label={isVisible ? "Hide password" : "Show password"}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 text-[#8a8a8a] hover:text-[#111111] transition-colors cursor-pointer"
                                    onClick={() => setIsVisible(!isVisible)}
                                >
                                    {isVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-[#111111] hover:bg-[#222222] active:bg-[#000000] text-white rounded-xl font-medium text-sm tracking-[0.02em] transition-all duration-200 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_14px_28px_-8px_rgba(0,0,0,0.34)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading && <Loader2 className="animate-spin h-4 w-4" />}
                            {loading ? "Updating..." : "Reset Password"}
                        </button>

                        {/* Bottom Info */}
                        <div className="pt-4 mt-2 border-t border-black/[0.08]">
                            <p className="text-center text-[#666666] text-xs">
                                Need help?{" "}
                                <span
                                    className="text-[#111111] hover:text-[#E82C3F] font-medium cursor-pointer hover:underline transition-colors"
                                    onClick={() => router.push("/contact")}
                                >
                                    Contact Support
                                </span>
                            </p>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="fixed inset-0 z-40 h-dvh w-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#ffffff] via-[#fafafa] to-[#f1f3f6]">
                    <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 h-96 w-96 rounded-full bg-[#e4e7ec]/75 blur-3xl" />
                    <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-[#E82C3F]/[0.05] blur-3xl" />
                    <div className="relative z-10 h-64 w-full max-w-[440px] mx-4 rounded-[24px] sm:rounded-[28px] bg-white/75 backdrop-blur-2xl border border-white/95 ring-1 ring-black/[0.05] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)] animate-pulse" />
                </div>
            }
        >
            <ResetPasswordContent />
        </Suspense>
    );
}
