"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AlertMessage from "@/components/AlertMessage";
import { ROUTES } from "@/constants/routes";
import { loadWithExpiry, saveWithExpiry } from "@/lib/helpers/localExpiry";

export default function ContentManagerLoginPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        email: "",
        password: "",
        rememberMe: false,
    });

    const [errors, setErrors] = useState<{ email?: string; password?: string; root?: string }>({});
    const [alert, setAlert] = useState({
        isOpen: false,
        type: "" as "success" | "error" | "",
        message: "",
    });

    // ================================
    // Load Remembered Email on Mount
    // ================================
    useEffect(() => {
        const rememberedEmail = loadWithExpiry("gaza_arabia_remember_content_manager");
        if (rememberedEmail) {
            setForm((p) => ({ ...p, email: rememberedEmail, rememberMe: true }));
        }
    }, []);

    // ================================
    // Validation
    // ================================
    const validate = () => {
        const e: any = {};
        if (!form.email) e.email = "Email is required";
        if (!form.password) e.password = "Password is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ================================
    // Redirect if already logged in
    // ================================
    useEffect(() => {
        if (status === "loading") return;

        if (status === "authenticated") {
            if (session?.user?.role === "content_manager") {
                router.replace(ROUTES.CONTENT_MANAGER.BLOGS);
            } else {
                // router.replace("/");
            }
        }
    }, [status, session, router]);

    // ================================
    // Submit Handler
    // ================================
    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        if (!validate()) return;

        try {
            setLoading(true);

            const response: any = await signIn("credentials", {
                redirect: false,
                email: form.email,
                password: form.password,
                role: "content_manager",
            });

            if (response?.error) {
                setAlert({
                    isOpen: true,
                    type: "error",
                    message: response.error || "Invalid login credentials.",
                });
                return;
            }

            // Remember Me logic
            if (form.rememberMe) {
                saveWithExpiry("gaza_arabia_remember_content_manager", form.email);
            } else {
                localStorage.removeItem("gaza_arabia_remember_content_manager");
            }

            setForm({
                email: "",
                password: "",
                rememberMe: false
            });

            setAlert({
                isOpen: true,
                type: "success",
                message: "Login successful! Redirecting...",
            });

            router.replace(ROUTES.CONTENT_MANAGER.BLOGS);

        } catch (err: any) {
            setAlert({
                isOpen: true,
                type: "error",
                message: err.message || "Login failed.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-40 h-dvh w-screen overflow-hidden max-sm:overflow-y-auto flex flex-col bg-gradient-to-br from-[#ffffff] via-[#fafafa] to-[#f1f3f6] text-[#111111] antialiased">
            {/* Ambient refraction orbs for crisp white frosted glass */}
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 h-96 w-96 rounded-full bg-[#e4e7ec]/75 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-[#E82C3F]/[0.05] blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute top-1/3 left-1/4 h-72 w-72 rounded-full bg-[#009639]/[0.04] blur-3xl" />

            <div className="relative z-10 m-auto w-full max-w-[440px] px-4 py-6">
                <div className="rounded-[24px] sm:rounded-[28px] bg-white/75 backdrop-blur-2xl border border-white/95 ring-1 ring-black/[0.05] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)] p-6 sm:p-8 w-full">

                    {/* Brand & Header */}
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
                            Content Manager Login
                        </h1>
                        <p className="text-[13px] text-[#666666] mt-1.5">
                            Access your content panel securely.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={onSubmit} className="space-y-4">
                        {alert.isOpen && alert.type && (
                            <AlertMessage
                                type={alert.type}
                                message={alert.message}
                                onClose={() => setAlert((p) => ({ ...p, isOpen: false }))}
                            />
                        )}

                        {/* Email */}
                        <div>
                            <label
                                htmlFor="cm-email"
                                className="block text-[11px] font-medium text-[#525252] tracking-[0.04em] uppercase mb-1.5"
                            >
                                Email
                            </label>
                            <div className="relative group">
                                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10 h-4 w-4 text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors" />
                                <input
                                    id="cm-email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className={`no-focus-ring w-full pl-10 pr-4 py-2.5 text-sm text-[#111111] placeholder:text-[#9ca3af] bg-white/65 hover:bg-white/85 focus:bg-white backdrop-blur-md border focus:outline-none focus:ring-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 ${
                                        errors.email
                                            ? "border-[#E82C3F]/70 focus:border-[#E82C3F] focus:ring-[#E82C3F]/10"
                                            : "border-black/[0.10] hover:border-black/[0.18] focus:border-[#111111]/45 focus:ring-black/[0.06]"
                                    }`}
                                />
                            </div>
                            {errors.email && <p className="text-xs text-[#9f1239] mt-1">{errors.email}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label
                                    htmlFor="cm-password"
                                    className="block text-[11px] font-medium text-[#525252] tracking-[0.04em] uppercase"
                                >
                                    Password
                                </label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-[#111111] hover:text-[#E82C3F] font-medium hover:underline transition-colors"
                                >
                                    Forgot password?
                                </Link>
                            </div>

                            <div className="relative group">
                                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 z-10 h-4 w-4 text-[#8a8a8a] group-focus-within:text-[#111111] transition-colors" />
                                <input
                                    id="cm-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className={`no-focus-ring w-full pl-10 pr-11 py-2.5 text-sm text-[#111111] placeholder:text-[#9ca3af] bg-white/65 hover:bg-white/85 focus:bg-white backdrop-blur-md border focus:outline-none focus:ring-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 ${
                                        errors.password
                                            ? "border-[#E82C3F]/70 focus:border-[#E82C3F] focus:ring-[#E82C3F]/10"
                                            : "border-black/[0.10] hover:border-black/[0.18] focus:border-[#111111]/45 focus:ring-black/[0.06]"
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 text-[#8a8a8a] hover:text-[#111111] transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            {errors.password && <p className="text-xs text-[#9f1239] mt-1">{errors.password}</p>}
                        </div>

                        {/* Remember Me */}
                        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none pt-0.5">
                            <input
                                type="checkbox"
                                checked={form.rememberMe}
                                onChange={(e) => setForm({ ...form, rememberMe: e.target.checked })}
                                className="no-focus-ring h-4 w-4 rounded border-black/20 accent-[#111111] cursor-pointer"
                            />
                            <span className="text-xs font-medium text-[#525252]">Remember me</span>
                        </label>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-[#111111] hover:bg-[#222222] active:bg-[#000000] text-white rounded-xl font-medium text-sm tracking-[0.02em] transition-all duration-200 shadow-[0_10px_24px_-8px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_14px_28px_-8px_rgba(0,0,0,0.34)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {loading ? "Signing in..." : "Sign in"}
                        </button>

                        <div className="pt-4 mt-2 border-t border-black/[0.08]">
                            <p className="text-[11px] text-center text-[#666666]">
                                This page is restricted to authorized content managers only.
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
