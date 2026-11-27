"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import Loader from "@/components/Loader";
import AlertMessage from "@/components/AlertMessage";
import PopupAlert from "@/components/PopupAlert";
import { ROUTES } from "@/constants/routes";
import { affiliateService } from "@/lib/services/affiliateService";

export default function AffiliateBankDetailsPage() {
  const { data: session, status } = useSession();
  const token = session?.user?.token;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    accountName: "",
    accountNumber: "",
    sortCode: "",
    iban: "",
    paypalEmail: "",
  });

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

  const inputClass =
    "no-focus-ring w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-gray-400 focus:outline-none focus:border-[var(--brand-secondary)] focus:ring-2 focus:ring-[var(--brand-secondary)]/20 transition";

  /* ---------------- LOAD EXISTING DATA ---------------- */
  const loadBankDetails = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await affiliateService.getBankAccount(token);
      if (res) {
        setForm({
          accountName: res.accountName || "",
          accountNumber: res.accountNumber || "",
          sortCode: res.sortCode || "",
          iban: res.iban || "",
          paypalEmail: res.paypalEmail || "",
        });
      }
    } catch (err: any) {
      setAlert({
        isOpen: true,
        type: "error",
        message: err?.message || "Failed to load payout details.",
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  /* ---------------- AUTH GUARD ---------------- */
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace(ROUTES.AFFILIATE.LOGIN);
      return;
    }

    if (session?.user?.role !== "affiliate") {
      router.replace(ROUTES.HOME);
      return;
    }

    loadBankDetails();
  }, [status, session?.user?.role, router, loadBankDetails]);

  /* ---------------- VALIDATION ---------------- */
  const validate = () => {
    if (!form.accountName.trim()) {
      return "Account holder name is required.";
    }

    if (
      !form.accountNumber.trim() &&
      !form.iban.trim() &&
      !form.paypalEmail.trim()
    ) {
      return "Please provide at least one payout method.";
    }

    if (
      form.paypalEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.paypalEmail)
    ) {
      return "Please enter a valid PayPal email.";
    }

    return null;
  };

  /* ---------------- SAVE ---------------- */
  const saveBankDetails = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const error = validate();
    if (error) {
      return setPopup({
        isOpen: true,
        type: "warning",
        message: error,
      });
    }

    try {
      setSaving(true);
      await affiliateService.saveBankAccount(token!, form);

      setAlert({
        isOpen: true,
        type: "success",
        message: "Payout details saved successfully.",
      });
    } catch (err: any) {
      setAlert({
        isOpen: true,
        type: "error",
        message: err.message || "Failed to save payout details.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) return <Loader />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {alert.isOpen && (
        <AlertMessage
          type={alert.type as "success" | "error"}
          message={alert.message}
          onClose={() => setAlert((p) => ({ ...p, isOpen: false }))}
        />
      )}

      <form
        onSubmit={saveBankDetails}
        className="bg-white p-6 rounded-xl shadow border border-[var(--soft-gray)]"
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6 border-b pb-4">
          Payout / Bank Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label
              htmlFor="account-name"
              className="block text-sm font-medium text-[var(--text-secondary)]"
            >
              Account Holder Name <span className="text-[var(--brand-primary)]">*</span>
            </label>
            <input
              id="account-name"
              name="accountName"
              type="text"
              value={form.accountName}
              onChange={(e) =>
                setForm((p) => ({ ...p, accountName: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="account-number"
              className="block text-sm font-medium text-[var(--text-secondary)]"
            >
              Account Number
            </label>
            <input
              id="account-number"
              name="accountNumber"
              type="text"
              value={form.accountNumber}
              onChange={(e) =>
                setForm((p) => ({ ...p, accountNumber: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="sort-code"
              className="block text-sm font-medium text-[var(--text-secondary)]"
            >
              Sort Code
            </label>
            <input
              id="sort-code"
              name="sortCode"
              type="text"
              value={form.sortCode}
              onChange={(e) =>
                setForm((p) => ({ ...p, sortCode: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="iban"
              className="block text-sm font-medium text-[var(--text-secondary)]"
            >
              IBAN
            </label>
            <input
              id="iban"
              name="iban"
              type="text"
              value={form.iban}
              onChange={(e) =>
                setForm((p) => ({ ...p, iban: e.target.value }))
              }
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="paypal-email"
              className="block text-sm font-medium text-[var(--text-secondary)]"
            >
              PayPal Email
            </label>
            <input
              id="paypal-email"
              name="paypalEmail"
              type="email"
              value={form.paypalEmail}
              onChange={(e) =>
                setForm((p) => ({ ...p, paypalEmail: e.target.value }))
              }
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-[var(--mid-gray)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--text-primary)] hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[#c32230] disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save Details
          </button>
        </div>
      </form>

      {popup.isOpen && (
        <PopupAlert
          type={popup.type as any}
          message={popup.message}
          confirmText="OK"
          onConfirm={() => setPopup((p) => ({ ...p, isOpen: false }))}
          show={popup.isOpen}
        />
      )}
    </div>
  );
}
