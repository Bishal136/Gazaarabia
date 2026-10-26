"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ShieldCheck, Truck, Star } from "lucide-react";

interface UnifiedAuthCardProps {
  children: React.ReactNode;
  activeTab?: "login" | "register";
}

const trustBadges = [
  { icon: ShieldCheck, label: "Secure Checkout" },
  { icon: Truck, label: "UK Delivery" },
  { icon: Star, label: "10K+ Customers" },
];

export default function UnifiedAuthCard({
  children,
  activeTab,
}: UnifiedAuthCardProps) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-white">
      {/* ──────────────────────────────────────────────
          Desktop Left Panel (hidden on mobile)
      ────────────────────────────────────────────── */}
      <div className="hidden lg:flex relative w-[44%] min-h-dvh overflow-hidden">
        {/* Background image */}
        <Image
          src="/images/home/hero-desktop-1.jpg"
          alt="Modest fashion"
          fill
          className="object-cover"
          priority
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-[#001a0d]/70 to-[#001a0d]/90" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full w-full px-10 xl:px-14 py-10">
          {/* Top — Logo */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Link href="/" aria-label="Go to homepage">
              <Image
                src="/images/logo.png"
                alt="Gazaarabia"
                width={160}
                height={40}
                className="brightness-0 invert"
              />
            </Link>
          </motion.div>

          {/* Center — Headline + trust badges */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Palestinian flag accent line */}
            <div className="h-1 w-24 rounded-full overflow-hidden flex">
              <span className="flex-1 bg-black" />
              <span className="flex-1 bg-white" />
              <span className="flex-1 bg-[#009639]" />
              <span className="flex-1 bg-[#E82C3F]" />
            </div>

            <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight text-white">
              Where Modesty
              <br />
              <span className="text-emerald-300">Meets Luxury</span>
            </h1>

            <p className="text-white/60 text-base max-w-sm leading-relaxed">
              The UK&apos;s premier marketplace for modest fashion. Elegant,
              ethical, exclusively curated.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 pt-2">
              {trustBadges.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.08] text-white/80 text-xs font-medium"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Bottom — Copyright */}
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-white/30 text-xs"
          >
            &copy; {year} Gazaarabia. All rights reserved.
          </motion.p>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          Mobile Compact Brand Banner (hidden on desktop)
      ────────────────────────────────────────────── */}
      <div className="lg:hidden relative overflow-hidden">
        {/* Background image */}
        <Image
          src="/images/home/hero-desktop-1.jpg"
          alt="Modest fashion"
          fill
          className="object-cover"
          priority
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-[#001a0d]/70 to-[#001a0d]/90" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center py-8 px-6 space-y-3">
          <Link href="/" aria-label="Go to homepage">
            <Image
              src="/images/logo.png"
              alt="Gazaarabia"
              width={120}
              height={28}
              className="brightness-0 invert h-7 w-auto"
            />
          </Link>

          {/* Palestinian flag accent line */}
          <div className="h-0.5 w-16 rounded-full overflow-hidden flex">
            <span className="flex-1 bg-black" />
            <span className="flex-1 bg-white" />
            <span className="flex-1 bg-[#009639]" />
            <span className="flex-1 bg-[#E82C3F]" />
          </div>

          <p className="text-white/50 text-xs">Where Modesty Meets Luxury</p>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          Right Panel — Form Area
      ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex flex-col justify-center px-5 py-8 sm:px-8 lg:px-12 xl:px-16"
        >
          <div className="w-full max-w-[460px] mx-auto">
            {/* Tab navigation */}
            {activeTab && (
              <div className="flex border-b border-gray-100 mb-8">
                <Link
                  href="/account/login"
                  className={`pb-3 px-1 mr-6 text-sm font-medium transition-colors ${
                    activeTab === "login"
                      ? "text-[#009639] border-b-2 border-[#009639]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  href="/account/register"
                  className={`pb-3 px-1 text-sm font-medium transition-colors ${
                    activeTab === "register"
                      ? "text-[#009639] border-b-2 border-[#009639]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Create Account
                </Link>
              </div>
            )}

            {/* Form content */}
            {children}
          </div>
        </motion.div>

        {/* Footer links pinned to bottom */}
        <div className="px-5 py-4 sm:px-8 lg:px-12 xl:px-16">
          <div className="max-w-[460px] mx-auto flex items-center justify-center gap-1 text-[11px] text-gray-400">
            <Link
              href="/terms-and-conditions"
              className="hover:text-gray-600 transition-colors"
            >
              Terms
            </Link>
            <span>·</span>
            <Link
              href="/privacy-policy"
              className="hover:text-gray-600 transition-colors"
            >
              Privacy
            </Link>
            <span>·</span>
            <Link
              href="/contact"
              className="hover:text-gray-600 transition-colors"
            >
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
