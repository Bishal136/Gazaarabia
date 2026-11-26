import type { Metadata } from "next";
import AdminLayout from "@/components/layout/AdminLayout";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Admin Panel",
  description: "Admin dashboard",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLayout>{children}</AdminLayout>
  );
}
