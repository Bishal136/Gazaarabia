"use client";

import React from "react";

interface ProductGridSkeletonProps {
  count?: number;
  viewMode?: "grid" | "list";
}

export default function ProductGridSkeleton({
  count = 8,
  viewMode = "grid",
}: ProductGridSkeletonProps) {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-4 sm:gap-5 w-full">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row w-full rounded-2xl overflow-hidden bg-white border border-[var(--soft-gray)] shadow-sm animate-pulse p-4 sm:p-5 gap-5 sm:gap-6"
          >
            {/* Shimmer Image Container */}
            <div className="relative w-full sm:w-56 aspect-[3/4] bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <div className="w-10 h-10 rounded-full bg-gray-200/60" />
            </div>

            {/* Shimmer Card Content */}
            <div className="flex-1 space-y-3 py-1 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="h-3 w-1/4 bg-gray-200 rounded-full" />
                <div className="h-5 w-3/4 bg-gray-200 rounded-md" />
                <div className="h-4 w-full bg-gray-100 rounded-md" />
                <div className="h-4 w-2/3 bg-gray-100 rounded-md" />
              </div>
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="h-6 w-28 bg-gray-200 rounded-md" />
                <div className="h-9 w-28 bg-gray-200 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4 md:gap-6 w-full">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col w-full rounded-2xl overflow-hidden bg-white border border-[var(--soft-gray)] shadow-sm animate-pulse"
        >
          {/* Shimmer Image Container */}
          <div className="relative w-full aspect-[3/4] bg-gradient-to-br from-gray-100 via-gray-200 to-gray-100 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="w-12 h-12 rounded-full bg-gray-200/60" />
          </div>

          {/* Shimmer Card Content */}
          <div className="p-4 space-y-3">
            {/* Category / Brand pill */}
            <div className="h-3 w-1/3 bg-gray-200 rounded-full" />

            {/* Product Title lines */}
            <div className="h-4 w-4/5 bg-gray-200 rounded-md" />
            <div className="h-4 w-3/5 bg-gray-100 rounded-md" />

            {/* Price and Action */}
            <div className="flex items-center justify-between pt-2">
              <div className="h-5 w-1/3 bg-gray-200 rounded-md" />
              <div className="h-8 w-8 rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
