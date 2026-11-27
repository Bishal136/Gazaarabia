"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { MoreVertical, Trash2, Search, CheckCircle, XCircle, Pencil } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import PopupAlert from "@/components/PopupAlert";
import { couponService } from "@/lib/services/couponService";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ROUTES } from "@/constants/routes";

export default function CouponListPage() {
    const router = useRouter();
    const { data: session, status } = useSession();

    const [coupons, setCoupons] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(true);
    const [popUpAlertData, setPopUpAlertData] = useState<any>({
        isOpen: false,
        type: "",
        message: "",
    });

    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
    const menuRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);

    //  Auth check
    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") router.replace(ROUTES.AFFILIATE.LOGIN);
        else if (status === "authenticated" && session?.user?.role !== "affiliate" && session?.user?.role !== "admin")
            router.replace(ROUTES.HOME);
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.token) fetchCoupons();
    }, [session?.user?.token]);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const res: any = await couponService.getAllCoupons(session?.user?.token as string);
            setCoupons(res.data ?? []);
        } catch {
            showAlert("error", "Failed to load coupons.");
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return coupons.filter(
            (c) =>
                (c.code ?? "").toLowerCase().includes(term) ||
                (c.discountType ?? "").toLowerCase().includes(term) ||
                (c.creator?.name?.toLowerCase().includes(term) ?? false)
        );
    }, [coupons, searchTerm]);

    const totalPages = Math.ceil(filtered.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    const handleDelete = (id: number) => {
        setPopUpAlertData({
            isOpen: true,
            type: "confirm",
            message: "Are you sure you want to delete this coupon?",
            onConfirm: async () => {
                try {
                    await couponService.deleteCoupon(session?.user?.token as string, id);
                    showAlert("success", "Coupon deleted successfully!");
                    fetchCoupons();
                } catch (err: any) {
                    showAlert("error", err.message || "Failed to delete coupon.");
                }
            },
            onCancel: () => setPopUpAlertData((p: any) => ({ ...p, isOpen: false })),
        });
    };

    const handleEdit = (id: number) => {
        const basePath =
            session?.user?.role === "affiliate"
                ? "/affiliate/coupons/form"
                : "/admin/coupons/form";
        router.push(`${basePath}/${id}`);
    };

    const showAlert = (type: "success" | "error", message: string) => {
        setPopUpAlertData({
            isOpen: true,
            type,
            message,
            onConfirm: () => setPopUpAlertData((p: any) => ({ ...p, isOpen: false })),
        });
    };

    const closeMenu = useCallback((returnFocus = false) => {
        setOpenMenuId(null);
        if (returnFocus) {
            triggerRef.current?.focus();
        }
    }, []);

    const toggleMenu = (e: React.MouseEvent<HTMLButtonElement>, id: number) => {
        if (openMenuId === id) {
            closeMenu();
            return;
        }
        const button = e.currentTarget;
        triggerRef.current = button;
        const rect = button.getBoundingClientRect();
        const estimatedHeight = 96;
        const openUpward = window.innerHeight - rect.bottom < estimatedHeight + 16;
        setMenuPos({
            top: openUpward ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6,
            right: Math.max(8, window.innerWidth - rect.right),
        });
        setOpenMenuId(id);
    };

    useEffect(() => {
        if (openMenuId === null) return;

        // Move focus to the first menu item when opened for keyboard accessibility
        const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
        firstItem?.focus();

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                menuRef.current &&
                !menuRef.current.contains(target) &&
                triggerRef.current &&
                !triggerRef.current.contains(target)
            ) {
                closeMenu();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                closeMenu(true);
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                const items = Array.from(
                    menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
                );
                if (items.length === 0) return;
                event.preventDefault();
                const currentIdx = items.indexOf(document.activeElement as HTMLButtonElement);
                const nextIdx =
                    event.key === "ArrowDown"
                        ? (currentIdx + 1) % items.length
                        : (currentIdx - 1 + items.length) % items.length;
                items[nextIdx]?.focus();
            }
        };

        const handleScrollOrResize = () => closeMenu();

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("scroll", handleScrollOrResize, true);
        window.addEventListener("resize", handleScrollOrResize);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", handleScrollOrResize, true);
            window.removeEventListener("resize", handleScrollOrResize);
        };
    }, [openMenuId, closeMenu]);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4">
                    <h1 className="text-xl font-semibold text-gray-800">Manage Coupons</h1>
                    <div className="relative w-full sm:w-72" suppressHydrationWarning>
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            aria-label="Search coupons"
                            placeholder="Search coupons..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="no-focus-ring w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-gray-400 focus:outline-none focus:border-[var(--brand-secondary)] focus:ring-2 focus:ring-[var(--brand-secondary)]/20 transition"
                        />
                    </div>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-gray-700 text-xs uppercase font-medium">
                            <tr>
                                <th className="py-3 px-3 text-center w-[60px]">Sn.</th>
                                <th className="py-3 px-3 text-center">Code</th>
                                <th className="py-3 px-3 text-center">Value</th>
                                <th className="py-3 px-3 text-center">Status</th>
                                <th className="py-3 px-3 text-center">Start</th>
                                <th className="py-3 px-3 text-center">End</th>
                                <th className="py-3 px-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center text-gray-500">
                                        Loading coupons...
                                    </td>
                                </tr>
                            ) : paginated.length > 0 ? (
                                paginated.map((coupon, idx) => (
                                    <tr key={coupon.id} className="hover:bg-gray-100 transition">
                                        <td className="py-3 px-3 text-center">{startIndex + idx + 1}</td>
                                        <td className="py-3 px-3 text-center">{coupon.code}</td>
                                        <td className="py-3 px-3 text-center">
                                            {coupon.discountType === "fixed"
                                                ? `£${coupon.discountValue}`
                                                : `${coupon.discountValue}%`}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {coupon.isActive ? (
                                                <CheckCircle className="text-green-500 inline" size={18} />
                                            ) : (
                                                <XCircle className="text-red-500 inline" size={18} />
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {coupon.startDate
                                                ? new Date(coupon.startDate).toLocaleDateString()
                                                : "-"}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {coupon.endDate
                                                ? new Date(coupon.endDate).toLocaleDateString()
                                                : "-"}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            <button
                                                type="button"
                                                onClick={(e) => toggleMenu(e, coupon.id)}
                                                aria-haspopup="menu"
                                                aria-expanded={openMenuId === coupon.id}
                                                aria-label={`Actions for coupon ${coupon.code}`}
                                                className="inline-flex items-center justify-center rounded-full p-2 text-gray-600 hover:bg-gray-200/70 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-secondary)] transition"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center text-gray-500">
                                        No coupons found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filtered.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filtered.length}
                        pageSize={pageSize}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                    />
                )}
            </div>

            {/* Accessible fixed-position Action Menu (avoids overflow clipping) */}
            {openMenuId !== null && (
                <div
                    ref={menuRef}
                    role="menu"
                    aria-label="Coupon actions"
                    style={{ top: menuPos.top, right: menuPos.right }}
                    className="fixed z-50 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-fadeIn"
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            const id = openMenuId;
                            closeMenu();
                            handleEdit(id);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition"
                    >
                        <Pencil size={16} className="text-[var(--brand-secondary)]" />
                        <span>Edit</span>
                    </button>

                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            const id = openMenuId;
                            closeMenu();
                            handleDelete(id);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition"
                    >
                        <Trash2 size={16} className="text-[var(--brand-primary)]" />
                        <span>Delete</span>
                    </button>
                </div>
            )}

            <PopupAlert
                type={popUpAlertData.type}
                message={popUpAlertData.message}
                confirmText={popUpAlertData.type === "confirm" ? "Yes" : "OK"}
                cancelText={popUpAlertData.type === "confirm" ? "Cancel" : undefined}
                onConfirm={popUpAlertData.onConfirm}
                onCancel={popUpAlertData.onCancel}
                show={popUpAlertData.isOpen}
            />
        </div>
    );
}
