"use client";

import React from "react";
import { X, RotateCcw } from "lucide-react";
import { formatGBP } from "@/lib/utils/shipping";

export interface FilterState {
  q?: string;
  availability: string[];
  sizes: number[];
  colors: number[];
  categories: number[];
  subcategories: number[];
  priceMin: number;
  priceMax: number;
  rating?: number;
}

interface ActiveFilterPillsProps {
  filters: FilterState;
  filterMeta: {
    colors: any[];
    sizes: any[];
    categories: any[];
    subcategories: any[];
  };
  onRemoveFilter: (type: keyof FilterState, value?: any) => void;
  onClearAll: () => void;
  totalResults?: number;
}

export default function ActiveFilterPills({
  filters,
  filterMeta,
  onRemoveFilter,
  onClearAll,
  totalResults,
}: ActiveFilterPillsProps) {
  const pills: { key: string; label: string; onRemove: () => void }[] = [];

  // Search Query
  if (filters.q && filters.q.trim()) {
    pills.push({
      key: `q-${filters.q}`,
      label: `"${filters.q}"`,
      onRemove: () => onRemoveFilter("q"),
    });
  }

  // Availability
  filters.availability.forEach((avail) => {
    pills.push({
      key: `avail-${avail}`,
      label: avail,
      onRemove: () => onRemoveFilter("availability", avail),
    });
  });

  // Categories
  filters.categories.forEach((catId) => {
    const cat = filterMeta.categories.find((c) => c.id === catId);
    pills.push({
      key: `cat-${catId}`,
      label: cat ? cat.name : `Category: ${catId}`,
      onRemove: () => onRemoveFilter("categories", catId),
    });
  });

  // Subcategories
  filters.subcategories.forEach((subId) => {
    const sub = filterMeta.subcategories.find((s) => s.id === subId);
    pills.push({
      key: `sub-${subId}`,
      label: sub ? sub.name : `Type: ${subId}`,
      onRemove: () => onRemoveFilter("subcategories", subId),
    });
  });

  // Sizes
  filters.sizes.forEach((sizeId) => {
    const size = filterMeta.sizes.find((s) => s.id === sizeId);
    pills.push({
      key: `size-${sizeId}`,
      label: `Size: ${size ? size.name : sizeId}`,
      onRemove: () => onRemoveFilter("sizes", sizeId),
    });
  });

  // Colors
  filters.colors.forEach((colorId) => {
    const color = filterMeta.colors.find((c) => c.id === colorId);
    pills.push({
      key: `color-${colorId}`,
      label: color ? color.name : `Color #${colorId}`,
      onRemove: () => onRemoveFilter("colors", colorId),
    });
  });

  // Price Range
  if (filters.priceMin > 0 || (filters.priceMax < 1000 && filters.priceMax > 0)) {
    pills.push({
      key: "price-range",
      label: `${formatGBP(filters.priceMin)} – ${formatGBP(filters.priceMax)}`,
      onRemove: () => onRemoveFilter("priceMin", 0),
    });
  }

  // Rating
  if (filters.rating && filters.rating > 0) {
    pills.push({
      key: `rating-${filters.rating}`,
      label: `${filters.rating}★ & above`,
      onRemove: () => onRemoveFilter("rating", 0),
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-3 px-1">
      <span className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mr-1">
        Active Filters:
      </span>

      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-[var(--text-primary)] border border-gray-200 shadow-sm transition hover:border-[var(--brand-primary)]"
        >
          <span>{pill.label}</span>
          <button
            type="button"
            onClick={pill.onRemove}
            aria-label={`Remove filter ${pill.label}`}
            className="p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-[var(--brand-primary)] transition"
          >
            <X size={13} />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition"
      >
        <RotateCcw size={12} />
        <span>Clear all</span>
      </button>

      {totalResults !== undefined && (
        <span className="ml-auto text-xs text-[var(--text-muted)] font-medium">
          {totalResults} {totalResults === 1 ? "result" : "results"}
        </span>
      )}
    </div>
  );
}
