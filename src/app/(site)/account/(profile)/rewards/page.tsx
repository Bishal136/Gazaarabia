"use client";

import React from "react";
import { Gift, Sparkles, Award } from "lucide-react";

export default function RewardsPage() {
  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#0a0808] tracking-tight">
          Rewards
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Earn points with every purchase and redeem them for exclusive discounts
        </p>
      </div>

      <div className="bg-white border border-[#e8d5c8]/80 p-6 md:p-8 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-[#e8d5c8]/40 flex items-center justify-center text-[#b08a78]">
            <Gift size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0a0808]">GazaArabia Rewards</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Earn points with every purchase and redeem them for exclusive discounts
            </p>
          </div>
        </div>

        {/* Status / Points Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-[#e8d5c8]/20 border border-[#e8d5c8]/60">
            <p className="text-xs font-semibold text-[#b08a78] uppercase tracking-wider mb-1">
              Reward Points
            </p>
            <p className="text-2xl font-black text-[#0a0808]">0 pts</p>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Tier Status
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Award size={16} className="text-[#b08a78]" />
              <span className="text-lg font-bold text-[#0a0808]">Silver Member</span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Solidarity Contribution
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Sparkles size={16} className="text-emerald-600" />
              <span className="text-lg font-bold text-[#0a0808]">Active</span>
            </div>
          </div>
        </div>

        <div className="text-center py-8 border-t border-gray-100">
          <p className="text-sm text-[var(--text-muted)]">
            You currently have no active voucher codes. Points will automatically accrue on your next completed order!
          </p>
        </div>
      </div>
    </div>
  );
}
