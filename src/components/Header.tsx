"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Search, User, Heart, ShoppingBag, Loader, ChevronRight, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCart } from "@/app/context/CartContext";
import { FaFacebookF, FaInstagram, FaYoutube, FaTiktok } from "react-icons/fa";
import { getAllProducts } from "@/lib/services/front-end/productService";
import ProductCard from "./ProductCard";
import { fbEvent } from "@/components/analytics/FacebookPixel";
import { gaEvent } from "@/components/analytics/GoogleAnalytics";

// Dynamically split heavy interactive drawers & modals off the critical initial bundle
const ProfileDrawer = dynamic(() => import("@/components/ProfileDrawer"), { ssr: false });
const CartDrawer = dynamic(() => import("@/components/CartDrawer"), { ssr: false });
const MobileMenuDrawer = dynamic(() => import("./MobileMenuDrawer"), { ssr: false });
const AdvancedSearchModal = dynamic(() => import("@/components/search/AdvancedSearchModal"), { ssr: false });

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Subcategory {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string;
  subcategories: Subcategory[];
}

interface Submenu {
  id: number;
  name: string;
  slug: string;
  categories: Category[];
}

interface BannerItem {
  image: string;
  title: string;
  link: string;
}

interface MenuDropdown {
  submenus: Submenu[];
  banners: BannerItem[];
}

interface MenuItem {
  id: number;
  name: string;
  slug: string;
  type: string;
  dropdown: MenuDropdown;
}

