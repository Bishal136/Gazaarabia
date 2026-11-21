"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  UploadCloud,
  X,
  Sparkles,
  Loader2,
  RefreshCw,
  Tag,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { formatGBP } from "@/lib/utils/shipping";

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct?: (slug: string) => void;
}

export default function VisualSearchModal({
  isOpen,
  onClose,
  onSelectProduct,
}: VisualSearchModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    features: any;
    products: any[];
    total: number;
  } | null>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    } else {
      handleReset();
    }
  }, [isOpen]);

  const handleReset = () => {
    setImagePreview(null);
    setResults(null);
    setError(null);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (.jpg, .png, .webp)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);
      executeVisualSearch(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const executeVisualSearch = async (base64Data: string, mimeType: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/front-end/search/visual-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setResults({
          features: json.features,
          products: json.products || [],
          total: json.total || 0,
        });
      } else {
        setError(json.message || "Failed to analyze photo");
      }
    } catch (err: any) {
      console.error("Visual search error:", err);
      setError("Network error while searching image");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#009639] flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  AI Visual Fashion Search
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/70 text-[#009639]">
                  <Sparkles className="w-3 h-3" />
                  Gemini Vision
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Upload or capture any outfit to discover identical or complementary modest styles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {!imagePreview ? (
            /* Upload Dropzone */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-[#009639] bg-stone-50/50 hover:bg-emerald-50/20 rounded-2xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center gap-3.5"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-[#009639] group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8" />
              </div>

              <div>
                <p className="text-sm sm:text-base font-semibold text-gray-800">
                  Drag and drop your outfit photo here, or{" "}
                  <span className="text-[#009639] underline">browse files</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports JPG, PNG, WEBP screenshots, or camera snaps (up to 10MB)
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-600 shadow-2xs">
                  👗 Abayas & Kaftans
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-600 shadow-2xs">
                  🧕 Hijabs & Scarves
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white border border-gray-200 text-gray-600 shadow-2xs">
                  ✨ Embroidery & Tatreez
                </span>
              </div>
            </div>
          ) : (
            /* Analysis & Results View */
            <div className="space-y-6">
              {/* Image Preview & Scanning Status */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                <div className="relative w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden border border-gray-200 shadow-xs shrink-0 bg-white">
                  <Image
                    src={imagePreview}
                    alt="Visual Search Target"
                    fill
                    className="object-cover"
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-emerald-950/20 flex items-center justify-center">
                      {/* Laser scanner animation line */}
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-[pulse_1.2s_ease-in-out_infinite]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Target Photo
                    </span>
                    {loading && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Scanning features...
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-gray-600">
                    {loading
                      ? "Analyzing silhouette, fabric patterns, and color palette with Google Gemini Vision..."
                      : results?.features?.description || "Visual attributes extracted successfully."}
                  </p>

                  {/* Extracted Feature Pills */}
                  {results?.features && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                      {results.features.itemType && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-800 shadow-2xs">
                          Style: {results.features.itemType}
                        </span>
                      )}
                      {results.features.primaryColor && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-800 shadow-2xs">
                          Color: {results.features.primaryColor}
                        </span>
                      )}
                      {results.features.pattern && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-800 shadow-2xs">
                          Pattern: {results.features.pattern}
                        </span>
                      )}
                      {results.features.fabric && (
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-800 shadow-2xs">
                          Fabric: {results.features.fabric}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#009639] hover:text-emerald-700 underline"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Search with a different photo
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 rounded-xl bg-red-50 text-red-700 text-xs sm:text-sm border border-red-200">
                  {error}
                </div>
              )}

              {/* Products Grid */}
              {results && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Matching Modest Styles ({results.products.length})
                    </span>
                    {results.features?.suggestedCategorySlug && (
                      <Link
                        href={`/shop?category=${results.features.suggestedCategorySlug}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#009639] hover:underline"
                      >
                        Explore Category
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>

                  {results.products.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 text-sm">
                      No visually identical styles found in stock. Try exploring similar categories.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                      {results.products.map((product) => (
                        <Link
                          key={product.id}
                          href={`/products/${product.slug}`}
                          onClick={() => {
                            onClose();
                            onSelectProduct?.(product.slug);
                          }}
                          className="group relative flex flex-col bg-white rounded-2xl border border-gray-200/80 overflow-hidden hover:shadow-lg transition-all duration-200"
                        >
                          <div className="relative aspect-[3/4] w-full bg-stone-100 overflow-hidden">
                            <Image
                              src={product.imageUrl || "/images/placeholder.png"}
                              alt={product.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {product.matchScore >= 0.9 && (
                              <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                                Top Match
                              </span>
                            )}
                          </div>

                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <h4 className="text-xs font-semibold text-gray-900 line-clamp-2 group-hover:text-[#009639] transition-colors">
                              {product.title}
                            </h4>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-900">
                                {formatGBP(product.sellingPrice)}
                              </span>
                              {product.discountPrice && (
                                <span className="text-[11px] text-gray-400 line-through">
                                  {formatGBP(product.discountPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
