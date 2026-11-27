import React from "react";

export default function AffiliateDashboardLoading() {
  return (
    <div className="space-y-6 md:space-y-8 p-6 animate-pulse">
      {/* Top 4 KPI summary cards matching DashboardSkeleton aesthetic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between min-h-[120px]"
          >
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-8 w-36 bg-gray-300 rounded-lg mt-3" />
          </div>
        ))}
      </div>

      {/* Two side-by-side summary & recent activity panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((panel) => (
          <div
            key={panel}
            className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5"
          >
            <div className="h-5 w-40 bg-gray-300 rounded-md" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].slice(0, panel === 1 ? 4 : 3).map((stat) => (
                <div
                  key={stat}
                  className="p-4 rounded-lg border border-slate-100 space-y-2"
                >
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-6 w-20 bg-gray-300 rounded" />
                </div>
              ))}
            </div>
            <div className="h-4 w-36 bg-gray-200 rounded" />
            <div className="space-y-3">
              <div className="h-9 w-full bg-[#f1f5f9]/70 rounded-lg" />
              {[1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="h-10 w-full flex items-center justify-between px-4 border-b border-slate-100"
                >
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-20 bg-gray-200 rounded" />
                  <div className="h-4 w-14 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
