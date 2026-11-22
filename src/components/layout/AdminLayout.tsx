"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import AdminHeader from "../admin/AdminHeader";
import AdminSidebar from "../admin/AdminSidebar";

const SIDEBAR_FULL = 256;
const SIDEBAR_COLLAPSED = 80;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFixedViewport = pathname === "/admin/messages";
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  // const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

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
      setCollapsed(true)
    }
  }, [isMobile])
  

  return (
    <div className={`flex ${isFixedViewport ? "h-screen overflow-hidden" : "min-h-screen"} bg-[#f5f6fa] relative`}>
      {/* Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        collapsed={collapsed}
        setCollapsed={(val) => {
          console.log("setCollapsed:", val);
          setCollapsed(val);
        }}
      />

      {/* Main Content Area */}
      <div
        className={`flex flex-col flex-1 ${isFixedViewport ? "h-screen overflow-hidden" : "min-h-screen"} relative z-10 transition-all duration-300 ease-in-out`}
        style={{
          //  Shifts content when sidebar expands/collapses
          marginLeft: sidebarOpen && collapsed ? "80px" : (!sidebarOpen && !collapsed ? "256px" : (!isMobile && !sidebarOpen && collapsed ? "80px" : !isMobile ? "256px" : "")),
        }}
      >
        {/* Header (Skipped for fixed-viewport app like /admin/messages to allow sleek edge-to-edge toolbar) */}
        {!isFixedViewport && (
          <AdminHeader onMenuToggle={() => {
            console.log('sidebarOpen:>', !sidebarOpen);
            setSidebarOpen(!sidebarOpen)
            console.log("isMobile:>", isMobile)
          }} />
        )}

        {/* Main Area */}
        <main
          className={`flex-1 ${
            isFixedViewport
              ? "p-0 overflow-hidden flex flex-col min-h-0 bg-[#FAFAFA]"
              : "p-6 overflow-y-auto bg-[#f5f6fa]"
          }`}
        >
          {children}
        </main>
      </div>

      {/* Overlay (for mobile drawer effect) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[9998] md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
