"use client";

import { Star } from "lucide-react";

interface ProductPreviewCardProps {
  title: string;
  price: string;
  imageUrl?: string;
  sellingPrice?: string;
  costPrice?: string;
  discountPrice?: string;
}

export const ProductPreviewCard = ({
  title,
  price,
  imageUrl,
  sellingPrice,
  costPrice,
  discountPrice,
}: ProductPreviewCardProps) => {
  const regularVal = Number(sellingPrice || price || 0);
  const discountVal = discountPrice ? Number(discountPrice) : 0;
  const hasDiscount = discountVal > 0 && discountVal < regularVal;
  const activePrice = hasDiscount ? discountVal : regularVal;
  const discountPct = hasDiscount ? Math.round(((regularVal - discountVal) / regularVal) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow sticky top-6">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-transparent">
        <h3 className="text-sm font-semibold text-gray-800">Live Preview</h3>
        <p className="text-xs text-gray-500">How it appears to customers</p>
      </div>

      {/* Preview Content */}
      <div className="p-4 space-y-4">
        {/* Product Image */}
        <div className="w-full aspect-square rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center text-gray-400">
              <p className="text-sm">No image</p>
              <p className="text-xs">uploaded yet</p>
            </div>
          )}
        </div>

        {/* Rating (placeholder) */}
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className="text-gray-300 fill-gray-300"
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">(0 reviews)</span>
        </div>

        {/* Title */}
        <div>
          <h2 className="font-semibold text-gray-900 line-clamp-2 text-sm">
            {title || "Enter product title"}
          </h2>
        </div>

        {/* Price Section */}
        <div className="space-y-2 py-2 border-t border-gray-100">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {activePrice ? `£${activePrice.toFixed(2)}` : "£0.00"}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">
                £{regularVal.toFixed(2)}
              </span>
            )}
            {hasDiscount && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-200 uppercase">
                {discountPct}% OFF
              </span>
            )}
          </div>

          {costPrice && Number(costPrice) > 0 && (
            <div className="text-xs text-gray-500">
              Cost: £{Number(costPrice).toFixed(2)}
            </div>
          )}
        </div>

        {/* Add to Cart Button (mockup) */}
        <button
          disabled
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-2 rounded-lg text-sm hover:opacity-90 transition-opacity disabled:opacity-70 cursor-not-allowed"
        >
          Add to Cart
        </button>

        {/* Info */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
          <p>Preview updates as you edit</p>
        </div>
      </div>
    </div>
  );
};
