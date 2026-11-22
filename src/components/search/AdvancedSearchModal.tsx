"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  X,
  ArrowRight,
  Clock,
  Shirt,
  Flame,
  PackageOpen,
} from "lucide-react";
import { formatGBP } from "@/lib/utils/shipping";

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedSearchModal({
  isOpen,
  onClose,
}: AdvancedSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any>({
    products: [],
    categories: [],
    subcategories: [],
    popularStyles: [],
    popularTags: [],
  });

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Focus input on open & load recent searches
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
      try {
        const stored = localStorage.getItem("gaza_recent_searches");
        if (stored) {
          setRecentSearches(JSON.parse(stored).slice(0, 6));
        }
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    } else {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when search modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Debounce query (180ms for instant feel)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch Suggestions
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/front-end/search/suggestions?q=${encodeURIComponent(debouncedQuery)}`
        );
        const json = await res.json();
        if (isMounted && json.success) {
          setSuggestions(json.data);
        }
      } catch (err) {
        console.error("Suggestions fetch error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const existing = recentSearches.filter(
        (s) => s.toLowerCase() !== trimmed.toLowerCase()
      );
      const updated = [trimmed, ...existing].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem("gaza_recent_searches", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save recent search:", e);
    }
  };

  const removeRecentSearch = (e: React.MouseEvent, termToRemove: string) => {
    e.stopPropagation();
    const updated = recentSearches.filter((s) => s !== termToRemove);
    setRecentSearches(updated);
    try {
      localStorage.setItem("gaza_recent_searches", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem("gaza_recent_searches");
    } catch (e) {
      console.error("Failed to remove recent searches:", e);
    }
  };

  const handleSearchSubmit = (searchTerm?: string) => {
    const target = searchTerm || query;
    if (!target.trim()) return;
    saveRecentSearch(target);
    onClose();
    router.push(`/search?q=${encodeURIComponent(target.trim())}`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md transition-all animate-[fadeIn_0.2s_ease-out] flex flex-col justify-start"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search Gazaarabia"
    >
      <div className="bg-white w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden rounded-b-3xl border-b border-gray-200">
        {/* CLEAN MINIMAL SEARCH BAR (NO SQUARE BORDER, NO SQUARE FOCUS OUTLINE) */}
        <div className="max-w-[1400px] mx-auto w-full px-4 lg:px-8 py-3.5 sm:py-4 flex items-center gap-3 sm:gap-4 border-b border-gray-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit();
            }}
            className="flex-1 relative flex items-center bg-gray-50 hover:bg-gray-100/60 focus-within:bg-white rounded-full border border-gray-200/80 focus-within:border-gray-300 px-4 py-2.5 transition-all"
          >
            <Search
              size={18}
              className="text-gray-400 mr-3 shrink-0 pointer-events-none"
            />
            {/* Input with strict inline outline: none to eliminate any browser focus square */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, category, fabric, or style..."
              className="w-full text-sm sm:text-base font-normal text-gray-900 placeholder:text-gray-400 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!outline-none focus:!ring-0 focus:!shadow-none focus:!border-none"
              style={{
                outline: "none",
                outlineWidth: 0,
                boxShadow: "none",
                border: "none",
                WebkitAppearance: "none",
              }}
            />

            {/* Clear Input Button */}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear input"
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition shrink-0 ml-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </form>

          {/* Clean Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-2 sm:p-2.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-black transition shrink-0 cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {/* RESULTS AND SUGGESTIONS BODY (CLEAN UNIFIED WHITE CANVAS, NO SQUARES) */}
        <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-6 lg:p-10 bg-white">
          <div className="max-w-[1400px] mx-auto">
            {debouncedQuery.length >= 2 ? (
              /* REAL-TIME MATCHED RESULTS VIEW */
              <div className="space-y-8">
                {/* Header with View All CTA */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Matches for &ldquo;{debouncedQuery}&rdquo; ({suggestions.products?.length || 0})
                  </span>

                  {suggestions.products?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>View All Matching Products</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  {/* Left Column: Quick Filter Links (Categories & Subcategories) */}
                  {(suggestions.categories?.length > 0 || suggestions.subcategories?.length > 0) && (
                    <div className="w-full lg:w-72 shrink-0 space-y-6">
                      {suggestions.categories?.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2.5">
                            Categories
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {suggestions.categories.map((cat: any) => (
                              <Link
                                key={`cat-${cat.id}`}
                                href={`/shop/${cat.slug}`}
                                onClick={() => {
                                  saveRecentSearch(cat.name);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-black hover:text-white border border-gray-200 text-xs font-semibold uppercase tracking-wider transition"
                              >
                                <span>{cat.name}</span>
                                <ArrowRight size={12} />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {suggestions.subcategories?.length > 0 && (
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2.5">
                            Styles & Sub-Types
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {suggestions.subcategories.map((sub: any) => (
                              <Link
                                key={`sub-${sub.id}`}
                                href={`/shop/${sub.slug}`}
                                onClick={() => {
                                  saveRecentSearch(sub.name);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-black border border-gray-200 text-xs font-medium uppercase tracking-wider transition"
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Right Column: Matching Products Grid */}
                  <div className="flex-1 min-w-0">
                    {suggestions.products?.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {suggestions.products.map((product: any) => (
                          <Link
                            key={product.id}
                            href={`/products/${product.slug}`}
                            onClick={() => {
                              saveRecentSearch(product.title);
                              onClose();
                            }}
                            className="group flex flex-col rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-md transition bg-white p-3"
                          >
                            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-gray-50 mb-2.5">
                              <Image
                                src={product.imageUrl || "/images/placeholder.png"}
                                alt={product.title}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e: any) => {
                                  if (
                                    e?.currentTarget &&
                                    e.currentTarget.src !== "/images/placeholder.png"
                                  ) {
                                    e.currentTarget.src = "/images/placeholder.png";
                                  }
                                }}
                              />
                              {!product.inStock && (
                                <span className="absolute bottom-2 left-2 bg-black/80 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase">
                                  Out of Stock
                                </span>
                              )}
                              {product.discountPrice &&
                                Number(product.discountPrice) < Number(product.sellingPrice) && (
                                  <span className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                    -
                                    {Math.round(
                                      ((Number(product.sellingPrice) -
                                        Number(product.discountPrice)) /
                                        Number(product.sellingPrice)) *
                                        100
                                    )}
                                    %
                                  </span>
                                )}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider truncate">
                              {product.categoryName || "Collection"}
                            </span>
                            <h4 className="text-xs font-semibold text-gray-900 group-hover:text-[var(--brand-primary)] transition line-clamp-1 mt-0.5">
                              {product.title}
                            </h4>
                            <div className="mt-1.5 flex items-baseline gap-1.5 text-xs font-bold text-[var(--brand-primary)]">
                              <span>
                                {formatGBP(product.discountPrice || product.sellingPrice)}
                              </span>
                              {product.discountPrice && (
                                <span className="text-[10px] text-gray-400 line-through font-normal">
                                  {formatGBP(product.sellingPrice)}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      /* Clean No-Match Empty State */
                      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-gray-50/50 rounded-3xl border border-gray-100">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                          <PackageOpen size={30} />
                        </div>
                        <h4 className="text-base font-bold uppercase tracking-wider text-gray-800 mb-1">
                          No Results For &ldquo;{debouncedQuery}&rdquo;
                        </h4>
                        <p className="text-xs text-gray-500 max-w-sm mb-4 leading-relaxed">
                          We couldn&apos;t find an exact match. Try checking the spelling or browse our trending collections.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("");
                            inputRef.current?.focus();
                          }}
                          className="px-5 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition shadow-sm cursor-pointer"
                        >
                          Clear Search
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* DEFAULT DISCOVERY VIEW: RECENT + POPULAR + TRENDING COLLECTIONS + BEST SELLERS */
              <div className="space-y-10">
                {/* 3 DISCOVERY COLUMNS (CLEAN, NO ENCLOSING SQUARES) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* 1. Recent Searches */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400" />
                        Recent Searches
                      </span>
                      {recentSearches.length > 0 && (
                        <button
                          type="button"
                          onClick={clearRecentSearches}
                          className="text-[11px] text-gray-400 hover:text-[var(--brand-primary)] font-semibold transition cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    {recentSearches.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {recentSearches.map((term, i) => (
                          <span
                            key={i}
                            onClick={() => {
                              setQuery(term);
                              handleSearchSubmit(term);
                            }}
                            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200/80 hover:border-gray-300 text-xs font-medium text-gray-800 cursor-pointer transition shadow-2xs hover:shadow-xs"
                          >
                            <span>{term}</span>
                            <button
                              type="button"
                              onClick={(e) => removeRecentSearch(e, term)}
                              aria-label={`Remove ${term}`}
                              className="text-gray-400 hover:text-red-500 p-0.5 rounded-full hover:bg-white transition cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No recent searches yet.</p>
                    )}
                  </div>

                  {/* 2. Popular Styles */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
                      <Shirt size={14} className="text-stone-600" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Popular Styles
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(suggestions.popularStyles?.length > 0
                        ? suggestions.popularStyles
                        : [
                            { name: "Classic White Thobes", slug: "classic-white-thobes" },
                            { name: "Embroidered Abayas", slug: "embroidered-abayas" },
                            { name: "Emirati & Omani Thobes", slug: "emirati-omani-thobes" },
                            { name: "Everyday Modest Abayas", slug: "everyday-modest-abayas" },
                            { name: "Hooded Djellabas", slug: "hooded-djellabas" },
                            { name: "Modern Streetwear Jubbahs", slug: "streetwear-jubbahs" },
                            { name: "Moroccan Kaftans", slug: "moroccan-kaftans" },
                            { name: "Occasion & Luxury Abayas", slug: "occasion-luxury-abayas" },
                          ]
                      ).map((style: any) => (
                        <button
                          key={style.slug || style.name}
                          type="button"
                          onClick={() => {
                            setQuery(style.name);
                            handleSearchSubmit(style.name);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 text-xs font-medium text-gray-700 hover:text-black transition shadow-2xs cursor-pointer"
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Trending Collections */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
                      <Flame size={14} className="text-[var(--brand-primary)]" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Trending Collections
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(suggestions.categories?.length > 0
                        ? suggestions.categories
                        : [
                            { name: "ABAYAS", slug: "abayas" },
                            { name: "DJELLABAS", slug: "djellabas" },
                            { name: "GIFTS & HERITAGE", slug: "gifts" },
                            { name: "HIJABS & SCARVES", slug: "hijab" },
                            { name: "HOODIES & SWEATSHIRTS", slug: "hoodies-sweatshirts" },
                            { name: "JELLABAS & JUBBAS", slug: "jellabas-jubbas" },
                            { name: "KAFTANS", slug: "kaftans" },
                            { name: "MEN'S ACTIVEWEAR & JERSEYS", slug: "modest-activewear-m" },
                          ]
                      ).map((cat: any) => (
                        <Link
                          key={cat.slug}
                          href={`/shop/${cat.slug}`}
                          onClick={onClose}
                          className="px-3.5 py-1.5 rounded-xl bg-gray-50 hover:bg-black border border-gray-200/80 hover:border-black text-xs font-semibold uppercase tracking-wider text-gray-800 hover:text-white transition shadow-2xs"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
