"use client";

import React, { useEffect } from "react";
import { X, Banknote, Truck, MapPin, Phone, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatGBP } from "@/lib/utils/shipping";

interface CODConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  amount: number;
  address: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  } | null;
}

export default function CODConfirmationModal({
  open,
  onClose,
  onConfirm,
  loading,
  amount,
  address,
}: CODConfirmationModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !loading) onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [open, onClose, loading]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-[2px] animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cod-modal-title"
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Header Icon + Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-xs">
            <Banknote size={28} />
          </div>
          <h2 id="cod-modal-title" className="text-xl sm:text-2xl font-bold text-[#0a0808]">
            Cash on Delivery (COD)
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Pay with cash when your package is delivered
          </p>
        </div>

        {/* Price Pill */}
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-emerald-700" />
            <span className="text-sm font-semibold text-emerald-900">Total Due Upon Delivery</span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-emerald-700">
            {formatGBP(amount)}
          </span>
        </div>

        {/* Delivery Address Summary */}
        {address && (
          <div className="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2 text-left">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-500">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-[#b08a78]" />
                Delivery Destination
              </span>
            </div>
            <p className="text-sm font-semibold text-[#0a0808]">
              {address.firstName} {address.lastName}
            </p>
            {address.phone && (
              <p className="text-xs text-gray-600 flex items-center gap-1.5">
                <Phone size={12} className="text-gray-400" />
                <span>{address.phone}</span>
              </p>
            )}
            <p className="text-xs text-gray-500 leading-relaxed">
              {address.address1}
              {address.address2 ? `, ${address.address2}` : ""}, {address.city}, {address.country}{" "}
              {address.postalCode}
            </p>
          </div>
        )}

        {/* Notice Card */}
        <div className="mb-6 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p>
            Please ensure someone is available at the delivery address and keep the exact amount ready in cash when the courier arrives.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-6 rounded-full font-bold text-sm transition-all duration-200 active:scale-[0.99] shadow-sm disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Placing Your COD Order...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Confirm & Place Order ({formatGBP(amount)})</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-full text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
          >
            Cancel & Return to Checkout
          </button>
        </div>

        {/* Trust Badge */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Guaranteed Authentic & Verified by Gazaarabia</span>
        </div>
      </div>
    </div>
  );
}
