"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Tag, ShieldCheck } from "lucide-react";
import { formatGBP } from "@/lib/utils/shipping";
import { ProductContext } from "@/lib/services/chatService";

interface ProductContextCardProps {
  product: ProductContext;
  onSendAsMessage?: () => void;
  isPinned?: boolean;
}

export default function ProductContextCard({
  product,
  onSendAsMessage,
  isPinned = false,
}: ProductContextCardProps) {
  if (!product) return null;

  const priceFormatted = formatGBP(product.price);

  return (
    <div
      className={`relative flex items-center gap-3 p-3 rounded-2xl transition-all ${
        isPinned
          ? "bg-white/95 border border-amber-200/90 shadow-xs"
          : "bg-white border border-gray-200/80 shadow-2xs hover:border-gray-300"
      }`}
    >
      {/* Product Image Thumbnail */}
      <Link
        href={product.slug ? `/products/${product.slug}` : "#"}
        target="_blank"
        className="relative w-14 h-14 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 group"
      >
        <Image
          src={product.image || "/placeholder.png"}
          alt={product.title}
          fill
          sizes="56px"
          className="object-contain p-1 group-hover:scale-105 transition-transform"
        />
      </Link>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        {isPinned && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold tracking-wide">
              <Tag size={10} className="text-amber-800" />
              REFERENCED PRODUCT
            </span>
          </div>
        )}
        <Link
          href={product.slug ? `/products/${product.slug}` : "#"}
          target="_blank"
          className="font-bold text-xs sm:text-sm text-gray-900 hover:text-[#b08a78] transition line-clamp-1"
        >
          {product.title}
        </Link>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs sm:text-sm font-black text-gray-900">
            {priceFormatted}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
            <ShieldCheck size={10} /> Verified
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onSendAsMessage && (
          <button
            type="button"
            onClick={onSendAsMessage}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#b08a78] text-white hover:bg-[#976f5d] transition shadow-2xs"
            title="Attach to message"
          >
            Attach
          </button>
        )}
        <Link
          href={product.slug ? `/products/${product.slug}` : "#"}
          target="_blank"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          title="Open product page in new tab"
        >
          <ExternalLink size={15} />
        </Link>
      </div>
    </div>
  );
}
