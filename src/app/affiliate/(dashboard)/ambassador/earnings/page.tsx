"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, CheckCircle, AlertCircle, Eye, RefreshCw } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import { useSession } from "next-auth/react";
import Loader from "@/components/Loader";
import AlertMessage from "@/components/AlertMessage";
import { useRouter } from "next/navigation";
import { ambassadorService } from "@/lib/services/ambassadorService";
import { ROUTES } from "@/constants/routes";

export default function AmbassadorEarningsPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const token = session?.user?.token;
    const affiliateType = session?.user?.affiliateType;

    const [invoices, setInvoices] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // auth guard
    useEffect(() => {
        if (status === "loading") return;

        if (status === "unauthenticated") {
            router.replace(ROUTES.AFFILIATE.LOGIN);
            return;
        }

        if (session?.user?.role !== "affiliate" || affiliateType !== "ambassador") {
            router.replace(ROUTES.HOME);
        }
    }, [status, session?.user?.role, affiliateType, router]);

    // fetch once per token (client-side search via useMemo)
    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setError(null);
            const result = await ambassadorService.getEarnings(token);
            setInvoices(result.invoices || []);
            setSummary(result.summary || { totalEarned: 0, totalPaid: 0, totalPending: 0 });
        } catch (err: any) {
            setError(err?.message || "Failed to fetch ambassador earnings.");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (
            status !== "authenticated" ||
            session?.user?.role !== "affiliate" ||
            affiliateType !== "ambassador"
        ) {
            return;
        }
        if (!token) {
            setLoading(false);
            return;
        }
        fetchData();
    }, [status, session?.user?.role, affiliateType, token, fetchData]);

    const filteredInvoices = useMemo(() => {
        const term = debouncedSearch.trim().toLowerCase();
        if (!term) return invoices;
        return invoices.filter(
            (inv: any) =>
                (inv.invoiceNumber ?? "").toLowerCase().includes(term) ||
                (inv.monthLabel ?? "").toLowerCase().includes(term)
        );
    }, [invoices, debouncedSearch]);

    if (loading || status === "loading") return <Loader />;

    if (error || !summary) {
        return (
            <div className="p-6 max-w-3xl mx-auto space-y-4">
                <AlertMessage type="error" message={error || "Failed to load ambassador earnings."} />
                <button
                    type="button"
                    onClick={fetchData}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[#c32230] transition"
                >
                    <RefreshCw size={16} />
                    Retry
                </button>
            </div>
        );
    }

    const totalPages = Math.ceil(filteredInvoices.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginated = filteredInvoices.slice(startIndex, startIndex + pageSize);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Summary Header */}
            <h1 className="text-2xl font-semibold mb-6 text-[var(--text-primary)]">
                My Ambassador Earnings
            </h1>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-5 rounded-xl bg-white shadow border">
                    <p className="text-gray-500 text-sm">Total Earned</p>
                    <h2 className="text-xl font-semibold">£{Number(summary.totalEarned ?? 0).toFixed(2)}</h2>
                </div>

                <div className="p-5 rounded-xl bg-white shadow border">
                    <p className="text-gray-500 text-sm">Paid</p>
                    <h2 className="text-xl font-semibold text-green-600">
                        £{Number(summary.totalPaid ?? 0).toFixed(2)}
                    </h2>
                </div>

                <div className="p-5 rounded-xl bg-white shadow border">
                    <p className="text-gray-500 text-sm">Pending</p>
                    <h2 className="text-xl font-semibold text-orange-500">
                        £{Number(summary.totalPending ?? 0).toFixed(2)}
                    </h2>
                </div>
            </div>

            {/* Table card */}
            <div className="bg-white rounded-xl shadow border overflow-hidden">
                {/* Search */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4">
                    <h2 className="text-lg font-semibold">Earnings History</h2>

                    <div className="relative w-full sm:w-72">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            aria-label="Search invoice or month"
                            placeholder="Search invoice or month..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="no-focus-ring w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-gray-400 focus:outline-none focus:border-[var(--brand-secondary)] focus:ring-2 focus:ring-[var(--brand-secondary)]/20 transition"
                        />
                    </div>
                </div>

                <div className="border-t"></div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-100 text-gray-700 text-xs uppercase">
                            <tr>
                                <th className="py-3 px-3 text-center">Sn</th>
                                <th className="py-3 px-3 text-center">Month</th>
                                <th className="py-3 px-3 text-center">Invoice</th>
                                <th className="py-3 px-3 text-center">Amount</th>
                                <th className="py-3 px-3 text-center">Status</th>
                                <th className="py-3 px-3 text-center">View</th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginated.length > 0 ? (
                                paginated.map((inv: any, idx: number) => (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="py-3 px-3 text-center">{startIndex + idx + 1}</td>
                                        <td className="py-3 px-3 text-center">{inv.monthLabel}</td>
                                        <td className="py-3 px-3 text-center font-semibold">{inv.invoiceNumber}</td>
                                        <td className="py-3 px-3 text-center font-semibold">
                                            £{Number(inv.totalAmount ?? 0).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {inv.isPaid ? (
                                                <CheckCircle className="text-green-500 mx-auto" />
                                            ) : (
                                                <AlertCircle className="text-orange-500 mx-auto" />
                                            )}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {inv.invoiceUrl && (
                                                <a
                                                    href={inv.invoiceUrl}
                                                    className="text-[var(--brand-primary)] font-medium inline-flex items-center justify-center gap-1 hover:underline"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <Eye size={16} /> View
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-500">
                                        No earnings found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredInvoices.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalItems={filteredInvoices.length}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                    />
                )}
            </div>
        </div>
    );
}
