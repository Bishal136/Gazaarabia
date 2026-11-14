"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Heart, Star } from "lucide-react";

import { formatGBP } from "@/lib/utils/shipping";
import { formatSoldDuration } from "@/lib/utils";
import ProductVideoHover from "./ProductVideoHover";
import { extractProductVideoUrl } from "@/lib/utils/productVideo";

interface ProductCardProps {
  product: any;
  onWishlistToggle?: (id: number, isInWishlist: boolean) => void;
  onCardClick?: () => void;
  viewMode?: "grid" | "list";
  priority?: boolean;
}

/**
 * Compact sold count formatting (e.g. 1700 => 1.7K, 50 => 50, 0 => 0)
 */
function formatSoldCount(sold: number | null | undefined): string {
  const count = Number(sold) || 0;
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (count >= 1_000) {
    return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return String(count);
}

export default function ProductCard({
  product,
  onWishlistToggle,
  onCardClick,
  viewMode = "grid",
  priority = false,
}: ProductCardProps) {
  const router = useRouter();
  const [wishlist, setWishlist] = useState(Boolean(product.isInWishlist));

  // State to track hover for automatic video preview playback
  const [isHovered, setIsHovered] = useState(false);
  const videoUrl = extractProductVideoUrl(product);

  const handleCardClick = () => {
    onCardClick?.();
    router.push(`/products/${product.slug}`);
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !wishlist;
    setWishlist(newState);
    onWishlistToggle?.(product.id, newState);
  };

  const soldDurationLabel = formatSoldDuration(product.soldHighlightDuration);

  const images =
    Array.isArray(product.productimage) && product.productimage.length > 0
      ? product.productimage
      : [{ url: "/images/placeholder.png", alt: product.title }];
  const primaryImg = images[0]?.url || "/images/placeholder.png";
  const secondaryImg = images[1]?.url || null;

  const regPrice = Number(product.sellingPrice || product.price || 0);
  let salePrice = product.discountPrice ? Number(product.discountPrice) : null;
  if (
    !salePrice &&
    regPrice > 0 &&
    Array.isArray(product.productvariant) &&
    product.productvariant.length > 0
  ) {
    const validPrices = product.productvariant
      .map((v: any) => Number(v.price))
      .filter((p: number) => !isNaN(p) && p > 0);
    if (validPrices.length > 0) {
      const minVarPrice = Math.min(...validPrices);
      if (minVarPrice < regPrice) {
        salePrice = minVarPrice;
      }
    }
  }
  const hasDiscount = Boolean(salePrice && regPrice > salePrice);
  const discountPercent =
    hasDiscount && salePrice
      ? Math.round(((regPrice - salePrice) / regPrice) * 100)
      : 0;
  const currentPrice = hasDiscount && salePrice ? salePrice : regPrice;

  // =========================================================================
  // LIST VIEW LAYOUT
  // =========================================================================
  if (viewMode === "list") {
    return (
      <div
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group flex flex-col sm:flex-row items-stretch w-full bg-white border border-gray-200/80 hover:border-gray-300 rounded-2xl shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer p-4 sm:p-5 gap-5 sm:gap-6 min-w-0"
      >
        {/* --- Image Section --- */}
        <div
          className="relative w-full sm:w-56 shrink-0 aspect-square overflow-hidden bg-gray-50 rounded-xl"
        >
          {/* Wishlist Button */}
          <button
            onClick={handleWishlistClick}
            aria-label="Wishlist"
            className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-xs border border-gray-200 hover:border-gray-300 rounded-full p-2 shadow-xs transition hover:scale-105"
          >
            <Heart
              size={18}
              className={
                wishlist
                  ? "fill-red-500 text-red-500"
                  : "text-gray-500 hover:text-red-500 hover:fill-red-500"
              }
            />
          </button>

          {/* Top-left Badges Container */}
          <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-1.5 pointer-events-none">
            {hasDiscount && (
              <span className="bg-[#f85606] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                -{discountPercent}% OFF
              </span>
            )}
            {product.soldCount > 0 && soldDurationLabel && (
              <span className="bg-black/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                Sold {product.soldCount} in {soldDurationLabel}
              </span>
            )}
          </div>

          {/* Static Primary + Hover Secondary Image */}
          <div className="relative w-full h-full overflow-hidden">
            <Image
              src={primaryImg}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 100vw, 224px"
              priority={Boolean(priority)}
              loading={priority ? "eager" : "lazy"}
              className={`w-full h-full object-cover object-center transition-all duration-500 ${
                secondaryImg
                  ? "group-hover:opacity-0 group-hover:scale-105"
                  : "group-hover:scale-105"
              }`}
              onError={(e: any) => {
                if (e.target && e.target.src) {
                  e.target.onerror = null;
                  e.target.srcset = "";
                  e.target.src = "/images/placeholder.png";
                }
              }}
            />
            {secondaryImg && !videoUrl && (
              <Image
                src={secondaryImg}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 100vw, 224px"
                loading="lazy"
                className="w-full h-full object-cover object-center absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                onError={(e: any) => {
                  if (e.target && e.target.src) {
                    e.target.onerror = null;
                    e.target.srcset = "";
                    e.target.src = "/images/placeholder.png";
                  }
                }}
              />
            )}

            {/* Hover-to-play Video Preview (smoothly plays when video is available) */}
            {videoUrl && (
              <ProductVideoHover
                videoUrl={videoUrl}
                isHovered={isHovered}
              />
            )}
          </div>
        </div>

        {/* --- Content Section --- */}
        <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
          <div>
            {/* Category if available */}
            {product.category?.name && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1 block">
                {product.category.name}
              </span>
            )}

            {/* Product Title */}
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-[#f85606] transition-colors line-clamp-2">
              {product.title}
            </h3>

            {/* Rating Stars + Sold meta */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i < Math.floor(product.rating || 0)
                        ? "fill-amber-400 text-amber-400"
                        : i < (product.rating || 0)
                        ? "fill-amber-400/50 text-amber-400"
                        : "text-gray-200 fill-gray-100"
                    }
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-gray-800">
                {Number(product.rating || 0).toFixed(1)}
              </span>
              <span className="text-xs text-gray-500">
                ({product.reviewsCount || 0}{" "}
                {product.reviewsCount === 1 ? "review" : "reviews"})
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-600 font-medium">
                {formatSoldCount(product.soldCount || 0)} sold
              </span>
            </div>

            {/* Short Description */}
            {(product.shortDescription || product.description) && (
              <p className="text-xs sm:text-sm text-gray-500 mt-2.5 line-clamp-2 leading-relaxed">
                {(product.shortDescription || product.description).replace(
                  /<[^>]*>?/gm,
                  ""
                )}
              </p>
            )}

            {/* Color Swatches */}
            {product.productvariant?.length > 0 && (
              <div className="flex items-center gap-2 mt-3.5">
                <span className="text-xs text-gray-400 font-medium">Colours:</span>
                <div className="flex items-center gap-1.5">
                  {product.productvariant
                    .slice(0, 5)
                    .map((variant: any, idx: number) => (
                      <span
                        key={idx}
                        className="w-4 h-4 rounded-full border border-gray-300 shadow-xs"
                        style={{ backgroundColor: variant.color?.hexCode }}
                      />
                    ))}
                  {product.productvariant.length > 5 && (
                    <span className="text-[10px] text-gray-500 font-medium ml-0.5">
                      +{product.productvariant.length - 5}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Bar: Price + Action Button */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-bold text-[#f85606]">
                {formatGBP(currentPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xs sm:text-sm text-gray-400 line-through">
                    {formatGBP(regPrice)}
                  </span>
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-[#f85606] border border-orange-200 uppercase tracking-wider">
                    -{discountPercent}%
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleCardClick}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 transition shadow-xs"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // GRID VIEW LAYOUT (MATCHES DARAZ / MODERN MARKETPLACE CARD)
  // =========================================================================
  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex flex-col w-full bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full min-w-0"
    >
      {/* --- Image Section (1:1 Square) --- */}
      <div className="relative w-full aspect-square overflow-hidden bg-gray-50 shrink-0">
        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleWishlistClick}
          aria-label="Wishlist"
          className="absolute top-2 right-2 z-20 bg-white/85 hover:bg-white backdrop-blur-xs border border-gray-200/60 rounded-full p-1.5 shadow-xs transition hover:scale-110"
        >
          <Heart
            size={15}
            className={
              wishlist
                ? "fill-red-500 text-red-500"
                : "text-gray-400 hover:text-red-500 hover:fill-red-500"
            }
          />
        </button>

        {/* Static Primary + Hover Secondary Image */}
        <div className="relative w-full h-full overflow-hidden">
          <Image
            src={primaryImg}
            alt={product.title}
            fill
            sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
            priority={Boolean(priority)}
            loading={priority ? "eager" : "lazy"}
            className={`w-full h-full object-cover object-center transition-all duration-500 ${
              secondaryImg
                ? "group-hover:opacity-0 group-hover:scale-105"
                : "group-hover:scale-105"
            }`}
            onError={(e: any) => {
              if (e.target && e.target.src) {
                e.target.onerror = null;
                e.target.srcset = "";
                e.target.src = "/images/placeholder.png";
              }
            }}
          />
          {secondaryImg && !videoUrl && (
            <Image
              src={secondaryImg}
              alt={product.title}
              fill
              sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              loading="lazy"
              className="w-full h-full object-cover object-center absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              onError={(e: any) => {
                if (e.target && e.target.src) {
                  e.target.onerror = null;
                  e.target.srcset = "";
                  e.target.src = "/images/placeholder.png";
                }
              }}
            />
          )}

          {/* Hover-to-play Video Preview (smoothly plays when video is available) */}
          {videoUrl && (
            <ProductVideoHover
              videoUrl={videoUrl}
              isHovered={isHovered}
            />
          )}
        </div>
      </div>

      {/* --- Content Section (Daraz-style Left-aligned Layout) --- */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between gap-1.5">
        <div>
          {/* Product Title (2-line clamp with uniform min height) */}
          <h3
            title={product.title}
            className="text-xs sm:text-[13px] md:text-sm font-normal text-[#212121] group-hover:text-[#f85606] transition-colors line-clamp-2 leading-snug min-h-[2.4em]"
          >
            {product.title}
          </h3>

          {/* Pricing Row: Bold Orange Price (#f85606) */}
          <div className="mt-2">
            <div className="text-base sm:text-lg md:text-xl font-bold text-[#f85606] leading-none tracking-tight">
              {formatGBP(currentPrice)}
            </div>

            {/* Discount / Original price row */}
            {hasDiscount ? (
              <div className="flex items-center gap-1.5 mt-1 text-xs">
                <span className="text-gray-400 line-through text-[11px] sm:text-xs">
                  {formatGBP(regPrice)}
                </span>
                <span className="text-gray-500 font-medium text-[11px] sm:text-xs">
                  {discountPercent}% Off
                </span>
              </div>
            ) : (
              <div className="h-4 mt-1" />
            )}
          </div>
        </div>

        {/* Bottom Meta Row: Sold count + Star Rating + Reviews Count + Location/Brand */}
        <div className="mt-1 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] sm:text-xs text-gray-500">
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            <span className="font-normal text-gray-700 whitespace-nowrap">
              {formatSoldCount(product.soldCount || 0)} sold
            </span>
            <span className="text-gray-300 mx-0.5 select-none">|</span>
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => {
                const rating = Number(product.rating) || 0;
                const isFilled = i < Math.floor(rating);
                const isHalf = !isFilled && i < rating;
                return (
                  <Star
                    key={i}
                    size={11}
                    className={
                      isFilled
                        ? "fill-amber-400 text-amber-400"
                        : isHalf
                        ? "fill-amber-400/50 text-amber-400"
                        : "text-gray-200 fill-gray-100"
                    }
                  />
                );
              })}
            </div>
            <span className="text-gray-400 whitespace-nowrap">
              ({product.reviewsCount || 0})
            </span>
          </div>

          {(product.brand?.name || product.seller?.shopName || product.location) && (
            <span className="text-gray-400 truncate max-w-[65px] sm:max-w-[85px] text-[10px] sm:text-[11px] shrink-0 text-right ml-1">
              {product.brand?.name || product.seller?.shopName || product.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
