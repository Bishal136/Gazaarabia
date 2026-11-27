"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import PopupAlert from "@/components/PopupAlert";
import AlertMessage from "@/components/AlertMessage";
import { couponService } from "@/lib/services/couponService";
import { useSession } from "next-auth/react";
import { ROUTES } from "@/constants/routes";

export default function AddOrEditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const couponId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(Boolean(couponId));
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

  const [form, setForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    maxUsage: "",
    perUserLimit: "",
    minOrderAmount: "",
    startDate: "",
    endDate: "",
    isActive: true,
  });

  const inputClass =
    "no-focus-ring w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-gray-400 focus:outline-none focus:border-[var(--brand-secondary)] focus:ring-2 focus:ring-[var(--brand-secondary)]/20 transition";

  // Auth check
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") router.replace(ROUTES.AFFILIATE.LOGIN);
    else if (
      status === "authenticated" &&
      session?.user?.role !== "affiliate"
    )
      router.replace(ROUTES.HOME);
  }, [status, session, router]);

  // Load existing coupon if editing
  useEffect(() => {
    if (!couponId) {
      setFetching(false);
      return;
    }
    if (!session?.user?.token) return;
    (async () => {
      try {
        setFetching(true);
        const res: any = await couponService.getById(
          session?.user?.token as string,
          Number(couponId)
        );
        const c = res?.data;
        if (c) {
          setForm({
            code: c.code,
            discountType: c.discountType,
            discountValue: String(c.discountValue),
            maxUsage: c.maxUsage ? String(c.maxUsage) : "",
            perUserLimit: c.perUserLimit ? String(c.perUserLimit) : "",
            minOrderAmount: c.minOrderAmount ? String(c.minOrderAmount) : "",
            startDate: c.startDate ? c.startDate.split("T")[0] : "",
            endDate: c.endDate ? c.endDate.split("T")[0] : "",
            isActive: c.isActive,
          });
        }
      } catch (err: any) {
        setAlert({
          isOpen: true,
          type: "error",
          message: err.message || "Failed to load coupon.",
        });
      } finally {
        setFetching(false);
      }
    })();
  }, [couponId, session?.user?.token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "discountValue" && form.discountType === "percentage") {
      const num = Number(value);
      if (num > 100) {
        setPopup({
          isOpen: true,
          type: "warning",
          message: "Percentage discount cannot exceed 100%.",
        });
        setForm((p) => ({ ...p, discountValue: "100" }));
        return;
      }
      if (num < 0) return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, isActive: e.target.checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code || !form.discountValue) {
      setPopup({
        isOpen: true,
        type: "warning",
        message: "Coupon code and discount value are required.",
      });
      return;
    }

    // Validate percentage range
    if (form.discountType === "percentage") {
      const val = Number(form.discountValue);
      if (val <= 0 || val > 100) {
        setPopup({
          isOpen: true,
          type: "warning",
          message: "For percentage discounts, value must be between 1 and 100.",
        });
        return;
      }
    }

    if (form.discountType === "fixed" && Number(form.discountValue) <= 0) {
      setPopup({
        isOpen: true,
        type: "warning",
        message: "Fixed discount must be greater than 0.",
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxUsage: form.maxUsage ? Number(form.maxUsage) : undefined,
        perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : undefined,
        minOrderAmount: form.minOrderAmount
          ? Number(form.minOrderAmount)
          : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        isActive: form.isActive,
      };

      if (couponId) {
        await couponService.updateCoupon(
          session?.user?.token as string,
          Number(couponId),
          payload
        );
        setAlert({
          isOpen: true,
          type: "success",
          message: "Coupon updated successfully!",
        });
      } else {
        await couponService.addCoupon(session?.user?.token as string, payload);
        setAlert({
          isOpen: true,
          type: "success",
          message: "Coupon added successfully!",
        });
      }

      setTimeout(() => router.push("/affiliate/coupons"), 1200);
    } catch (err: any) {
      setAlert({
        isOpen: true,
        type: "error",
        message: err.message || "Failed to save coupon.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {alert.isOpen && (
        <AlertMessage
          type={alert.type as "success" | "error"}
          message={alert.message}
          onClose={() => setAlert((p) => ({ ...p, isOpen: false }))}
        />
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white p-6 rounded-xl shadow border border-[var(--soft-gray)]">
          <div className="mb-6 border-b pb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {couponId ? "Edit Coupon" : "Add New Coupon"}
            </h2>
            {fetching && (
              <span className="inline-flex items-center gap-2 text-xs text-gray-500">
                <Loader2 size={14} className="animate-spin" />
                Loading coupon...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label
                htmlFor="coupon-code"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                Coupon Code <span className="text-[var(--brand-primary)]">*</span>
              </label>
              <input
                id="coupon-code"
                name="code"
                type="text"
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                }
                required
                maxLength={20}
                placeholder="e.g. SAVE10"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="discount-value"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                {form.discountType === "percentage"
                  ? "Discount Percentage (%)"
                  : "Discount Value"}{" "}
                <span className="text-[var(--brand-primary)]">*</span>
              </label>
              <input
                id="discount-value"
                name="discountValue"
                type="number"
                value={form.discountValue}
                onChange={handleChange}
                required
                min={0}
                max={form.discountType === "percentage" ? 100 : undefined}
                placeholder="e.g. 10"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="max-usage"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                Max Usage Limit
              </label>
              <input
                id="max-usage"
                name="maxUsage"
                type="number"
                value={form.maxUsage}
                onChange={handleChange}
                min={0}
                placeholder="Unlimited if empty"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="per-user-limit"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                Per User Usage Limit
              </label>
              <input
                id="per-user-limit"
                name="perUserLimit"
                type="number"
                value={form.perUserLimit}
                onChange={handleChange}
                min={0}
                placeholder="1"
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="start-date"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                Start Date
              </label>
              <input
                id="start-date"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="end-date"
                className="block text-sm font-medium text-[var(--text-secondary)]"
              >
                End Date
              </label>
              <input
                id="end-date"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
            <label
              htmlFor="coupon-active"
              className="inline-flex items-center gap-2.5 cursor-pointer select-none"
            >
              <input
                id="coupon-active"
                type="checkbox"
                checked={form.isActive}
                onChange={handleCheckboxChange}
                className="no-focus-ring h-4 w-4 rounded border-gray-300 accent-[var(--brand-secondary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand-secondary)]/30"
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Active
              </span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/affiliate/coupons")}
                className="px-4 py-2 rounded-lg border border-[var(--mid-gray)] text-sm font-medium text-[var(--text-primary)] hover:border-[var(--text-primary)] hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || fetching}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:bg-[#c32230] disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {couponId ? "Update Coupon" : "Create Coupon"}
              </button>
            </div>
          </div>
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
