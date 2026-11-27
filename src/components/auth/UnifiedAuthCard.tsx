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
  const year = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-40 h-dvh w-screen overflow-hidden max-lg:overflow-y-auto flex flex-col lg:flex-row bg-white text-[#111111] antialiased">
      {/* ──────────────────────────────────────────────
          Desktop Left Panel — Full-Bleed Editorial Lookbook
      ────────────────────────────────────────────── */}
      <div className="hidden lg:flex relative w-[44%] xl:w-[45%] h-full overflow-hidden bg-[#f4f4f5] border-r border-black/[0.06] shrink-0">
        {/* Clean full-bleed modest fashion editorial portrait (no baked-in banner text) */}
        <Image
          src="/images/home/final4.jpg"
          alt="Gazaarabia modest fashion editorial"
          fill
          sizes="(min-width: 1024px) 45vw, 0px"
          className="object-cover object-top"
          priority
        />

        {/* Soft bottom-only editorial scrim — keeps upper portrait bright, gallery-clean, and airy */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

        {/* Editorial Content */}
        <div className="relative z-10 flex flex-col justify-between h-full w-full px-10 xl:px-12 py-8">
          {/* Top-Left — Brand Mark */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Link
              href="/"
              aria-label="Go to homepage"
              className="inline-flex items-center px-4 py-2 rounded-full bg-white/85 hover:bg-white backdrop-blur-xl border border-white/95 shadow-[0_6px_24px_rgba(0,0,0,0.08)] transition-colors"
            >
              <Image
                src="/images/logo-dark.png"
                alt="Gazaarabia"
                width={148}
                height={34}
                className="h-6 w-auto object-contain"
                priority
              />
            </Link>
          </motion.div>

          {/* Bottom-Left — Restrained Lookbook Typography (anchored directly, no boxed card) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
            className="max-w-sm space-y-3"
          >
            {/* Subtle Gazaarabia heritage hairline */}
            <div className="h-[2px] w-12 rounded-full overflow-hidden flex opacity-95">
              <span className="flex-1 bg-[#111111]" />
              <span className="flex-1 bg-white" />
              <span className="flex-1 bg-[#009639]" />
              <span className="flex-1 bg-[#E82C3F]" />
            </div>

            <h2 className="font-serif text-[34px] xl:text-[40px] font-medium leading-[1.1] tracking-[-0.02em] text-white">
              Where Modesty
              <br />
              <span className="italic font-normal text-white/90">
                Meets Luxury
              </span>
            </h2>

            <p className="text-white/80 text-[13px] xl:text-sm max-w-[300px] leading-relaxed font-light">
              The UK&apos;s premier marketplace for modest fashion. Ethical,
              refined, exclusively curated.
            </p>

            <p
              suppressHydrationWarning
              className="pt-2 text-white/55 text-[11px] tracking-wide"
            >
              &copy; {year} Gazaarabia. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          Mobile Crisp White Frosted Top Bar (hidden on desktop)
      ────────────────────────────────────────────── */}
      <div className="lg:hidden shrink-0 sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-white/85 backdrop-blur-xl border-b border-black/[0.06]">
        <Link href="/" aria-label="Go to homepage" className="inline-flex items-center">
          <Image
            src="/images/logo-dark.png"
            alt="Gazaarabia"
            width={132}
            height={30}
            className="h-6 w-auto object-contain"
            priority
          />
        </Link>
        <Link
          href="/"
          className="text-xs font-medium text-[#666666] hover:text-[#111111] transition-colors"
        >
          Back to Store
        </Link>
      </div>

      {/* ──────────────────────────────────────────────
          Right Panel — Luminous White Architectural Glass Backdrop
      ────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col min-h-0 lg:h-full overflow-hidden max-lg:overflow-visible bg-gradient-to-br from-[#ffffff] via-[#fafafa] to-[#f1f3f6]">
        {/* Architectural frosted light refraction layers (creates authentic white-on-white glass depth) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(17,17,17,0.032)_1px,transparent_1px)] [background-size:24px_24px] opacity-60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 h-96 w-96 rounded-full bg-[#e4e7ec]/75 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-[#E82C3F]/[0.05] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 left-1/4 h-72 w-72 rounded-full bg-[#009639]/[0.04] blur-3xl"
        />

        {/* Desktop subtle return link */}
        <div className="hidden lg:flex absolute top-5 right-7 z-20">
          <Link
            href="/"
            className="text-xs font-medium text-[#666666] hover:text-[#111111] transition-colors"
          >
            Back to Store
          </Link>
        </div>

        {/* Centered Frosted White Glass Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-10 flex-1 min-h-0 flex flex-col justify-center px-4 py-4 sm:px-8 lg:px-10 xl:px-14"
        >
          <div className="w-full max-w-[468px] mx-auto rounded-[24px] sm:rounded-[28px] bg-white/75 backdrop-blur-2xl border border-white/95 ring-1 ring-black/[0.05] p-5 sm:p-7 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,1)]">
            {/* Tab navigation */}
            {activeTab && (
              <div className="flex border-b border-black/[0.08] mb-5">
                <Link
                  href="/account/login"
                  className={`pb-2.5 px-1 mr-7 text-sm font-medium transition-colors relative ${
                    activeTab === "login"
                      ? "text-[#111111] border-b-2 border-[#111111] -mb-[1px]"
                      : "text-[#737373] hover:text-[#111111]"
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  href="/account/register"
                  className={`pb-2.5 px-1 text-sm font-medium transition-colors relative ${
                    activeTab === "register"
                      ? "text-[#111111] border-b-2 border-[#111111] -mb-[1px]"
                      : "text-[#737373] hover:text-[#111111]"
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

        {/* Footer links pinned cleanly at bottom */}
        <div className="relative z-10 shrink-0 px-5 py-3 sm:px-8 lg:px-10">
          <div className="max-w-[468px] mx-auto flex items-center justify-center gap-2 text-[11px] font-medium text-[#737373]">
            <Link
              href="/terms-and-conditions"
              className="hover:text-[#111111] transition-colors"
            >
              Terms
            </Link>
            <span className="text-black/20">&middot;</span>
            <Link
              href="/privacy-policy"
              className="hover:text-[#111111] transition-colors"
            >
              Privacy
            </Link>
            <span className="text-black/20">&middot;</span>
            <Link
              href="/contact"
              className="hover:text-[#111111] transition-colors"
            >
              Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
