"use client";

import Image from "next/image";
import { ShoppingBag, Heart, Plus, Check, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface ProductVariantItem {
  id: number;
  productId?: number;
  colorId?: number;
  sizeId?: number;
  color?: { id: number; name: string; hexCode: string };
  size?: { id: number; name: string };
  imageUrl?: string;
  price?: number;
  stock?: number;
  availableStock?: number;
}

export interface Product {
  id: number;
  title: string;
  price: string;
  img: string;
  colors?: string[];
  isNew?: boolean;
  isInWishlist?: boolean;
  slug?: string;
  variants?: ProductVariantItem[];
  colorImages?: Record<string, string>; // hexCode (lowercase) -> image url
  rawProduct?: any;
}

interface ProductCardProps {
  product: Product;
  removable?: boolean;
  onAddToBag?: (product: Product, selectedVariant?: ProductVariantItem) => void | Promise<void>;
  onWishlistToggle?: (id: number, isInWishlist: boolean) => void;
  isAdding?: boolean;
}

export default function SingleImgMultiColorProductCard({
  product,
  removable = false,
  onAddToBag,
  onWishlistToggle,
  isAdding = false,
}: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(product.isInWishlist ?? false);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    product.colors && product.colors.length > 0 ? product.colors[0] : null
  );
  const [displayImg, setDisplayImg] = useState<string>(product.img);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);
  const router = useRouter();

  // Keep image and wishlist state in sync if product prop updates
  useEffect(() => {
    setDisplayImg(product.img);
  }, [product.img]);

  useEffect(() => {
    setWishlisted(product.isInWishlist ?? false);
  }, [product.isInWishlist]);

  const handleCardClick = () => {
    if (product?.slug) {
      router.push(`/products/${product.slug}`);
    }
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !wishlisted;
    setWishlisted(nextState);
    if (onWishlistToggle) onWishlistToggle(product.id, wishlisted);
  };

  const handleColorClick = (e: React.MouseEvent, colorHex: string) => {
    e.stopPropagation();
    setSelectedColor(colorHex);

    const lowerHex = colorHex.toLowerCase();
    // 1. Check direct colorImages map
    if (product.colorImages && product.colorImages[lowerHex]) {
      setDisplayImg(product.colorImages[lowerHex]);
      return;
    }

    // 2. Search variants for matching color with image
    if (Array.isArray(product.variants)) {
      const match = product.variants.find(
        (v) => v.color?.hexCode?.toLowerCase() === lowerHex && v.imageUrl
      );
      if (match?.imageUrl) {
        setDisplayImg(match.imageUrl);
      }
    }
  };

  const handleAddClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Find variant corresponding to selected color if applicable
    let targetVariant: ProductVariantItem | undefined = undefined;
    if (selectedColor && Array.isArray(product.variants)) {
      const lowerHex = selectedColor.toLowerCase();
      targetVariant = product.variants.find(
        (v) => v.color?.hexCode?.toLowerCase() === lowerHex && ((v.availableStock ?? v.stock ?? 0) > 0)
      );
    }

    if (onAddToBag) {
      await onAddToBag(product, targetVariant);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2000);
    } else {
      handleCardClick();
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group flex flex-col text-center cursor-pointer transition-transform duration-300 hover:-translate-y-1 relative"
    >
      {/* New In Badge */}
      {product.isNew && (
        <span className="absolute top-3 left-3 z-20 bg-[var(--brand-primary)] text-white text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide pointer-events-none">
          New In
        </span>
      )}

      {/* Wishlist Button */}
      <button
        type="button"
        onClick={handleWishlistClick}
        className="absolute top-3 right-3 z-20 p-2 bg-white/90 hover:bg-white rounded-full shadow-sm transition pointer-events-auto"
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          size={18}
          className={`transition ${
            wishlisted
              ? "fill-[var(--brand-primary)] text-[var(--brand-primary)]"
              : "text-[var(--text-primary)] hover:fill-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          }`}
        />
      </button>

      {/* Product Image */}
      <div
        className="relative w-full aspect-[3/4] overflow-hidden rounded-2xl bg-[#f8f5f0] flex items-center justify-center shadow-sm hover:shadow-lg transition-all duration-300 hover:ring-2 hover:ring-[var(--brand-secondary)]"
        style={{ aspectRatio: "3/4" }}
      >
        <Image
          src={displayImg || "/images/placeholder.png"}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          loading="lazy"
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Product Title */}
      <h3 className="mt-4 text-sm font-medium text-[var(--text-primary)] line-clamp-1">
        {product.title}
      </h3>

      {/* Price */}
      <p className="mt-1 text-[var(--brand-primary)] text-sm font-semibold">
        £{product.price}
      </p>

      {/* Interactive Colors Section */}
      <div className="h-7 mt-2 flex justify-center items-center">
        {product.colors && product.colors.length > 0 ? (
          <div className="flex justify-center items-center gap-2">
            {product.colors.slice(0, 4).map((color, index) => {
              const isSelected = selectedColor?.toLowerCase() === color.toLowerCase();
              return (
                <button
                  type="button"
                  key={index}
                  onClick={(e) => handleColorClick(e, color)}
                  className={`w-4 h-4 rounded-full border border-gray-300 shadow-sm transition-all hover:scale-125 pointer-events-auto ${
                    isSelected ? "ring-2 ring-[var(--brand-primary)] ring-offset-1 scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Color swatch ${color}`}
                  aria-label={`Select color ${color}`}
                />
              );
            })}
            {product.colors.length > 4 && (
              <div className="w-5 h-5 rounded-full border border-gray-300 shadow-sm bg-white flex items-center justify-center text-[10px] font-medium text-[var(--text-primary)]">
                <Plus size={12} strokeWidth={2} />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center" />
        )}
      </div>

      {/* Functional Add to Bag Button */}
      <button
        type="button"
        onClick={handleAddClick}
        disabled={isAdding}
        className={`mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-full py-2.5 px-4 transition-all pointer-events-auto ${
          addedSuccess
            ? "bg-green-600 text-white border border-green-600"
            : "border border-[var(--brand-secondary)] text-[var(--brand-secondary)] hover:bg-[var(--brand-secondary)] hover:text-white"
        } ${isAdding ? "opacity-75 cursor-not-allowed" : ""}`}
      >
        {isAdding ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Adding...
          </>
        ) : addedSuccess ? (
          <>
            <Check size={14} />
            Added to Bag
          </>
        ) : (
          <>
            <ShoppingBag size={14} />
            Add to Bag
          </>
        )}
      </button>
    </div>
  );
}
