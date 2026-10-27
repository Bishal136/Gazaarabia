"use client";

import React, { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import {
  ChevronDown,
  ChevronUp,
  Search,
  X,
  RotateCcw,
  Check,
  Star,
  SlidersHorizontal,
} from "lucide-react";
import { FilterState } from "./ActiveFilterPills";
import { formatGBP } from "@/lib/utils/shipping";

interface ProductFilterSidebarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filterMeta: {
    colors: any[];
    sizes: any[];
    categories: any[];
    subcategories: any[];
  };
  onApply?: () => void;
  onReset: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
  totalProducts?: number;
}

export default function ProductFilterSidebar({
  filters,
  setFilters,
  filterMeta,
  onApply,
  onReset,
  isMobileDrawer = false,
  onCloseMobileDrawer,
  totalProducts,
}: ProductFilterSidebarProps) {
  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    categories: true,
    price: true,
    colors: true,
    rating: true,
    availability: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Price slider buffer
  const [localPrice, setLocalPrice] = useState<[number, number]>([
    filters.priceMin || 0,
    filters.priceMax || 1000,
  ]);

  const handlePriceChange = (values: number[]) => {
    const min = values[0];
    const max = values[1];
    setLocalPrice([min, max]);
    setFilters((prev) => ({
      ...prev,
      priceMin: min,
      priceMax: max,
    }));
  };

  const activeCount =
    (filters.q ? 1 : 0) +
    filters.availability.length +
    filters.categories.length +
    filters.subcategories.length +
    filters.colors.length +
    (filters.rating ? 1 : 0) +
    (filters.priceMin > 0 || (filters.priceMax < 1000 && filters.priceMax > 0) ? 1 : 0);

  return (
    <div
      className={`flex flex-col h-full min-h-0 overflow-hidden bg-white ${
        isMobileDrawer ? "p-0" : "border border-gray-200/80 rounded-2xl shadow-sm p-6"
      }`}
    >
      {/* SIDEBAR HEADER */}
      <div
        className={`flex items-center justify-between pb-4 border-b border-gray-100 shrink-0 ${
          isMobileDrawer ? "p-4" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-[var(--brand-primary)]" />
          <h3 className="font-semibold text-base text-[var(--text-primary)] uppercase tracking-wider">
            Filters
          </h3>
          {activeCount > 0 && (
            <span className="bg-[var(--brand-primary)] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}

          {isMobileDrawer && onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              aria-label="Close filters"
              className="p-1 rounded-full text-gray-500 hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* FILTER SECTIONS SCROLL AREA */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto space-y-5 pt-3 divide-y divide-gray-100 overscroll-contain no-scrollbar ${
          isMobileDrawer ? "px-4 pb-6" : "pr-1"
        }`}
      >
        {/* 1. CATEGORIES */}
        {filterMeta.categories?.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => toggleSection("categories")}
              className="flex items-center justify-between w-full text-left font-semibold text-sm text-[var(--text-primary)] mb-3"
            >
              <span>Categories</span>
              {openSections.categories ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openSections.categories && (
              <div className="space-y-2 max-h-52 overflow-y-auto overscroll-contain no-scrollbar pr-1">
                {filterMeta.categories.map((cat) => {
                  const isChecked = filters.categories.includes(cat.id);
                  return (
                    <label
                      key={cat.id}
                      className="flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-black cursor-pointer py-1 group select-none min-w-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            setFilters((prev) => ({
                              ...prev,
                              categories: isChecked
                                ? prev.categories.filter((id) => id !== cat.id)
                                : [...prev.categories, cat.id],
                            }))
                          }
                          className="w-4 h-4 rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] shrink-0"
                        />
                        <span className={`truncate ${isChecked ? "font-semibold text-[var(--brand-primary)]" : ""}`}>
                          {cat.name}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. PRICE RANGE DUAL SLIDER & INPUTS */}
        <div className="pt-5">
          <button
            type="button"
            onClick={() => toggleSection("price")}
            className="flex items-center justify-between w-full text-left font-semibold text-sm text-[var(--text-primary)] mb-3"
          >
            <span>Price Range</span>
            {openSections.price ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {openSections.price && (
            <div className="space-y-4">
              {/* Slider Component */}
              <div className="px-2 pt-2">
                <Slider.Root
                  value={localPrice}
                  min={0}
                  max={1000}
                  step={5}
                  onValueChange={handlePriceChange}
                  className="relative flex items-center select-none touch-none w-full h-5"
                >
                  <Slider.Track className="bg-gray-200 relative grow rounded-full h-1.5">
                    <Slider.Range className="absolute bg-[var(--brand-primary)] rounded-full h-full" />
                  </Slider.Track>
                  <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-[var(--brand-primary)] shadow-md rounded-full hover:scale-110 focus:outline-none transition-transform cursor-grab active:cursor-grabbing" />
                  <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-[var(--brand-primary)] shadow-md rounded-full hover:scale-110 focus:outline-none transition-transform cursor-grab active:cursor-grabbing" />
                </Slider.Root>
              </div>

              {/* Min - Max Input Boxes */}
              <div className="flex items-center justify-between gap-2.5 text-xs">
                <div className="flex-1 min-w-0 border border-gray-200 rounded-lg p-2 bg-gray-50 focus-within:border-[var(--brand-primary)] focus-within:bg-white transition">
                  <span className="text-[10px] text-gray-400 block uppercase font-medium">Min</span>
                  <div className="flex items-center gap-1 font-semibold text-gray-800">
                    <span className="shrink-0">£</span>
                    <input
                      type="number"
                      min={0}
                      max={localPrice[1]}
                      value={localPrice[0]}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        handlePriceChange([val, localPrice[1]]);
                      }}
                      className="w-full min-w-0 bg-transparent outline-none text-xs"
                    />
                  </div>
                </div>

                <span className="text-gray-300 font-bold shrink-0">—</span>

                <div className="flex-1 min-w-0 border border-gray-200 rounded-lg p-2 bg-gray-50 focus-within:border-[var(--brand-primary)] focus-within:bg-white transition">
                  <span className="text-[10px] text-gray-400 block uppercase font-medium">Max</span>
                  <div className="flex items-center gap-1 font-semibold text-gray-800">
                    <span className="shrink-0">£</span>
                    <input
                      type="number"
                      min={localPrice[0]}
                      max={1000}
                      value={localPrice[1]}
                      onChange={(e) => {
                        const val = Math.min(1000, Number(e.target.value) || 1000);
                        handlePriceChange([localPrice[0], val]);
                      }}
                      className="w-full min-w-0 bg-transparent outline-none text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. COLOURS */}
        {filterMeta.colors?.length > 0 && (
          <div className="pt-5">
            <button
              type="button"
              onClick={() => toggleSection("colors")}
              className="flex items-center justify-between w-full text-left font-semibold text-sm text-[var(--text-primary)] mb-3"
            >
              <span>Colour</span>
              {openSections.colors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openSections.colors && (
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto overscroll-contain no-scrollbar pr-1">
                {filterMeta.colors.map((c) => {
                  const isSelected = filters.colors.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={c.name}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          colors: isSelected
                            ? prev.colors.filter((id) => id !== c.id)
                            : [...prev.colors, c.id],
                        }))
                      }
                      className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-xs transition min-w-0 ${
                        isSelected
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 font-semibold text-[var(--brand-primary)]"
                          : "border-gray-200 hover:border-gray-300 text-gray-700 bg-white"
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/20 flex items-center justify-center shrink-0 shadow-inner"
                        style={{ backgroundColor: c.hexCode || "#fff" }}
                      >
                        {isSelected && (
                          <Check
                            size={10}
                            className={
                              c.hexCode?.toLowerCase() === "#ffffff" ||
                              c.hexCode?.toLowerCase() === "#fff"
                                ? "text-black"
                                : "text-white"
                            }
                          />
                        )}
                      </span>
                      <span className="truncate min-w-0 block">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. RATING FILTER */}
        <div className="pt-5">
          <button
            type="button"
            onClick={() => toggleSection("rating")}
            className="flex items-center justify-between w-full text-left font-semibold text-sm text-[var(--text-primary)] mb-3"
          >
            <span>Customer Rating</span>
            {openSections.rating ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {openSections.rating && (
            <div className="space-y-2">
              {[4, 3, 2].map((stars) => {
                const isSelected = (filters.rating || 0) === stars;
                return (
                  <button
                    key={stars}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        rating: isSelected ? 0 : stars,
                      }))
                    }
                    className={`flex items-center gap-2 w-full p-2 rounded-lg text-xs transition min-w-0 ${
                      isSelected
                        ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-1 text-amber-400 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < stars
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-200"
                          }
                        />
                      ))}
                    </div>
                    <span className="truncate">{stars}★ & above</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. AVAILABILITY */}
        <div className="pt-5 pb-2">
          <button
            type="button"
            onClick={() => toggleSection("availability")}
            className="flex items-center justify-between w-full text-left font-semibold text-sm text-[var(--text-primary)] mb-3"
          >
            <span>Availability</span>
            {openSections.availability ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {openSections.availability && (
            <div className="space-y-2">
              {["In stock", "Out of stock"].map((status) => {
                const isChecked = filters.availability.includes(status);
                return (
                  <label
                    key={status}
                    className="flex items-center gap-2.5 text-xs text-gray-700 hover:text-black cursor-pointer select-none py-1 min-w-0"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        setFilters((prev) => ({
                          ...prev,
                          availability: isChecked
                            ? prev.availability.filter((a) => a !== status)
                            : [...prev.availability, status],
                        }))
                      }
                      className="w-4 h-4 rounded border-gray-300 text-[var(--brand-primary)] focus:ring-[var(--brand-primary)] shrink-0"
                    />
                    <span className={`truncate ${isChecked ? "font-semibold text-[var(--brand-primary)]" : ""}`}>
                      {status}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER ACTION (FOR MOBILE DRAWER) */}
      {isMobileDrawer && onApply && (
        <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition"
          >
            Reset All
          </button>
          <button
            type="button"
            onClick={() => {
              onApply();
              onCloseMobileDrawer?.();
            }}
            className="flex-[2] py-3 rounded-xl bg-[var(--brand-primary)] text-white font-semibold text-sm hover:opacity-90 transition shadow-md"
          >
            Show {totalProducts !== undefined ? `${totalProducts} Products` : "Results"}
          </button>
        </div>
      )}
    </div>
  );
}
