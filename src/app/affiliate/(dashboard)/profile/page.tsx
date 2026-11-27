"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import Loader from "@/components/Loader";
import { affiliateService } from "@/lib/services/affiliateService";
import { useRouter } from "next/navigation";
import PopupAlert from "@/components/PopupAlert";
import AlertMessage from "@/components/AlertMessage";

export default function AffiliateProfilePage() {
    const { data: session, status } = useSession();
    const token = session?.user?.token;
    const router = useRouter();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [shareCommission, setShareCommission] = useState("");

    const [alert, setAlert] = useState({
        isOpen: false,
        type: "" as "success" | "error" | "",
        message: "",
    });

    const [popup, setPopup] = useState({
        isOpen: false,
        type: "" as "success" | "error" | "warning" | "",
        message: "",
    });

    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") {
            router.replace(ROUTES.AFFILIATE.LOGIN);
            return;
        }
        if (session?.user?.role !== "affiliate") {
            router.replace(ROUTES.HOME);
        }
    }, [status, session?.user?.role, router]);

    const fetchProfile = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            setError(null);
            const res = await affiliateService.getProfile(token);
            setProfile(res);
            setShareCommission(
                res?.shareCommission !== undefined && res?.shareCommission !== null
                    ? String(res.shareCommission)
                    : ""
            );
        } catch (err: any) {
            const message = err?.message || "Failed to load profile.";
            setError(message);
            setAlert({
                isOpen: true,
                type: "error",
                message,
            });
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (status !== "authenticated" || session?.user?.role !== "affiliate") return;
        if (!token) {
            setLoading(false);
            setError("Session token is missing. Please sign in again.");
            return;
        }
        fetchProfile();
    }, [status, session?.user?.role, token, fetchProfile]);

    const updateCommission = async () => {
        if (shareCommission.trim() === "" || Number.isNaN(Number(shareCommission))) {
            return setPopup({
                isOpen: true,
                type: "warning",
                message: "Please enter a valid commission percentage.",
            });
        }

        const value = Number(shareCommission);

        if (value < 0) {
            return setPopup({
                isOpen: true,
                type: "warning",
                message: "Commission cannot be negative.",
            });
        }

        if (value > profile.baseCommission) {
            return setPopup({
                isOpen: true,
                type: "warning",
                message: `Share Commission cannot exceed your Base Commission (${profile.baseCommission}%).`,
            });
        }

        try {
            setSaving(true);
            await affiliateService.updateShareCommission(token!, value);
            setProfile((prev: any) => (prev ? { ...prev, shareCommission: value } : prev));
            setAlert({
                isOpen: true,
                type: "success",
                message: "Commission updated successfully!",
            });
        } catch (err: any) {
            setAlert({
                isOpen: true,
                type: "error",
                message: err.message || "Failed to update commission.",
            });
        } finally {
            setSaving(false);
        }
    };

    if (status === "loading" || loading) return <Loader />;

    if (error || !profile) {
        return (
            <div className="max-w-3xl mx-auto p-6 space-y-4">
                <AlertMessage
                    type="error"
                    message={error || "Unable to load affiliate profile."}
                    onClose={() => setAlert((p) => ({ ...p, isOpen: false }))}
                />
                <button
                    type="button"
                    onClick={fetchProfile}
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[#c32230] transition"
                >
                    <RefreshCw size={16} />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            {alert.isOpen && (
                <AlertMessage
                    type={alert.type as "success" | "error"}
                    message={alert.message}
                    onClose={() => setAlert((p) => ({ ...p, isOpen: false }))}
                />
            )}

            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                My Profile
            </h1>

            <div className="bg-white rounded-xl shadow border p-6 space-y-4">
                <div className="flex justify-between">
                    <p className="text-gray-600 font-medium">Name:</p>
                    <p className="text-gray-900 font-semibold">{profile.name}</p>
                </div>

                <div className="flex justify-between">
                    <p className="text-gray-600 font-medium">Email:</p>
                    <p className="text-gray-900 font-semibold">{profile.email}</p>
                </div>

                <div className="flex justify-between">
                    <p className="text-gray-600 font-medium">Base Commission:</p>
                    <p className="text-gray-900 font-semibold">
                        {profile.baseCommission}%
                    </p>
                </div>

                <div className="flex justify-between">
                    <p className="text-gray-600 font-medium">Current Share Commission:</p>
                    <p className="text-gray-900 font-semibold">
                        {profile.shareCommission}%
                    </p>
                </div>
            </div>

            {/* UPDATE SHARE COMMISSION */}
            <div className="bg-white p-6 shadow rounded-xl space-y-4">
                <label className="block text-gray-600 font-medium">
                    Update Share Commission (%)
                </label>

                <input
                    type="number"
                    value={shareCommission}
                    onChange={(e) => setShareCommission(e.target.value)}
                    className="border rounded-lg p-2 w-full"
                />

                <button
                    type="button"
                    onClick={updateCommission}
                    disabled={saving}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg disabled:opacity-60 transition"
                >
                    {saving ? "Saving..." : "Save"}
                </button>
            </div>

            {/* REFERRAL LINK */}
            <div className="bg-white rounded-xl shadow border p-6 space-y-4 mt-6">
                <h2 className="text-lg font-semibold text-gray-800">Your Referral Link</h2>

                <div className="flex items-center gap-3">
                    {(() => {
                        const origin = typeof window !== "undefined"
                            ? window.location.origin
                            : "https://gazaarabia.com";
                        const referralUrl = `${origin}/?ref=${profile.referralCode}`;
                        return (
                            <>
                                <input
                                    type="text"
                                    readOnly
                                    value={referralUrl}
                                    className="p-2 border rounded-lg w-full"
                                />

                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(referralUrl);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 1500);
                                    }}
                                    className="bg-blue-600 text-white px-3 py-2 rounded-lg"
                                >
                                    Copy
                                </button>
                            </>
                        );
                    })()}
                </div>

                {copied && (
                    <p className="text-green-600 text-sm font-medium mt-1">
                        Referral link copied!
                    </p>
                )}
            </div>

            {(popup.isOpen && popup.type) && (
                <PopupAlert
                    type={popup.type}
                    message={popup.message}
                    confirmText="OK"
                    onConfirm={() => setPopup((p) => ({ ...p, isOpen: false }))}
                    show={popup.isOpen}
                />
            )}
        </div>
    );
}
