"use client";

import { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Upload,
  Copy,
  Eye,
  EyeOff,
  X,
  Layers,
  Palette,
} from "lucide-react";
import { CircularProgress } from "@mui/material";
import { uploadService } from "@/lib/services/uploadService";
import { ProductVariant } from "@/hooks/useVariantManagement";

export interface UniversalVariant extends ProductVariant {
  colorName?: string;
  sizeName?: string;
  hexCode?: string;
}

interface VariantsProps {
  variants: UniversalVariant[];
  onVariantsChange: (variants: UniversalVariant[]) => void;
  colors: any[];
  sizes: any[];
  basePrice?: string | number;
  productTitle?: string;
  onError?: (message: string) => void;
}

export const VariantsTikTokStyle = ({
  variants,
  onVariantsChange,
  colors,
  sizes,
  basePrice,
  productTitle = "",
  onError,
}: VariantsProps) => {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  // Hidden file inputs for variant image uploads
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Generate clean SKU
  const generateSKU = (title: string, color?: string, size?: string) => {
    const cleanTitle = (title || "GZ")
      .split(" ")
      .slice(0, 2)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase())
      .join("-") || "GZ";
    const cleanColor = color ? color.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() : "";
    const cleanSize = size ? size.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";
    const parts = [cleanTitle, cleanColor, cleanSize].filter(Boolean);
    return parts.join("-");
  };

  // Resolve color name
  const getColorName = (v: UniversalVariant) => {
    if (v.colorName) return v.colorName;
    if (v.colorId) {
      const match = colors.find((c) => String(c.id) === String(v.colorId));
      return match?.name || String(v.colorId);
    }
    return "";
  };

  // Resolve size name
  const getSizeName = (v: UniversalVariant) => {
    if (v.sizeName) return v.sizeName;
    if (v.sizeId) {
      const match = sizes.find((s) => String(s.id) === String(v.sizeId));
      return match?.name || String(v.sizeId);
    }
    return "";
  };

  // Resolve color hex
  const getColorHex = (v: UniversalVariant) => {
    if (v.hexCode) return v.hexCode;
    if (v.colorId) {
      const match = colors.find((c) => String(c.id) === String(v.colorId));
      if (match?.hexCode || match?.colorCode) return match.hexCode || match.colorCode;
    }
    if (v.colorName) {
      const match = colors.find(
        (c) => String(c.name).trim().toLowerCase() === String(v.colorName).trim().toLowerCase()
      );
      if (match?.hexCode || match?.colorCode) return match.hexCode || match.colorCode;
    }
    return "#cbd5e1";
  };

  // 1. Add a new Color Card
  const handleAddColor = () => {
    const newVar: UniversalVariant = {
      colorId: "",
      colorName: "",
      sizeId: "",
      sizeName: "",
      sku: generateSKU(productTitle, "", ""),
      price: basePrice ? String(basePrice) : "49.99",
      stock: "30",
      isActive: true,
      images: [],
    };
    onVariantsChange([...variants, newVar]);
  };

  // 2. Duplicate Color Card
  const handleDuplicateColor = (idx: number) => {
    const source = variants[idx];
    const clone: UniversalVariant = {
      ...source,
      id: undefined,
      sku: source.sku ? `${source.sku}-COPY` : "",
      images: Array.isArray(source.images) ? [...source.images] : [],
    };
    const updated = [...variants];
    updated.splice(idx + 1, 0, clone);
    onVariantsChange(updated);
  };

  // 3. Remove Color Card
  const handleRemoveColor = (idx: number) => {
    onVariantsChange(variants.filter((_, i) => i !== idx));
  };

  // 4. Update color name atomically
  const handleUpdateColor = (idx: number, colorValue: string) => {
    const updated = [...variants];
    const item = { ...updated[idx] };

    item.colorName = colorValue;
    const matchedFromDb = colors.find(
      (c) =>
        String(c.name).trim().toLowerCase() === colorValue.trim().toLowerCase() ||
        String(c.id) === String(colorValue)
    );
    if (matchedFromDb) {
      item.colorId = matchedFromDb.id;
      item.hexCode = item.hexCode || matchedFromDb.hexCode || matchedFromDb.colorCode;
    } else {
      item.colorId = "";
    }

    item.sku = generateSKU(productTitle, item.colorName, getSizeName(item));
    updated[idx] = item;
    onVariantsChange(updated);
  };

  // 5. Update color hex from color picker wheel
  const handleUpdateHex = (idx: number, hex: string) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], hexCode: hex };
    onVariantsChange(updated);
  };

  // 6. Update size text input directly
  const handleUpdateSize = (idx: number, sizeValue: string) => {
    const updated = [...variants];
    const item = { ...updated[idx] };

    item.sizeName = sizeValue;
    const matchedFromDb = sizes.find(
      (s) =>
        String(s.name).trim().toLowerCase() === sizeValue.trim().toLowerCase() ||
        String(s.id) === String(sizeValue)
    );
    item.sizeId = matchedFromDb ? matchedFromDb.id : "";

    item.sku = generateSKU(productTitle, getColorName(item), item.sizeName);
    updated[idx] = item;
    onVariantsChange(updated);
  };

  // 7. Update single variant field (sku, price, stock, isActive)
  const handleUpdateField = (idx: number, field: keyof UniversalVariant, value: any) => {
    const updated = [...variants];
    const item = { ...updated[idx], [field]: value };
    updated[idx] = item;
    onVariantsChange(updated);
  };

  // 8. Upload photo for variant
  const handleUploadPhoto = async (idx: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingIdx(idx);
      const fileArray = Array.from(files);
      const urls = await uploadService.uploadMultiple(fileArray, "variants");
      const currentImages = Array.isArray(variants[idx].images) ? variants[idx].images : [];
      const newImages = [...currentImages, ...urls.map((url) => ({ url, alt: "" }))];
      const primaryUrl = newImages[0]?.url || null;

      const targetColorName = variants[idx].colorName;

      const updated = variants.map((v, i) => {
        if (i === idx) {
          return { ...v, images: newImages, imageUrl: primaryUrl };
        }
        if (targetColorName && v.colorName === targetColorName) {
          return { ...v, images: newImages, imageUrl: primaryUrl };
        }
        return v;
      });

      onVariantsChange(updated);
    } catch {
      onError?.("Failed to upload variant image. Please try again.");
    } finally {
      setUploadingIdx(null);
      if (fileInputRefs.current[idx]) fileInputRefs.current[idx]!.value = "";
    }
  };

  // 9. Remove photo from variant
  const handleRemovePhoto = (variantIdx: number, photoIdx: number) => {
    const current = variants[variantIdx].images || [];
    const filtered = current.filter((_, i) => i !== photoIdx);
    const primaryUrl = filtered[0]?.url || null;

    const targetColorName = variants[variantIdx].colorName;

    const updated = variants.map((v, i) => {
      if (i === variantIdx) {
        return { ...v, images: filtered, imageUrl: primaryUrl };
      }
      if (targetColorName && v.colorName === targetColorName) {
        return { ...v, images: filtered, imageUrl: primaryUrl };
      }
      return v;
    });

    onVariantsChange(updated);
  };

  // 10. Bulk Apply Price
  const handleBulkApplyPrice = () => {
    if (!bulkPrice) {
      onError?.("Please enter a price to apply.");
      return;
    }
    const updated = variants.map((v) => ({ ...v, price: bulkPrice }));
    onVariantsChange(updated);
  };

  // 11. Bulk Apply Stock
  const handleBulkApplyStock = () => {
    if (!bulkStock) {
      onError?.("Please enter a stock quantity to apply.");
      return;
    }
    const updated = variants.map((v) => ({ ...v, stock: bulkStock }));
    onVariantsChange(updated);
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="text-blue-600" size={24} />
            <span>Product Variants</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Add colors, enter available sizes, and set price and stock.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddColor}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer active:scale-95"
        >
          <Plus size={16} className="stroke-[3]" />
          <span>Add Color</span>
        </button>
      </div>

      {/* BULK EDIT TOOLBAR (When 2+ variants exist) */}
      {variants.length > 1 && (
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-gray-700">Bulk Apply:</span>

            {/* Bulk Price */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Price: £</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                className="w-20 px-2 py-1 border border-gray-300 rounded-lg bg-white"
              />
              <button
                type="button"
                onClick={handleBulkApplyPrice}
                className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 font-semibold rounded-lg shadow-2xs"
              >
                Apply to All
              </button>
            </div>

            {/* Bulk Stock */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Stock:</span>
              <input
                type="number"
                placeholder="Qty"
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded-lg bg-white"
              />
              <button
                type="button"
                onClick={handleBulkApplyStock}
                className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 font-semibold rounded-lg shadow-2xs"
              >
                Apply to All
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onVariantsChange([])}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold rounded-lg transition"
          >
            <Trash2 size={13} />
            <span>Clear All</span>
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {variants.length === 0 ? (
        <div className="text-center py-12 px-6 bg-gray-50/70 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Palette size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            No Color Variants Added Yet
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto mb-5">
            Click below to add your first colorway with its photo and sizes.
          </p>
          <button
            type="button"
            onClick={handleAddColor}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition hover:bg-blue-700 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add First Color</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 px-1 uppercase tracking-wider">
            <span>Color Variants ({variants.length})</span>
            <span className="text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 normal-case font-bold">
              Total SKUs:{" "}
              {variants.reduce((acc, v) => {
                const sCount =
                  (v.sizeName !== undefined ? v.sizeName : (getSizeName(v) || ""))
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean).length || 1;
                return acc + sCount;
              }, 0)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {variants.map((v, idx) => {
              const displayColor = v.colorName !== undefined ? v.colorName : (getColorName(v) || "");
              const displaySize = v.sizeName !== undefined ? v.sizeName : (getSizeName(v) || "");
              const colorHex = getColorHex({ ...v, colorName: displayColor });
              const photo = v.images?.[0]?.url || v.imageUrl;
              const isUploadingThis = uploadingIdx === idx;

              return (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white shadow-xs hover:border-gray-300 transition space-y-4"
                >
                  {/* Card Header: Color #[N] + Action Buttons */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 px-2.5 py-1 bg-gray-100 rounded-lg">
                        Color #{idx + 1}
                      </span>
                      {displayColor && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100 text-xs font-bold text-blue-900">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-gray-300"
                            style={{ backgroundColor: colorHex || "#cbd5e1" }}
                          />
                          <span>{displayColor}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions: Eye, Copy, Trash */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateField(idx, "isActive", !v.isActive)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          v.isActive !== false
                            ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                            : "text-gray-400 bg-gray-100 hover:bg-gray-200"
                        }`}
                        title={v.isActive !== false ? "Variant is active" : "Variant is inactive"}
                      >
                        {v.isActive !== false ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateColor(idx)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        title="Duplicate this color"
                      >
                        <Copy size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveColor(idx)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete this color"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Card Main Body: Photo + Color & Size Configuration */}
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* Left: 3:4 Portrait Photo Box */}
                    <div className="relative group shrink-0">
                      <div
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        className={`w-18 h-[96px] aspect-[3/4] rounded-xl border-2 flex items-center justify-center overflow-hidden cursor-pointer bg-gray-50 transition ${
                          photo
                            ? "border-blue-500 shadow-xs"
                            : "border-dashed border-gray-300 hover:border-blue-500 text-gray-400 hover:text-blue-600"
                        }`}
                        style={{ aspectRatio: "3/4" }}
                        title="Upload color photo (3:4 portrait)"
                      >
                        {isUploadingThis ? (
                          <CircularProgress size={18} sx={{ color: "#2563eb" }} />
                        ) : photo ? (
                          <img src={photo} alt="" className="w-full h-full object-cover object-top" />
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload size={14} />
                            <span className="text-[9px] font-bold mt-0.5">Photo</span>
                          </div>
                        )}
                      </div>

                      {/* Photo removal badge */}
                      {photo && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx, 0)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm"
                          title="Remove photo"
                        >
                          <X size={10} className="stroke-[3]" />
                        </button>
                      )}

                      <input
                        ref={(el) => {
                          fileInputRefs.current[idx] = el;
                        }}
                        type="file"
                        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                        className="hidden"
                        onChange={(e) => handleUploadPhoto(idx, e.target.files)}
                      />
                    </div>

                    {/* Right: Color & Sizes Inputs */}
                    <div className="flex-1 min-w-0 space-y-3 w-full">
                      {/* Color Input */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-700 w-14 shrink-0">Color:</span>
                        <input
                          type="text"
                          placeholder="e.g. Maroon, Sage Green, Black"
                          value={displayColor}
                          onChange={(e) => handleUpdateColor(idx, e.target.value)}
                          className="w-48 sm:w-64 px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition shadow-2xs"
                        />

                        {/* Color Swatch & Color Picker Wheel */}
                        <label className="relative cursor-pointer shrink-0 ml-0.5" title="Pick color shade">
                          <span
                            className="w-7 h-7 rounded-full border border-gray-300 shadow-2xs block transition hover:scale-110"
                            style={{ backgroundColor: colorHex || "#cbd5e1" }}
                          />
                          <input
                            type="color"
                            value={colorHex && colorHex.startsWith("#") ? colorHex : "#cbd5e1"}
                            onChange={(e) => handleUpdateHex(idx, e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                      </div>

                      {/* Sizes Input */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-700 w-14 shrink-0">Sizes:</span>
                        <input
                          type="text"
                          placeholder="e.g. 52, 54, 56, 58 or Free Size"
                          value={displaySize}
                          onChange={(e) => handleUpdateSize(idx, e.target.value)}
                          className="w-full sm:w-80 px-3 py-1.5 text-xs font-bold border border-gray-300 rounded-lg text-gray-900 bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: SKU, Price, Stock */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 bg-gray-50/60 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3 sm:px-4 rounded-b-2xl">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* SKU */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">SKU:</span>
                        <input
                          type="text"
                          placeholder="Auto SKU"
                          value={v.sku || ""}
                          onChange={(e) => handleUpdateField(idx, "sku", e.target.value)}
                          className="w-32 sm:w-40 px-2.5 py-1 text-xs font-mono border border-gray-300 rounded-lg bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                        />
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Price: £</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={v.price}
                          onChange={(e) => handleUpdateField(idx, "price", e.target.value)}
                          className="w-20 px-2.5 py-1 text-xs border border-gray-300 rounded-lg text-right bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                        />
                        {v.compareAtPrice && Number(v.compareAtPrice) > Number(v.price) && (
                          <div className="flex items-center gap-1 ml-0.5">
                            <span className="text-[11px] text-gray-400 line-through">
                              £{Number(v.compareAtPrice).toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              -{Math.round(((Number(v.compareAtPrice) - Number(v.price)) / Number(v.compareAtPrice)) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Stock */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Stock:</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          value={v.stock}
                          onChange={(e) => handleUpdateField(idx, "stock", e.target.value)}
                          className="w-18 px-2.5 py-1 text-xs border border-gray-300 rounded-lg text-right bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none"
                        />
                      </div>
                    </div>

                    <span className="text-[11px] text-gray-400">
                      Applies to all sizes in this color
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Add Color Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleAddColor}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Another Color</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
