import React from "react";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8 animate-pulse">
      {/* Row 1: 4 High-Impact KPI Cards (Matching Target Mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[120px]"
          >
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-8 w-36 bg-gray-300 rounded-lg mt-3" />
          </div>
        ))}
      </div>

      {/* Row 2: Operational Split (2/3 Left Action Queue + 1/3 Right Marketplace Health) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Panel - Action Queue (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] min-h-[300px] flex flex-col justify-between">
          <div>
            <div className="h-5 w-32 bg-gray-300 rounded-md mb-4" />
            <div className="h-8 w-full bg-[#f1f5f9]/70 rounded-lg mb-3" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-10 w-full flex items-center justify-between px-4 border-b border-slate-100">
                  <div className="h-4 w-36 bg-gray-200 rounded" />
                  <div className="h-4 w-8 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Marketplace Health (1/3) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] min-h-[300px] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-5 w-40 bg-gray-300 rounded-md mb-5" />
            <div className="h-4 w-44 bg-emerald-100/70 rounded" />
            <div className="h-4 w-48 bg-rose-100/70 rounded" />
            <div className="h-3 w-32 bg-gray-200 rounded pt-2" />
          </div>
          <div className="pt-6">
            <div className="h-10 w-full bg-gray-100 border border-slate-200 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Row 3: Analytics Charts (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex justify-between items-center mb-6">
            <div className="h-5 w-36 bg-gray-300 rounded-md" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
          <div className="h-[280px] w-full bg-gray-50 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex justify-between items-center mb-6">
            <div className="h-5 w-36 bg-gray-300 rounded-md" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
          <div className="h-[280px] w-full bg-gray-50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
