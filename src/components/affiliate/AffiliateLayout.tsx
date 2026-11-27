"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/constants/routes";
import AffiliateSidebar from "./AffiliateSidebar";
import AffiliateHeader from "./AffiliateHeader";

interface AffiliateLayoutProps {
    children: React.ReactNode;
    initialAuthorized?: boolean;
    initialAffiliateType?: string | null;
}

export default function AffiliateLayout({
    children,
    initialAuthorized = false,
    initialAffiliateType = null,
}: AffiliateLayoutProps) {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [collapsed, setCollapsed] = useState(false);

    // Route guard: only affiliates/ambassadors (role === "affiliate") may view the
    // dashboard. Server layout passes initialAuthorized={true} so children render immediately
    // without blocking behind a client session waterfall.
    const isAllowed = (session?.user as any)?.role === "affiliate";
    const isAuthorized =
        status === "loading"
            ? initialAuthorized
            : status === "authenticated" && isAllowed;

    const effectiveAffiliateType =
        session?.user?.affiliateType ?? initialAffiliateType ?? null;

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated" || !session) {
            router.replace(ROUTES.AFFILIATE.LOGIN);
            return;
        }
        if (!isAllowed) {
            router.replace(ROUTES.HOME);
        }
    }, [status, session, isAllowed, router]);

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkScreen = () => setIsMobile(window.innerWidth < 768);
        checkScreen();
        window.addEventListener("resize", checkScreen);
        return () => window.removeEventListener("resize", checkScreen);
    }, []);

    //  Prevent background scroll when sidebar is open on mobile
    useEffect(() => {
        if (isMobile && sidebarOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }

        return () => {
            document.body.style.overflow = "auto";
        };
    }, [sidebarOpen, isMobile]);

    useEffect(() => {
        if (isMobile) {
            setCollapsed(true);
        }
    }, [isMobile]);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center text-[var(--text-muted)]">
                Checking access…
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-[#f5f6fa] relative">
            {/*  Sidebar */}
            <AffiliateSidebar
                isOpen={sidebarOpen}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                initialAffiliateType={effectiveAffiliateType}
            />

            {/* Main Content Area */}
            <div
                className={`flex flex-col flex-1 min-h-screen relative z-10 transition-all duration-300 ease-in-out`}
                style={{
                    marginLeft: sidebarOpen && collapsed ? "80px" : (!sidebarOpen && !collapsed ? "256px" : (!isMobile && !sidebarOpen && collapsed ? "80px" : !isMobile ? "256px" : "")),
                }}
            >
                {/*  Header */}
                <AffiliateHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

                {/*  Main Page Content */}
                <main className="flex-1 p-6 bg-[#f5f6fa] overflow-y-auto">{children}</main>
            </div>

            {/* Overlay (for mobile sidebar) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-[9998] md:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}
        </div>
    );
}
