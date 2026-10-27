"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import ProductCard from "@/components/ProductCard";
import CategoryHeader from "@/components/CategoryHeader";
import Pagination from "@/components/Pagination";
import { shopService } from "@/lib/services/front-end/shopServices";
import { wishlistService } from "@/lib/services/front-end/wishlistService";
import ProductFilterSidebar from "@/components/shop/ProductFilterSidebar";
import ActiveFilterPills, { FilterState } from "@/components/shop/ActiveFilterPills";
import ProductGridSkeleton from "@/components/shop/ProductGridSkeleton";
import {
  ArrowUpDown,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Search,
  RotateCcw,
  PackageOpen,
  X,
} from "lucide-react";

export default function CategoryContent() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "all";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const token = session?.user?.token || null;

  const [products, setProducts] = useState<any[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [parentCategory, setParentCategory] = useState<any>(null);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Layout View Mode: Grid View (4 squares) vs List View (horizontal rows)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Mobile Filter Drawer State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Filter Metadata from DB
  const [filterMeta, setFilterMeta] = useState<{
    colors: any[];
    sizes: any[];
    categories: any[];
    subcategories: any[];
  }>({
    colors: [],
    sizes: [],
    categories: [],
    subcategories: [],
  });

  // Current Page & Sort from URL
  const [currentPage, setCurrentPage] = useState<number>(
    Number(searchParams.get("page")) || 1
  );
  const [sort, setSort] = useState<string>(searchParams.get("sort") || "new");

  // Dynamic Multi-Criteria Filters from URL
  const [filters, setFilters] = useState<FilterState>({
    q: searchParams.get("q") || "",
    availability: searchParams.getAll("availability[]"),
    sizes: searchParams.getAll("sizes[]").map(Number).filter(Boolean),
    colors: searchParams.getAll("colors[]").map(Number).filter(Boolean),
    categories: searchParams.getAll("categories[]").map(Number).filter(Boolean),
    subcategories: searchParams.getAll("subcategories[]").map(Number).filter(Boolean),
    priceMin: Number(searchParams.get("priceMin")) || 0,
    priceMax: Number(searchParams.get("priceMax")) || 1000,
    rating: Number(searchParams.get("rating")) || 0,
  });

  // Fetch dynamic filter options from API
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/front-end/product-filter-options");
        const json = await res.json();
        if (json.success) {
          setFilterMeta(json.data);
        }
      } catch (err) {
        console.error("Failed to load filter options:", err);
      }
    })();
  }, []);

  // Dynamically synchronize filters, page, and sort with URL searchParams (e.g. from modal search, navigation, back button)
  useEffect(() => {
    const qParam = searchParams.get("q") || "";
    const pageParam = Number(searchParams.get("page")) || 1;
    const sortParam = searchParams.get("sort") || "new";
    const availParam = searchParams.getAll("availability[]");
    const sizesParam = searchParams.getAll("sizes[]").map(Number).filter(Boolean);
    const colorsParam = searchParams.getAll("colors[]").map(Number).filter(Boolean);
    const catsParam = searchParams.getAll("categories[]").map(Number).filter(Boolean);
    const subcatsParam = searchParams.getAll("subcategories[]").map(Number).filter(Boolean);
    const priceMinParam = Number(searchParams.get("priceMin")) || 0;
    const priceMaxParam = Number(searchParams.get("priceMax")) || 1000;
    const ratingParam = Number(searchParams.get("rating")) || 0;

    setCurrentPage(pageParam);
    setSort(sortParam);
    setFilters({
      q: qParam,
      availability: availParam,
      sizes: sizesParam,
      colors: colorsParam,
      categories: catsParam,
      subcategories: subcatsParam,
      priceMin: priceMinParam,
      priceMax: priceMaxParam,
      rating: ratingParam,
    });
  }, [searchParams]);

  // Lock body scroll when mobile filter drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isMobileDrawerOpen]);

  // Synchronize state with URL query parameters
  const syncUrlWithState = useCallback(
    (newPage: number, newSort: string, newFilters: FilterState) => {
      const p = new URLSearchParams();
      if (newPage > 1) p.set("page", newPage.toString());
      if (newSort && newSort !== "new") p.set("sort", newSort);
      if (newFilters.q && newFilters.q.trim()) p.set("q", newFilters.q.trim());
      if (newFilters.rating && newFilters.rating > 0)
        p.set("rating", newFilters.rating.toString());

      newFilters.availability.forEach((v) => p.append("availability[]", v));
      newFilters.categories.forEach((c) => p.append("categories[]", c.toString()));
      newFilters.subcategories.forEach((sc) =>
        p.append("subcategories[]", sc.toString())
      );
      newFilters.sizes.forEach((s) => p.append("sizes[]", s.toString()));
      newFilters.colors.forEach((c) => p.append("colors[]", c.toString()));

      if (newFilters.priceMin > 0) p.set("priceMin", newFilters.priceMin.toString());
      if (newFilters.priceMax < 1000 && newFilters.priceMax > 0)
        p.set("priceMax", newFilters.priceMax.toString());

      const qs = p.toString();
      const targetUrl = qs ? `?${qs}` : window.location.pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [router]
  );

  // Fetch Products based on Active Filters
  const fetchProducts = async (
    activeFilters = filters,
    page = currentPage,
    currentSort = sort
  ) => {
    try {
      setLoading(true);
      const data: any = await shopService.getShopData(
        token || "",
        slug,
        page,
        16,
        {
          ...activeFilters,
          sort: currentSort,
        }
      );
      setProducts(data.products || []);
      setTotalProducts(data.total || data.products?.length || 0);
      setTotalPages(data.totalPages || 1);
      setParentCategory(data.parentCategory);
      setSubcategories(data.subcategories || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when dependencies change
  useEffect(() => {
    if (status !== "loading") {
      fetchProducts(filters, currentPage, sort);
    }
  }, [slug, currentPage, sort, filters, status, token]);

  // Wishlist Toggle
  const handleWishlistToggle = async (productId: number, isInWishlist: boolean) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, isInWishlist: !isInWishlist } : p
      )
    );

    if (token) {
      try {
        if (isInWishlist) {
          await wishlistService.remove(token, productId);
        } else {
          await wishlistService.add(token, productId);
        }
      } catch (error) {
        console.error("Wishlist update failed:", error);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, isInWishlist } : p
          )
        );
      }
    }
  };

  // Remove individual active filter
  const handleRemoveFilter = (type: keyof FilterState, value?: any) => {
    setFilters((prev) => {
      const updated = { ...prev };
      if (type === "q") updated.q = "";
      else if (type === "rating") updated.rating = 0;
      else if (type === "priceMin" || type === "priceMax") {
        updated.priceMin = 0;
        updated.priceMax = 1000;
      } else if (Array.isArray(updated[type])) {
        updated[type] = (updated[type] as any[]).filter((x) => x !== value);
      }
      syncUrlWithState(1, sort, updated);
      return updated;
    });
    setCurrentPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    const freshFilters: FilterState = {
      q: "",
      availability: [],
      sizes: [],
      colors: [],
      categories: [],
      subcategories: [],
      priceMin: 0,
      priceMax: 1000,
      rating: 0,
    };
    setFilters(freshFilters);
    setCurrentPage(1);
    syncUrlWithState(1, sort, freshFilters);
  };

  const activeFilterCount =
    (filters.q ? 1 : 0) +
    filters.availability.length +
    filters.categories.length +
    filters.subcategories.length +
    filters.sizes.length +
    filters.colors.length +
    (filters.rating ? 1 : 0) +
    (filters.priceMin > 0 || (filters.priceMax < 1000 && filters.priceMax > 0) ? 1 : 0);

  return (
    <section className="bg-[var(--background)] min-h-screen pb-16">
      {/* 1. CATEGORY HEADER & HERO TITLE */}
      <CategoryHeader
        selectedSlug={slug}
        title={slug === "all" ? "All Collections" : slug.replace(/-/g, " ")}
        description="Discover luxury modest attire and authentic heritage garments handcrafted with purposeful elegance."
        parentCategory={parentCategory}
        categories={subcategories}
        onCategoryChange={(cat) => router.push(`/shop/${cat}`)}
      />

      {/* 2. STICKY ACTION & SORT CONTROL BAR */}
      <div className="w-full bg-white/90 backdrop-blur-md border-y border-gray-200/80 sticky top-[70px] lg:top-[80px] z-30 shadow-sm transition-all">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-wider">
          {/* Left: Product Count & Mobile Filters Trigger */}
          <div className="flex items-center gap-3">
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold transition"
            >
              <SlidersHorizontal size={15} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-[var(--brand-primary)] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <span className="text-[var(--text-muted)] font-medium">
              Showing{" "}
              <strong className="text-[var(--text-primary)] font-semibold">
                {products.length}
              </strong>{" "}
              of {totalProducts} Products
            </span>
          </div>

          {/* Right: Grid Switcher & Sort Selector */}
          <div className="flex items-center gap-4">
            {/* View Switcher: Grid View vs List View */}
            <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid View"
                aria-label="Grid View"
                className={`p-1.5 rounded transition ${
                  viewMode === "grid"
                    ? "bg-white text-[var(--brand-primary)] shadow-sm font-bold"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List View"
                aria-label="List View"
                className={`p-1.5 rounded transition ${
                  viewMode === "list"
                    ? "bg-white text-[var(--brand-primary)] shadow-sm font-bold"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                <List size={16} />
              </button>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-gray-400 hidden sm:inline-block" />
              <label htmlFor="sort-select" className="text-gray-500 font-semibold hidden sm:inline-block">
                Sort:
              </label>
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => {
                  const newSort = e.target.value;
                  setSort(newSort);
                  setCurrentPage(1);
                  syncUrlWithState(1, newSort, filters);
                }}
                className="bg-transparent border border-gray-200 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-gray-800 outline-none hover:border-gray-400 focus:border-[var(--brand-primary)] transition cursor-pointer"
              >
                <option value="new">New Arrivals</option>
                <option value="bestseller">Best Selling</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Pills Bar */}
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 border-t border-gray-100">
          <ActiveFilterPills
            filters={filters}
            filterMeta={filterMeta}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleResetFilters}
            totalResults={totalProducts}
          />
        </div>
      </div>

      {/* 3. MAIN BODY: SIDEBAR + PRODUCT GRID */}
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-8">
        <div className="flex gap-8 items-start">
          {/* DESKTOP STICKY FILTER SIDEBAR (280px) */}
          <aside
            className={`hidden lg:block w-72 shrink-0 sticky ${
              activeFilterCount > 0
                ? "top-[185px] h-[calc(100vh-200px)] max-h-[calc(100vh-200px)]"
                : "top-[140px] h-[calc(100vh-155px)] max-h-[calc(100vh-155px)]"
            } self-start transition-[top] duration-200`}
          >
            <ProductFilterSidebar
              filters={filters}
              setFilters={setFilters}
              filterMeta={filterMeta}
              onReset={handleResetFilters}
              onApply={() => {
                setCurrentPage(1);
                syncUrlWithState(1, sort, filters);
              }}
              totalProducts={totalProducts}
            />
          </aside>

          {/* MAIN PRODUCT GRID & PAGINATION AREA */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <ProductGridSkeleton
                viewMode={viewMode}
                count={viewMode === "list" ? 6 : 8}
              />
            ) : products.length === 0 ? (
              /* MODERN LUXURY EMPTY STATE */
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-gray-200 shadow-sm max-w-xl mx-auto my-6">
                <div className="w-20 h-20 rounded-full bg-[var(--soft-gray)]/50 flex items-center justify-center text-gray-400 mb-4">
                  <PackageOpen size={40} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold uppercase tracking-wider text-gray-800 mb-2">
                  No Products Found
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
                  We couldn&apos;t find any items matching your selected criteria. Try
                  loosening your filters or searching for alternative styles.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--brand-primary)] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition shadow-md"
                >
                  <RotateCcw size={14} />
                  <span>Reset All Filters</span>
                </button>
              </div>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 w-full transition-all duration-300">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        viewMode="grid"
                        onWishlistToggle={handleWishlistToggle}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:gap-5 w-full transition-all duration-300">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        viewMode="list"
                        onWishlistToggle={handleWishlistToggle}
                      />
                    ))}
                  </div>
                )}

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <div className="mt-12 flex justify-center">
                    <Pagination
                      totalPages={totalPages}
                      currentPage={currentPage}
                      onPageChange={(page) => {
                        setCurrentPage(page);
                        syncUrlWithState(page, sort, filters);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* 4. MOBILE / TABLET OFF-CANVAS SLIDING FILTER DRAWER */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Sheet */}
          <div className="relative ml-auto w-full max-w-sm bg-white h-full shadow-2xl flex flex-col z-50 animate-[slideInRight_0.25s_ease-out] overscroll-contain">
            <div className="flex-1 min-h-0 h-full overflow-hidden flex flex-col">
              <ProductFilterSidebar
                filters={filters}
                setFilters={setFilters}
                filterMeta={filterMeta}
                onReset={handleResetFilters}
                onApply={() => {
                  setCurrentPage(1);
                  syncUrlWithState(1, sort, filters);
                }}
                isMobileDrawer={true}
                onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
                totalProducts={totalProducts}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
