"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { X, LogOut, User, Settings, Heart, ShoppingBag, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import { logoutUser } from "@/lib/logout";
import { getRedirectUrlByRole } from "@/lib/authRedirect";
import { useEffect, useRef } from "react";

interface Props {
  onClose: () => void;
}

export default function ProfileDropdown({ onClose }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleLogout = async () => {
    onClose();
    await logoutUser();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-4 top-[110%] w-64 bg-white shadow-xl rounded-lg border border-gray-200 z-50 animate-fadeIn"
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <h3 className="font-semibold text-[var(--text-primary)] text-sm">
          {status === "authenticated" ? `Hi, ${session?.user?.name}` : "Welcome"}
        </h3>
        <button onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {status === "authenticated" ? (
        <div className="flex flex-col p-2 text-sm">
          {session?.user?.role && session.user.role !== "customer" ? (
            <Link
              href={getRedirectUrlByRole(session?.user?.role)}
              className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 text-[#009639] font-medium hover:bg-emerald-100/70 transition mb-1"
              onClick={onClose}
            >
              <LayoutDashboard size={18} />
              {session.user.role === "admin"
                ? "Admin Dashboard"
                : session.user.role === "seller"
                ? "Seller Dashboard"
                : session.user.role === "affiliate"
                ? "Affiliate Portal"
                : "Management Portal"}
            </Link>
          ) : (
            <>
              <Link
                href={ROUTES.USER.PROFILE}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition"
                onClick={onClose}
              >
                <User size={18} />
                My Account
              </Link>
              <Link
                href="/wishlist"
                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition"
                onClick={onClose}
              >
                <Heart size={18} />
                Wishlist
              </Link>
              <Link
                href="/account/orders"
                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition"
                onClick={onClose}
              >
                <ShoppingBag size={18} />
                Orders
              </Link>
            </>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 p-2 mt-2 text-red-600 rounded-md hover:bg-red-50 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      ) : (
        <div className="flex flex-col p-2 text-sm">
          <Link
            href={ROUTES.USER.LOGIN}
            className="p-2 text-center rounded-md bg-[var(--brand-primary)] text-white hover:opacity-90 transition"
            onClick={onClose}
          >
            Login
          </Link>
          <Link
            href={ROUTES.USER.REGISTER}
            className="mt-2 p-2 text-center rounded-md border border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition"
            onClick={onClose}
          >
            Sign Up
          </Link>
        </div>
      )}
    </div>
  );
}
