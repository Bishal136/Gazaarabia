"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";

import { wishlistService } from "@/lib/services/front-end/wishlistService";
import { cartService } from "@/lib/services/front-end/cartService";
import { useCart } from "@/app/context/CartContext";
import SingleImgMultiColorProductCard, {
  Product,
  ProductVariantItem,
} from "./SingleImgMultiColorsProductCard";

interface ProductSuggestionsProps {
  wearWith?: any[];
  recentlyViewed?: Product[];
  hideHeader?: boolean;
}

export default function ProductSuggestions({
  wearWith = [],
  recentlyViewed,
  hideHeader = false,
}: ProductSuggestionsProps) {
  const [activeTab, setActiveTab] = useState<"wear" | "recent">("wear");
  const [recent, setRecent] = useState<Product[]>([]);
  const [dynamicRelated, setDynamicRelated] = useState<any[]>([]);
  const [wishlistOverrides, setWishlistOverrides] = useState<
    Record<number, boolean>
  >({});
  const [addingId, setAddingId] = useState<number | null>(null);

  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string | undefined;

  const { refreshCart, openCartDrawer } = useCart();
  const token = session?.user?.token || null;

  // Safe client-side read of recentlyViewed (runs strictly once on mount to avoid infinite render loops)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (Array.isArray(recentlyViewed) && recentlyViewed.length > 0) {
      setRecent(recentlyViewed);
      return;
    }

    try {
      const raw = localStorage.getItem("recentlyViewed");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecent(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load recently viewed from localStorage:", error);
    }
  }, []); // Empty dependency array prevents "Maximum update depth exceeded" error

  // Dynamic client fallback if wearWith is empty
  useEffect(() => {
    if ((!wearWith || wearWith.length === 0) && slug) {
      let isMounted = true;
      (async () => {
        try {
          const res = await fetch(`/api/front-end/product/${slug}/related`);
          if (res.ok) {
            const json = await res.json();
            if (isMounted && Array.isArray(json.data) && json.data.length > 0) {
              setDynamicRelated(json.data);
            }
          }
        } catch (err) {
          console.warn("Client fallback related products fetch error:", err);
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [wearWith, slug]);

  const wearWithProducts = useMemo(() => {
    if (Array.isArray(wearWith) && wearWith.length > 0) {
      return wearWith;
    }
    return dynamicRelated;
  }, [wearWith, dynamicRelated]);

  const tabs = [{ key: "wear", label: "Wear With" }] as const;

  const data = activeTab === "wear" ? wearWithProducts : recent;

  // Real Add to Bag implementation
  const handleAddToBag = async (
    product: Product,
    selectedVariant?: ProductVariantItem,
  ) => {
    try {
      setAddingId(product.id);
      const raw = product.rawProduct || {};
      const variants: any[] =
        raw.productvariant || raw.variants || product.variants || [];

      // Pick selected variant, or first in-stock variant, or fallback variant
      const targetVariant =
        selectedVariant ||
        variants.find((v: any) => (v.availableStock ?? v.stock ?? 0) > 0) ||
        variants[0] ||
        null;

      await cartService.add(
        token,
        product.id,
        1,
        targetVariant?.id,
        targetVariant?.colorId || targetVariant?.color?.id,
        targetVariant?.sizeId || targetVariant?.size?.id,
        raw,
        targetVariant,
      );

      // Refresh global cart context state and slide out cart drawer
      await refreshCart();
      openCartDrawer();
    } catch (err: any) {
      console.error("Error adding product to bag from suggestions:", err);
      alert(err.message || "Failed to add product to bag");
    } finally {
      setAddingId(null);
    }
  };

  // Wishlist toggle with optimistic UI updates
  const handleWishlistToggle = async (
    productId: number,
    currentState: boolean,
  ) => {
    const nextState = !currentState;
    setWishlistOverrides((prev) => ({ ...prev, [productId]: nextState }));

    if (token) {
      try {
        if (currentState) {
          await wishlistService.remove(token, productId);
        } else {
          await wishlistService.add(token, productId);
        }
      } catch (error) {
        console.error("Wishlist API failed:", error);
        // Revert on failure
        setWishlistOverrides((prev) => ({
          ...prev,
          [productId]: currentState,
        }));
      }
    }
  };

  return (
    <section
      className={`mx-auto relative overflow-hidden ${
        hideHeader ? "px-0 py-2 border-0" : "px-4 py-16 border-t"
      }`}
    >
      {/* Tabs Header */}
      {!hideHeader && (
        <div className="flex justify-center items-center gap-8 pb-2">
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`relative px-2 pb-3 text-lg font-semibold transition ${
                  isActive
                    ? "text-[var(--brand-primary)]"
                    : "text-[var(--text-primary)] hover:text-[var(--brand-secondary)]"
                }`}
              >
                {t.label}
                <span
                  className={`absolute left-0 -bottom-[2px] h-[3px] rounded-full transition-all ${
                    isActive
                      ? "w-full bg-[var(--brand-primary)]"
                      : "w-0 bg-[var(--brand-secondary)] group-hover:w-full"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Product Carousel */}
      <div className="max-w-[1600px] mx-auto relative overflow-visible">
        {data && data.length > 0 ? (
          <Swiper
            modules={[Navigation]}
            spaceBetween={20}
            slidesPerView={2}
            breakpoints={{
              640: { slidesPerView: 2.5 },
              1024: { slidesPerView: 4 },
              1440: { slidesPerView: 5 },
            }}
            className={`${hideHeader ? "mt-4" : "mt-8"} overflow-visible`}
          >
            {data.map((item, i) => {
              const firstImage =
                item?.productimage?.[0]?.url ||
                item?.img ||
                "/images/placeholder.jpg";

              // Extract unique color hex codes
              const variants: any[] =
                item?.productvariant || item?.variants || [];
              const colors: string[] = Array.from(
                new Set(
                  variants
                    .map((v: any) => v.color?.hexCode)
                    .filter(
                      (hex: any): hex is string =>
                        typeof hex === "string" && Boolean(hex),
                    ),
                ),
              );

              // Map each color hex code to its respective variant image
              const colorImages: Record<string, string> = {};
              variants.forEach((v: any) => {
                const hex = v.color?.hexCode?.toLowerCase();
                const vImg = v.imageUrl || v.variantImages?.[0]?.url;
                if (hex && vImg && !colorImages[hex]) {
                  colorImages[hex] = vImg;
                }
              });

              const isItemWishlisted =
                wishlistOverrides[item.id] !== undefined
                  ? wishlistOverrides[item.id]
                  : Boolean(item.isInWishlist);

              return (
                <SwiperSlide
                  key={item.id || i}
                  className="pb-4 overflow-visible"
                >
                  <div className="relative z-0 hover:z-20 overflow-visible">
                    <SingleImgMultiColorProductCard
                      product={{
                        id: item.id,
                        title: item.title,
                        price: String(item.sellingPrice || item.price || 0),
                        img: firstImage,
                        //Iam romoce color this color not need
                        variants,
                        colorImages,
                        isInWishlist: isItemWishlisted,
                        slug: item.slug,
                        rawProduct: item,
                      }}
                      onAddToBag={handleAddToBag}
                      onWishlistToggle={(id) =>
                        handleWishlistToggle(id, isItemWishlisted)
                      }
                      isAdding={addingId === item.id}
                    />
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>
        ) : (
          <div className="text-center py-10 text-gray-500 font-medium">
            No related products available.
          </div>
        )}
      </div>
    </section>
  );
}
