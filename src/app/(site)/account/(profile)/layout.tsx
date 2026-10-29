"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  User,
  LogOut,
  Package,
  Heart,
  Gift,
  Star,
  MessageSquare
} from "lucide-react";
import PopupAlert from "@/components/PopupAlert";
import AlertMessage from "@/components/AlertMessage";
import Loader from "@/components/Loader";
import { ROUTES } from "@/constants/routes";
import { getRedirectUrlByRole } from "@/lib/authRedirect";
import { logoutUser } from "@/lib/logout";

const menuItems = [
  { key: "orders", label: "Orders", path: "/account/orders", icon: <Package size={18} /> },
  { key: "messages", label: "Messages", path: "/account/messages", icon: <MessageSquare size={18} /> },
  { key: "reviews", label: "My Reviews", path: "/account/reviews", icon: <Star size={18} /> },
  { key: "details", label: "My Details", path: "/account/details", icon: <User size={18} /> },
  { key: "rewards", label: "Rewards", path: "/account/rewards", icon: <Gift size={18} /> },
  { key: "wishlist", label: "Wishlist", path: "/wishlist", icon: <Heart size={18} /> },
  { key: "signout", label: "Sign Out", path: "", icon: <LogOut size={18} /> },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const [alert, setAlert] = useState<{ isOpen: boolean; type: "success" | "error" | ""; message: string }>({
    isOpen: false,
    type: "",
    message: "",
  });

  const [confirmLogout, setConfirmLogout] = useState(false);

  //  Redirect if not logged in
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace(ROUTES.USER.LOGIN);
      return;
    }

    const role = (session?.user?.role || "customer").toLowerCase().trim();
    if (status === "authenticated" && role !== "customer") {
      const destination = getRedirectUrlByRole(role);
      router.replace(destination);
    }
  }, [status, session, router]);

  //  Handle logout after confirmation
  const handleLogout = async () => {
    setConfirmLogout(false);
    await logoutUser();
  };

  const isMessagesPage = pathname?.startsWith("/account/messages");

  return (
    <>
      <div
        suppressHydrationWarning
        className={`bg-[var(--background)] text-[var(--text-primary)] ${
          isMessagesPage
            ? "h-dvh overflow-hidden pt-[96px] lg:pt-[106px] pb-2 sm:pb-3 px-2 sm:px-4 lg:px-6 flex flex-col"
            : "min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8"
        }`}
      >
        <div
          suppressHydrationWarning
          className={`mx-auto w-full flex flex-col md:flex-row gap-3 lg:gap-4 ${
            isMessagesPage
              ? "max-w-[1600px] flex-1 min-h-0 overflow-hidden items-stretch"
              : "max-w-7xl items-start gap-6 lg:gap-8"
          }`}
        >
          {/* SIDEBAR */}
          <aside
            suppressHydrationWarning
            className={`shrink-0 bg-white rounded-2xl border border-stone-200/80 shadow-xs ${
              isMessagesPage
                ? "w-full md:w-16 lg:w-56 p-2 md:p-2.5 lg:p-3 h-fit md:h-full md:overflow-y-auto"
                : "w-full md:w-56 lg:w-60 p-3.5 h-fit md:sticky md:top-24"
            }`}
          >
            <nav className={`flex ${isMessagesPage ? "flex-row md:flex-col overflow-x-auto no-scrollbar" : "flex-col"} gap-1`}>
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    if (item.key === "signout") setConfirmLogout(true);
                    else router.push(item.path);
                  }}
                  title={item.label}
                  className={`shrink-0 md:shrink flex items-center md:justify-center lg:justify-start gap-2.5 px-3 lg:px-3.5 py-1.5 md:py-2.5 rounded-xl font-medium text-xs md:text-sm transition text-left whitespace-nowrap ${
                    pathname === item.path
                      ? "bg-[#b08a78] text-white shadow-xs font-semibold"
                      : "text-stone-700 hover:bg-[#e8d5c8]/25 hover:text-[#0a0808]"
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className={`${isMessagesPage ? "inline md:hidden lg:inline" : "inline"} truncate`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          {/* MAIN CONTENT */}
          <main
            className={`min-w-0 w-full ${
              isMessagesPage
                ? "flex-1 h-full flex flex-col overflow-hidden"
                : "flex-1"
            }`}
          >
            {children}
          </main>
        </div>
      </div>


      {/*  Logout confirmation */}
      {confirmLogout && (
        <PopupAlert
          type="warning"
          message="Are you sure you want to sign out?"
          confirmText="Yes, Sign Out"
          cancelText="Cancel"
          onConfirm={handleLogout}
          onCancel={() => setConfirmLogout(false)}
          show={confirmLogout}
        />
      )}
    </>
  );
}