// Client-side in-memory cache to prevent redundant network fetches across navigations
let clientMenuMemoryCache: { data: MenuItem[]; headerText?: string; timestamp: number } | null = null;
const CLIENT_MENU_CACHE_TTL_MS = 60 * 1000;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const { data: session } = useSession();
  const { cartCount, isCartDrawerOpen, openCartDrawer, closeCartDrawer } = useCart();

  // Navigation State
  const [menus, setMenus] = useState<MenuItem[]>(() => clientMenuMemoryCache?.data || []);
  const [activeMenu, setActiveMenu] = useState<MenuItem | null>(null);
  const [selectedSubmenuTab, setSelectedSubmenuTab] = useState<number | "all">("all");
  const [hoveredCategory, setHoveredCategory] = useState<Category | null>(null);

  // UI State
  const [toolbarText, setToolbarText] = useState<string>(() => clientMenuMemoryCache?.headerText || "");
  const [hovered, setHovered] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileDrawer, setProfileDrawer] = useState(false);

  // Search State
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [productsData, setProductsData] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Refs for hover timing
  const hoverOpenRef = useRef<NodeJS.Timeout | null>(null);
  const hoverCloseRef = useRef<NodeJS.Timeout | null>(null);

  // Menu Navigation Helpers
  const getMenuLink = useCallback((menu: MenuItem) => {
    if (menu.type === "blog") return "/blogs/journal";
    if (menu.type === "product") return `/shop/${menu.slug}`;
    return "/";
  }, []);

  const getSubmenuLink = useCallback((menu: MenuItem, link: any) => {
    if (menu.type === "blog") return `/blogs/journal/${link.slug}`;
    return `/shop/${link.slug}`;
  }, []);

  const closeAllMenus = useCallback(() => {
    if (hoverOpenRef.current) clearTimeout(hoverOpenRef.current);
    if (hoverCloseRef.current) clearTimeout(hoverCloseRef.current);

    setActiveMenu(null);
    setSelectedSubmenuTab("all");
    setHoveredCategory(null);
  }, []);

  const handleMenuHover = (menu: MenuItem) => {
    if (hoverCloseRef.current) clearTimeout(hoverCloseRef.current);
    if (hoverOpenRef.current) clearTimeout(hoverOpenRef.current);

    // Intent delay (40ms) for snappy, flicker-free opening
    hoverOpenRef.current = setTimeout(() => {
      setActiveMenu(menu);
      setSelectedSubmenuTab("all");
      setHoveredCategory(null);
    }, 40);
  };

  const cancelClose = useCallback(() => {
    if (hoverCloseRef.current) clearTimeout(hoverCloseRef.current);
  }, []);

  const scheduleClose = useCallback(() => {
    if (hoverOpenRef.current) clearTimeout(hoverOpenRef.current);
    if (hoverCloseRef.current) clearTimeout(hoverCloseRef.current);

    // 160ms grace period so mouse can glide between header and dropdown smoothly
    hoverCloseRef.current = setTimeout(() => {
      closeAllMenus();
    }, 160);
  }, [closeAllMenus]);

  // Aggregate categories for instant Mega-Grid display
  const displayedCategories = useMemo(() => {
    if (!activeMenu?.dropdown?.submenus) return [];
    if (selectedSubmenuTab === "all") {
      const allCats: Category[] = [];
      for (const sub of activeMenu.dropdown.submenus) {
        if (Array.isArray(sub.categories)) {
          for (const cat of sub.categories) {
            if (!allCats.some((c) => c.id === cat.id)) {
              allCats.push(cat);
            }
          }
        }
      }
      return allCats;
    }
    const foundSub = activeMenu.dropdown.submenus.find((s) => s.id === selectedSubmenuTab);
    return foundSub?.categories || [];
  }, [activeMenu, selectedSubmenuTab]);

  // Selected submenu information for active tab
  const selectedSubmenu = useMemo(() => {
    if (selectedSubmenuTab === "all" || !activeMenu?.dropdown?.submenus) return null;
    return activeMenu.dropdown.submenus.find((s) => s.id === selectedSubmenuTab) || null;
  }, [activeMenu, selectedSubmenuTab]);

  // Active category for the live frosted preview card (defaults to first category with an image)
  const activeCategoryPreview = useMemo(() => {
    if (hoveredCategory) return hoveredCategory;
    return displayedCategories.find((c) => c.image) || displayedCategories[0] || null;
  }, [hoveredCategory, displayedCategories]);





  // Fetch menu data with client-side cache
  const fetchMenus = useCallback(async () => {
    const now = Date.now();
    if (clientMenuMemoryCache && now - clientMenuMemoryCache.timestamp < CLIENT_MENU_CACHE_TTL_MS) {
      setMenus(clientMenuMemoryCache.data);
      if (clientMenuMemoryCache.headerText) setToolbarText(clientMenuMemoryCache.headerText);
      return;
    }
    try {
      const res = await fetch("/api/header");
      const data = await res.json();
      if (data.success) {
        clientMenuMemoryCache = {
          data: data.data,
          headerText: data.headerText || "",
          timestamp: Date.now(),
        };
        setMenus(data.data);
        if (data.headerText) setToolbarText(data.headerText);
      }
    } catch (err) {
      console.error("Failed to load menus:", err);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
    setMounted(true);
  }, [fetchMenus]);

  // Handle Escape key to close menus
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAllMenus();
        setSearchMode(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [closeAllMenus]);


  // Scroll handler with RequestAnimationFrame
  useEffect(() => {
    let animationFrameId: number;
    const handleScroll = () => {
      animationFrameId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
      });
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Search Debounce (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 20);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Search API Call
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setProductsData(null);
      setSearchLoading(false);
      return;
    }
    const fetchSearch = async () => {
      setSearchLoading(true);
      try {
        const res = await getAllProducts(debouncedQuery, true);
        setProductsData(res);

        // Tracking
        if (res?.products?.length > 0) {
          fbEvent("Search", { search_string: debouncedQuery });
          gaEvent("search", "Search", debouncedQuery);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearchLoading(false);
      }
    };
    fetchSearch();
  }, [debouncedQuery]);

  // Body scroll lock
  useEffect(() => {
    if (searchMode || isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchMode, isMobileMenuOpen]);






  // Header styles based on state
  const headerBaseClass = "fixed top-0 left-0 w-full z-[100] transition-all duration-300";
  const headerBgClass = isHomePage
    ? scrolled
      ? "bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20"
      : hovered || activeMenu
        ? "bg-white/40 backdrop-blur-2xl shadow-sm border-b border-white/10"
        : "bg-transparent"
    : "bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-100";

  const textColorClass = isHomePage && !scrolled && !hovered && !activeMenu && !searchMode
    ? "text-white"
    : "text-[var(--text-primary)]";

  return (
    <>
      <header
        className={`${headerBaseClass} ${headerBgClass}`}
        onMouseEnter={() => {
          setHovered(true);
          cancelClose();
        }}
        onMouseLeave={() => {
          setHovered(false);
          scheduleClose();
        }}
      >
        {/* TOP BAR */}
        <div
          className={`bg-[var(--brand-primary)] text-white text-[11px] py-1.5 tracking-[0.1em] transition-all duration-300 overflow-hidden ${scrolled ? "h-0 opacity-0" : "h-auto opacity-100"
            }`}
        >
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between uppercase font-bold gap-4">
            {/* Smooth Continuous Marquee on a single line — single message copy */}
            <div className="flex-1 overflow-hidden relative select-none [container-type:inline-size]">
              <div className="animate-announcement-marquee inline-block whitespace-nowrap">
                <span suppressHydrationWarning className="inline-block">
                  {toolbarText || "Free UK shipping over £60 | Free international over £120"}
                </span>
              </div>
            </div>

            {/* Social Icons */}
            <div className="hidden sm:flex gap-4 items-center shrink-0 z-10 pl-2">
              <Link href="https://instagram.com/gazaarabia" target="_blank" rel="noopener noreferrer"><FaInstagram /></Link>
              <Link href="https://facebook.com/gazaarabia" target="_blank" rel="noopener noreferrer"><FaFacebookF /></Link>
              <Link href="https://tiktok.com/@gazaarabia" target="_blank" rel="noopener noreferrer"><FaTiktok /></Link>
              <Link href="https://www.youtube.com/@GazaArabia_Official" target="_blank" rel="noopener noreferrer"><FaYoutube /></Link>
            </div>
          </div>
        </div>

        {/* MAIN HEADER */}
        <div className="relative h-[70px] lg:h-[80px]">
          <div className="max-w-[1600px] mx-auto h-full flex items-center justify-between px-4 lg:px-10">
            {/* Left: Mobile Menu + Search */}
            <div className={`flex items-center gap-4 lg:hidden ${textColorClass}`}>
              <button onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24} />
              </button>
              <button onClick={() => setSearchMode(true)}>
                <Search size={22} />
              </button>
            </div>

            {/* Logo */}
            <div className="flex items-center h-full">
              <Link href="/" className="relative w-32 lg:w-48 h-12 flex items-center justify-center">
                <Image
                  src={textColorClass === "text-white" ? "/images/logo.png" : "/images/logo-dark.png"}
                  alt="Gazaarabia"
                  fill
                  priority
                  sizes="(max-width: 768px) 128px, 192px"
                  className="object-contain"
                />
              </Link>
            </div>

            {/* Desktop Nav - Centered */}
            <nav className={`hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center h-full gap-8 text-[13px] font-bold tracking-widest uppercase ${textColorClass}`}>
              {menus.map((item) => (
                <div
                  key={item.id}
                  className="h-full flex items-center relative group"
                  onMouseEnter={() => handleMenuHover(item)}
                >
                  <Link
                    href={getMenuLink(item)}
                    className={`hover:text-[var(--brand-primary)] transition-colors relative py-2 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[var(--brand-primary)] after:transition-all hover:after:w-full ${activeMenu?.id === item.id ? "text-[var(--brand-primary)] after:w-full" : ""}`}
                  >
                    {item.name}
                  </Link>
                </div>
              ))}
              <Link href="/become-partner" className="hover:text-[var(--brand-primary)] transition-colors">Ambassador</Link>
            </nav>

            {/* Right: Search, Account, Wishlist, Cart */}
            <div className={`flex items-center gap-2 lg:gap-5 ${textColorClass}`}>
              <button onClick={() => setSearchMode(true)} className="hidden lg:flex p-2 hover:bg-black/5 rounded-full transition">
                <Search size={20} />
              </button>
              <button onClick={() => setProfileDrawer(true)} className="p-2 hover:bg-black/5 rounded-full transition">
                <User size={22} />
              </button>
              <button onClick={() => router.push("/wishlist")} className="hidden lg:flex p-2 hover:bg-black/5 rounded-full transition">
                <Heart size={20} />
              </button>
              <button onClick={() => openCartDrawer()} className="relative p-2 hover:bg-black/5 rounded-full transition">
                <ShoppingBag size={22} />
                {mounted && cartCount > 0 && (
                  <span suppressHydrationWarning className="absolute top-1 right-1 bg-[var(--brand-primary)] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* MODERN MEGA MENU: Frosted Glass & Dynamic Authentic Preview (Zara / Net-A-Porter Style) */}
          <div
            className={`absolute top-full left-0 w-full bg-[#fbfaf8]/90 backdrop-blur-2xl border-b border-white/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.07),0_10px_20px_-5px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out z-50 will-change-transform ${
              activeMenu && (displayedCategories.length > 0 || (activeMenu.dropdown?.banners && activeMenu.dropdown.banners.length > 0) || activeMenu.type === "blog" || (activeMenu.dropdown?.submenus && activeMenu.dropdown.submenus.length > 0))
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {activeMenu && (
              <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-7">
                {/* 1. Header Bar inside Mega Menu: Department Title + Submenu Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200/50 mb-6">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)]"></span>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-900">
                      {activeMenu.name} COLLECTION
                    </h3>
                  </div>

                  {/* Submenu Filter Pills (Frosted Glass Buttons) */}
                  {activeMenu.dropdown?.submenus?.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubmenuTab("all");
                          setHoveredCategory(null);
                        }}
                        onMouseEnter={() => {
                          setSelectedSubmenuTab("all");
                          setHoveredCategory(null);
                        }}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                          selectedSubmenuTab === "all"
                            ? "bg-[var(--text-primary)] text-white shadow-xs backdrop-blur-md"
                            : "bg-white/70 text-gray-700 hover:bg-white hover:text-black border border-white/80 shadow-xs backdrop-blur-md"
                        }`}
                      >
                        All Collections
                      </button>
                      {activeMenu.dropdown.submenus.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setSelectedSubmenuTab(sub.id);
                            setHoveredCategory(null);
                          }}
                          onMouseEnter={() => {
                            setSelectedSubmenuTab(sub.id);
                            setHoveredCategory(null);
                          }}
                          className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                            selectedSubmenuTab === sub.id
                              ? "bg-[var(--text-primary)] text-white shadow-xs backdrop-blur-md"
                              : "bg-white/70 text-gray-700 hover:bg-white hover:text-black border border-white/80 shadow-xs backdrop-blur-md"
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick Link to View All */}
                  <Link
                    href={getMenuLink(activeMenu)}
                    onClick={closeAllMenus}
                    className="text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1 group"
                  >
                    <span>View All {activeMenu.name}</span>
                    <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* 2. Main Content Grid */}
                {activeMenu.type === "blog" ? (
                  /* Blog Specialized Grid - 100% Real Database Categories from MongoDB */
                  <div className="py-2">
                    <div className="flex items-center justify-between pb-3 mb-4">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                        Editorial Topics ({displayedCategories.length})
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {displayedCategories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/blogs/journal/${cat.slug}`}
                          onClick={closeAllMenus}
                          className="p-3.5 rounded-xl bg-white/70 hover:bg-white border border-white/80 shadow-xs hover:shadow-md transition-all duration-200 group flex items-center justify-between"
                        >
                          <span className="text-xs font-bold text-gray-800 group-hover:text-[var(--brand-primary)] transition-colors line-clamp-1">
                            {cat.name}
                          </span>
                          <ChevronRight size={14} className="text-gray-400 group-hover:text-[var(--brand-primary)] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Standard Product Mega Grid: Real MongoDB Data + Frosted Glass + Dynamic Photo Preview */
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Category Columns (takes 8 or 9 cols) */}
                    <div className="lg:col-span-8 xl:col-span-9">
                      {displayedCategories.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                          {displayedCategories.map((cat) => {
                            const isSelected = activeCategoryPreview?.id === cat.id;
                            return (
                              <div
                                key={cat.id}
                                onMouseEnter={() => setHoveredCategory(cat)}
                                className={`space-y-2.5 p-3 rounded-xl transition-all duration-150 ${
                                  isSelected ? "bg-white/80 shadow-xs ring-1 ring-black/5" : "hover:bg-white/50"
                                }`}
                              >
                                <Link
                                  href={`/shop/${cat.slug}`}
                                  onClick={closeAllMenus}
                                  className="text-xs font-black uppercase tracking-[0.15em] text-gray-900 hover:text-[var(--brand-primary)] flex items-center justify-between group transition-colors pb-1.5 border-b border-gray-200/60"
                                >
                                  <span>{cat.name}</span>
                                  <ChevronRight
                                    size={13}
                                    className={`transition-all ${
                                      isSelected
                                        ? "text-[var(--brand-primary)] translate-x-0.5"
                                        : "text-gray-400 group-hover:text-[var(--brand-primary)] group-hover:translate-x-0.5"
                                    }`}
                                  />
                                </Link>

                                <ul className="space-y-1.5 text-[13px] text-gray-600">
                                  {cat.subcategories && cat.subcategories.length > 0 ? (
                                    cat.subcategories.slice(0, 5).map((subcat) => (
                                      <li key={subcat.id}>
                                        <Link
                                          href={`/shop/${subcat.slug}`}
                                          onClick={closeAllMenus}
                                          className="hover:text-[var(--brand-primary)] hover:translate-x-1 inline-block transition-transform duration-150 font-medium"
                                        >
                                          {subcat.name}
                                        </Link>
                                      </li>
                                    ))
                                  ) : (
                                    <li>
                                      <Link
                                        href={`/shop/${cat.slug}`}
                                        onClick={closeAllMenus}
                                        className="text-gray-400 hover:text-gray-700 italic text-xs"
                                      >
                                        Explore collection
                                      </Link>
                                    </li>
                                  )}

                                  {cat.subcategories && cat.subcategories.length > 5 && (
                                    <li className="pt-1">
                                      <Link
                                        href={`/shop/${cat.slug}`}
                                        onClick={closeAllMenus}
                                        className="text-[11px] font-bold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-0.5"
                                      >
                                        View all ({cat.subcategories.length}) →
                                      </Link>
                                    </li>
                                  )}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-12 px-6 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 text-center shadow-xs">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-600">
                            Explore all products in {selectedSubmenu?.name || activeMenu.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                            Discover our curated collection tailored for {activeMenu.name.toLowerCase()} modest fashion.
                          </p>
                          <div className="mt-4">
                            <Link
                              href={selectedSubmenu?.slug ? `/shop/${selectedSubmenu.slug}` : getMenuLink(activeMenu)}
                              onClick={closeAllMenus}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 shadow-xs transition-opacity"
                            >
                              <span>Browse {selectedSubmenu?.name || activeMenu.name}</span>
                              <ArrowRight size={13} />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Live Frosted Category Preview (100% Real Image from MongoDB, NO AI SLOP) */}
                    <div className="lg:col-span-4 xl:col-span-3 hidden lg:block sticky top-0">
                      {activeCategoryPreview ? (
                        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/90 shadow-[0_15px_35px_rgba(0,0,0,0.06)] transition-all duration-300">
                          <div className="relative aspect-[3/4] rounded-xl overflow-hidden group bg-stone-100 shadow-xs">
                            {activeCategoryPreview.image ? (
                              <Image
                                src={activeCategoryPreview.image}
                                alt={activeCategoryPreview.name}
                                fill
                                sizes="(max-width: 1280px) 300px, 350px"
                                className="object-cover group-hover:scale-105 transition-transform duration-700"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-stone-200 text-stone-500 p-4 text-center">
                                <span className="text-xs font-black uppercase tracking-widest">{activeCategoryPreview.name}</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-5">
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                                {activeMenu.name} • {selectedSubmenu?.name || "Collection"}
                              </span>
                              <h4 className="text-base font-black uppercase tracking-wider text-white mt-1">
                                {activeCategoryPreview.name}
                              </h4>
                              <Link
                                href={`/shop/${activeCategoryPreview.slug}`}
                                onClick={closeAllMenus}
                                className="mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white/95 hover:bg-white text-gray-900 text-[11px] font-black uppercase tracking-widest shadow-md transition-all group-hover:bg-[var(--brand-primary)] group-hover:text-white"
                              >
                                <span>Explore {activeCategoryPreview.name}</span>
                                <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                              </Link>
                            </div>
                          </div>

                          {activeCategoryPreview.subcategories && activeCategoryPreview.subcategories.length > 0 && (
                            <div className="mt-3.5 pt-3 border-t border-gray-100">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">
                                Featured Sub-categories
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {activeCategoryPreview.subcategories.slice(0, 4).map((sub) => (
                                  <Link
                                    key={sub.id}
                                    href={`/shop/${sub.slug}`}
                                    onClick={closeAllMenus}
                                    className="px-2.5 py-1 rounded-md bg-stone-100/90 hover:bg-[var(--brand-primary)] hover:text-white text-[11px] font-semibold text-stone-700 transition-colors"
                                  >
                                    {sub.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : activeMenu.dropdown?.banners?.length > 0 ? (
                        <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/90 shadow-[0_15px_35px_rgba(0,0,0,0.06)]">
                          <Link
                            href={activeMenu.dropdown.banners[0].link || getMenuLink(activeMenu)}
                            onClick={closeAllMenus}
                            className="relative block aspect-[3/4] rounded-xl overflow-hidden group shadow-xs"
                          >
                            <Image
                              src={activeMenu.dropdown.banners[0].image}
                              alt={activeMenu.dropdown.banners[0].title || activeMenu.name}
                              fill
                              sizes="(max-width: 1280px) 300px, 350px"
                              className="object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-5">
                              <span className="text-white text-sm font-black uppercase tracking-wider">
                                {activeMenu.dropdown.banners[0].title || `${activeMenu.name} Collection`}
                              </span>
                              <span className="text-white/90 text-[11px] uppercase font-bold tracking-widest mt-2 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                Explore Collection <ArrowRight size={12} />
                              </span>
                            </div>
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MENU BACKDROP */}
      {activeMenu && (
        <div
          onClick={closeAllMenus}
          className="fixed inset-0 top-[70px] lg:top-[80px] bg-black/20 backdrop-blur-[2px] z-[40] transition-opacity duration-200 animate-in fade-in"
        />
      )}

      {/* CLIENT-ONLY MODALS & DRAWERS (Guarded by mounted to prevent SSR & extension DOM injection hydration mismatch) */}
      {mounted && (
        <>
          {/* ADVANCED FULL-WIDTH SEARCH MODAL */}
          {searchMode && (
            <AdvancedSearchModal
              isOpen={searchMode}
              onClose={() => setSearchMode(false)}
            />
          )}

          {/* Mobile Menu Drawer */}
          <MobileMenuDrawer
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            menus={menus}
            getMenuLink={getMenuLink}
            getSubmenuLink={getSubmenuLink}
          />

          {/* Other Drawers */}
          <ProfileDrawer isOpen={profileDrawer} onClose={() => setProfileDrawer(false)} />
          <CartDrawer isOpen={isCartDrawerOpen} onClose={() => closeCartDrawer()} />
        </>
      )}
    </>
  );
}