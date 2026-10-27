"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SiteLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide standard store header & footer on dedicated auth flows for full-bleed split-screen experience
  const isAuthRoute =
    pathname?.startsWith("/account/login") ||
    pathname?.startsWith("/account/register") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/reset-password");

  if (isAuthRoute) {
    return <main className="min-h-dvh">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className={pathname === "/" ? "" : "pt-20"}>{children}</main>
      <Footer />
    </>
  );
}
