import React from "react";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 md:space-y-8 animate-pulse">
      {/* Row 1: Executive KPI Summary Cards (4-Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-[#e8d5c8]/80 shadow-sm flex flex-col justify-between min-h-[128px]"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-gray-200 rounded-md" />
              <div className="h-6 w-6 bg-gray-100 rounded-full" />
            </div>
            <div className="space-y-2 mt-3">
              <div className="h-8 w-36 bg-gray-300 rounded-lg" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: Operational Split (2/3 Left + 1/3 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Action Queue (2/3) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#e8d5c8]/80 shadow-sm min-h-[340px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="h-5 w-32 bg-gray-300 rounded-md" />
              <div className="h-4 w-20 bg-gray-100 rounded-md" />
            </div>
            <div className="h-8 w-full bg-gray-100 rounded-lg mb-3" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="h-11 w-full bg-gray-50 rounded-lg flex items-center justify-between px-4">
                  <div className="h-4 w-36 bg-gray-200 rounded" />
                  <div className="h-4 w-8 bg-gray-200 rounded" />
                  <div className="h-7 w-20 bg-gray-200 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Marketplace Health (1/3) */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 border border-[#e8d5c8]/80 shadow-sm min-h-[340px] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="h-5 w-40 bg-gray-300 rounded-md mb-2" />
            <div className="p-3.5 bg-gray-50 rounded-xl space-y-2">
              <div className="h-4 w-44 bg-gray-200 rounded" />
              <div className="h-3 w-28 bg-gray-100 rounded" />
            </div>
            <div className="p-3.5 bg-gray-50 rounded-xl space-y-2">
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <div className="h-3.5 w-3.5 bg-gray-200 rounded-full" />
              <div className="h-3.5 w-32 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="pt-4 mt-auto">
            <div className="h-11 w-full bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Row 3: Analytics Charts (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-[#e8d5c8]/80 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="h-5 w-36 bg-gray-300 rounded-md" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
          <div className="h-[280px] w-full bg-gray-50 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl p-6 border border-[#e8d5c8]/80 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div className="h-5 w-36 bg-gray-300 rounded-md" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
          <div className="h-[280px] w-full bg-gray-50 rounded-xl" />
        </div>
      </div>

      {/* Row 4: Catalog Quick-Stats Strip */}
      <div className="bg-white rounded-2xl p-5 border border-[#e8d5c8]/80 shadow-sm">
        <div className="h-4 w-36 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((s) => (
            <div key={s} className="h-14 bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
              <div className="h-3 w-16 bg-gray-200 rounded" />
              <div className="h-4 w-8 bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Row 5: Recent Blogs */}
      <div className="bg-white rounded-2xl p-6 border border-[#e8d5c8]/80 shadow-sm">
        <div className="flex justify-between items-center mb-5">
          <div className="h-5 w-32 bg-gray-300 rounded-md" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3].map((b) => (
            <div key={b} className="py-3.5 flex justify-between items-center">
              <div className="space-y-1.5">
                <div className="h-4 w-64 sm:w-96 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
