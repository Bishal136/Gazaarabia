"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

interface UnifiedAuthCardProps {
  children: React.ReactNode;
  activeTab?: "login" | "register";
}

export default function UnifiedAuthCard({
  children,
  activeTab,
}: UnifiedAuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 via-gray-100 to-emerald-50/30 px-4 py-12 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-rose-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[480px] relative z-10"
      >
        {/* Brand Logo */}
        <div className="text-center mb-6">
          <Link
            href="/"
            className="inline-block transition-transform hover:scale-105 duration-200"
          >
            <Image
              src="/images/logo-dark.png"
              alt="Gazaarabia Logo"
              width={160}
              height={44}
              priority
              className="h-9 w-auto mx-auto object-contain"
            />
          </Link>
        </div>

        {/* Card Body */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-gray-200/80 overflow-hidden backdrop-blur-sm">
          {/* Subtle Top Accent Banner (Brand Identity) */}
          <div className="h-1.5 w-full flex">
            <div className="flex-1 bg-black" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#009639]" />
            <div className="flex-1 bg-[#E82C3F]" />
          </div>

          {/* Optional Quick Switch Tabs */}
          {activeTab && (
            <div className="flex border-b border-gray-100 bg-gray-50/60 text-xs font-semibold">
              <Link
                href="/account/login"
                className={`flex-1 py-3 text-center transition-colors ${
                  activeTab === "login"
                    ? "bg-white text-[#009639] border-b-2 border-[#009639]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Sign In
              </Link>
              <Link
                href="/account/register"
                className={`flex-1 py-3 text-center transition-colors ${
                  activeTab === "register"
                    ? "bg-white text-[#009639] border-b-2 border-[#009639]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Create Account
              </Link>
            </div>
          )}

          {/* Form Content Padding */}
          <div className="p-6 sm:p-8">{children}</div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-gray-400 mt-6 space-y-1">
          <p>© {new Date().getFullYear()} Gazaarabia. Where Modesty Meets Luxury.</p>
          <div className="flex justify-center gap-3 text-[11px] text-gray-500">
            <Link href="/terms-and-conditions" className="hover:underline">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:underline">
              Support
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
