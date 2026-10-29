"use client";

import { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Upload,
  Copy,
  Eye,
  EyeOff,
  Sparkles,
  Image as ImageIcon,
  Check,
  X,
  Layers,
  Palette,
} from "lucide-react";
import { CircularProgress } from "@mui/material";
import { uploadService } from "@/lib/services/uploadService";
import { ProductVariant } from "@/hooks/useVariantManagement";

interface UniversalVariant extends ProductVariant {
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

const COMMON_SIZES = ["S", "M", "L", "XL", "XXL", "3XL", "52", "54", "56", "58", "60", "Free Size"];

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
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [showCustomSize, setShowCustomSize] = useState(false);

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
      return match?.hexCode || match?.colorCode || "#cbd5e1";
    }
    return "#cbd5e1";
  };

  // 1. Add an empty / single variant row
  const handleAddSingleVariant = () => {
    const defaultSize = sizes[0]?.name || "M";
    const newVar: UniversalVariant = {
      colorId: "",
      colorName: "",
      sizeId: sizes[0]?.id || "",
      sizeName: defaultSize,
      sku: generateSKU(productTitle, "", defaultSize),
      price: basePrice ? String(basePrice) : "49.99",
      stock: "30",
      isActive: true,
      images: [],
    };
    onVariantsChange([...variants, newVar]);
  };

  // 2. Quick-add by size pill (e.g. M, L, XL - matches user reference!)
  const handleQuickAddSize = (sizeName: string) => {
    // Check if this size already exists (with empty color)
    const exists = variants.some((v) => {
      const sName = getSizeName(v);
      const cName = getColorName(v);
      return sName.toLowerCase() === sizeName.toLowerCase() && !cName;
    });

    if (exists) {
      onError?.(`Size "${sizeName}" is already in your variants.`);
      return;
    }

    // Find if size exists in DB sizes list
    const matchedSizeObj = sizes.find(
      (s) => String(s.name).toLowerCase() === sizeName.toLowerCase()
    );

    const newVar: UniversalVariant = {
      colorId: "",
      colorName: "",
      sizeId: matchedSizeObj?.id || "",
      sizeName: sizeName,
      sku: generateSKU(productTitle, "", sizeName),
      price: basePrice ? String(basePrice) : "49.99",
      stock: "30",
      isActive: true,
      images: [],
    };

    onVariantsChange([...variants, newVar]);
  };

  // 3. Add Custom Size from text input
  const handleAddCustomSize = () => {
    if (!customSizeInput.trim()) return;
    handleQuickAddSize(customSizeInput.trim());
    setCustomSizeInput("");
    setShowCustomSize(false);
  };

  // 4. Duplicate variant row
  const handleDuplicateVariant = (idx: number) => {
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

  // 5. Remove variant row
  const handleRemoveVariant = (idx: number) => {
    onVariantsChange(variants.filter((_, i) => i !== idx));
  };

  // 6. Update single variant field
  const handleUpdateField = (idx: number, field: keyof UniversalVariant, value: any) => {
    const updated = [...variants];
    const item = { ...updated[idx], [field]: value };

    // If color was changed via select
    if (field === "colorId") {
      const matched = colors.find((c) => String(c.id) === String(value));
      if (matched) {
        item.colorName = matched.name;
        item.hexCode = matched.hexCode || matched.colorCode;
      } else {
        item.colorName = "";
      }
      item.sku = generateSKU(productTitle, item.colorName, getSizeName(item));
    }

    // If size was changed via select
    if (field === "sizeId") {
      const matched = sizes.find((s) => String(s.id) === String(value));
      if (matched) {
        item.sizeName = matched.name;
      }
      item.sku = generateSKU(productTitle, getColorName(item), item.sizeName);
    }

    updated[idx] = item;
    onVariantsChange(updated);
  };

  // 7. Upload photo for variant
  const handleUploadPhoto = async (idx: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingIdx(idx);
      const fileArray = Array.from(files);
      const urls = await uploadService.uploadMultiple(fileArray, "variants");
      const currentImages = Array.isArray(variants[idx].images) ? variants[idx].images : [];
      const newImages = [...currentImages, ...urls.map((url) => ({ url, alt: "" }))];
      const primaryUrl = newImages[0]?.url || null;

      const targetColorId = variants[idx].colorId;
      const targetColorName = variants[idx].colorName;

      // If this variant has a color, also sync the photo across other variants with this exact color
      const updated = variants.map((v, i) => {
        if (i === idx) {
          return { ...v, images: newImages, imageUrl: primaryUrl };
        }
        if (
          (targetColorId && v.colorId === targetColorId) ||
          (targetColorName && v.colorName === targetColorName)
        ) {
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

  // 8. Remove single photo from variant
  const handleRemovePhoto = (variantIdx: number, photoIdx: number) => {
    const current = variants[variantIdx].images || [];
    const filtered = current.filter((_, i) => i !== photoIdx);
    const primaryUrl = filtered[0]?.url || null;

    const targetColorId = variants[variantIdx].colorId;
    const targetColorName = variants[variantIdx].colorName;

    const updated = variants.map((v, i) => {
      if (i === variantIdx) {
        return { ...v, images: filtered, imageUrl: primaryUrl };
      }
      if (
        (targetColorId && v.colorId === targetColorId) ||
        (targetColorName && v.colorName === targetColorName)
      ) {
        return { ...v, images: filtered, imageUrl: primaryUrl };
      }
      return v;
    });

    onVariantsChange(updated);
  };

  // 9. Bulk Apply Price
  const handleBulkApplyPrice = () => {
    if (!bulkPrice) {
      onError?.("Please enter a price to apply.");
      return;
    }
    const updated = variants.map((v) => ({ ...v, price: bulkPrice }));
    onVariantsChange(updated);
  };

  // 10. Bulk Apply Stock
  const handleBulkApplyStock = () => {
    if (!bulkStock) {
      onError?.("Please enter a stock quantity to apply.");
      return;
    }
    const updated = variants.map((v) => ({ ...v, stock: bulkStock }));
    onVariantsChange(updated);
  };

  // 11. Auto-generate all SKUs
  const handleAutoGenerateAllSKUs = () => {
    const updated = variants.map((v) => ({
      ...v,
      sku: generateSKU(productTitle, getColorName(v), getSizeName(v)),
    }));
    onVariantsChange(updated);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="text-[#f85606]" size={22} />
            <span>Product Variants</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Create size options (e.g. M, L), color variations, or any custom product variant.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddSingleVariant}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f85606] hover:bg-[#ea4e03] text-white text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer active:scale-95"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Add Variant</span>
          </button>
        </div>
      </div>

      {/* QUICK SIZE PRESETS BAR (Matches reference: Size M, L) */}
      <div className="p-4 bg-orange-50/40 rounded-2xl border border-orange-100/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5 uppercase tracking-wide">
            <Sparkles size={14} className="text-[#f85606]" />
            <span>Quick-Add Sizes:</span>
          </span>
          <span className="text-[11px] text-gray-500">
            Click any size to instantly add that variant row
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {COMMON_SIZES.map((sz) => {
            const isAlreadyAdded = variants.some(
              (v) => getSizeName(v).toUpperCase() === sz.toUpperCase() && !getColorName(v)
            );
            return (
              <button
                key={sz}
                type="button"
                onClick={() => handleQuickAddSize(sz)}
                className={`min-w-[42px] h-8 px-3 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                  isAlreadyAdded
                    ? "bg-white border-[#f85606] text-[#f85606] shadow-2xs"
                    : "bg-white border-gray-200 hover:border-[#f85606] hover:text-[#f85606] text-gray-700"
                }`}
                title={`Add size ${sz}`}
              >
                <span>{sz}</span>
                {isAlreadyAdded && <Check size={11} className="stroke-[3]" />}
              </button>
            );
          })}

          {/* Custom Size Input / Toggle */}
          {showCustomSize ? (
            <div className="inline-flex items-center gap-1 bg-white border border-[#f85606] rounded-lg p-0.5">
              <input
                type="text"
                placeholder="Custom Size"
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomSize())}
                className="w-24 px-2 py-1 text-xs border-0 focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCustomSize}
                className="px-2 py-1 bg-[#f85606] text-white text-xs font-bold rounded"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowCustomSize(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustomSize(true)}
              className="h-8 px-3 rounded-lg text-xs font-bold border border-dashed border-gray-300 hover:border-gray-400 bg-white text-gray-600 transition flex items-center gap-1"
            >
              <Plus size={13} />
              <span>Custom Size</span>
            </button>
          )}
        </div>
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoGenerateAllSKUs}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-gray-100 border border-gray-300 font-bold rounded-lg transition shadow-2xs text-gray-700"
            >
              <Sparkles size={13} className="text-amber-500" />
              <span>Auto SKUs</span>
            </button>

            <button
              type="button"
              onClick={() => onVariantsChange([])}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold rounded-lg transition"
            >
              <Trash2 size={13} />
              <span>Clear All</span>
            </button>
          </div>
        </div>
      )}

      {/* VARIANTS LIST / MATRIX */}
      {variants.length === 0 ? (
        <div className="text-center py-12 px-6 bg-gray-50/70 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#f85606] flex items-center justify-center mx-auto mb-3">
            <Layers size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-900 mb-1">
            No Variants Created Yet
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto mb-4">
            Click <strong>M</strong> or <strong>L</strong> above to add sizes, or click <strong>+ Add Variant</strong> to build custom variants.
          </p>
          <button
            type="button"
            onClick={handleAddSingleVariant}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#f85606] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition hover:bg-[#ea4e03]"
          >
            <Plus size={16} />
            <span>Add First Variant</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 px-1 uppercase tracking-wider">
            <span>Configured Variants ({variants.length})</span>
            <span>Total Quantity: {variants.reduce((acc, v) => acc + (parseInt(String(v.stock)) || 0), 0)}</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {variants.map((v, idx) => {
              const colorName = getColorName(v);
              const colorHex = getColorHex(v);
              const sizeName = getSizeName(v);
              const photo = v.images?.[0]?.url || v.imageUrl;
              const isUploadingThis = uploadingIdx === idx;

              return (
                <div
                  key={idx}
                  className="p-3.5 sm:p-4 rounded-xl border border-gray-200 bg-white shadow-2xs hover:border-gray-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Photo + Color/Size Identifier */}
                  <div className="flex items-center gap-3.5">
                    {/* Photo Box */}
                    <div className="relative group shrink-0">
                      <div
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center overflow-hidden cursor-pointer bg-gray-50 transition ${
                          photo
                            ? "border-orange-500 shadow-2xs"
                            : "border-dashed border-gray-300 hover:border-[#f85606] text-gray-400 hover:text-[#f85606]"
                        }`}
                        title="Click to upload/change variant photo"
                      >
                        {isUploadingThis ? (
                          <CircularProgress size={18} sx={{ color: "#f85606" }} />
                        ) : photo ? (
                          <img src={photo} alt="" className="w-full h-full object-cover" />
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

                    {/* Variant Badge & Inputs */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Size Pill */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-gray-500">Size:</span>
                          <input
                            type="text"
                            placeholder="e.g. M, L"
                            value={v.sizeName || sizeName}
                            onChange={(e) => {
                              handleUpdateField(idx, "sizeName", e.target.value);
                              // Clear sizeId so custom sizeName takes priority
                              handleUpdateField(idx, "sizeId", "");
                            }}
                            className="w-20 px-2 py-0.5 text-xs font-bold border border-gray-300 rounded-lg text-gray-900 focus:border-[#f85606]"
                          />
                        </div>

                        {/* Color Selector / Input */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-500">Color:</span>
                          <select
                            value={v.colorId || ""}
                            onChange={(e) => handleUpdateField(idx, "colorId", e.target.value)}
                            className="px-2 py-0.5 text-xs font-semibold border border-gray-300 rounded-lg text-gray-800 bg-white focus:border-[#f85606]"
                          >
                            <option value="">None / Custom</option>
                            {colors.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          {/* Or Custom Color Text */}
                          {!v.colorId && (
                            <input
                              type="text"
                              placeholder="Color name"
                              value={v.colorName || ""}
                              onChange={(e) =>
                                handleUpdateField(idx, "colorName", e.target.value)
                              }
                              className="w-24 px-2 py-0.5 text-xs border border-gray-300 rounded-lg text-gray-800 focus:border-[#f85606]"
                            />
                          )}

                          {colorHex && colorHex !== "#cbd5e1" && (
                            <span
                              className="w-4 h-4 rounded-full border border-gray-300 shadow-2xs shrink-0"
                              style={{ backgroundColor: colorHex }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Display Label */}
                      <p className="text-[11px] text-gray-400 font-mono">
                        Variant #{idx + 1}: {colorName ? `${colorName} / ` : ""}{sizeName || "Universal"}
                      </p>
                    </div>
                  </div>

                  {/* Right: SKU, Price, Stock, Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* SKU */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">SKU</span>
                      <input
                        type="text"
                        placeholder="SKU"
                        value={v.sku || ""}
                        onChange={(e) => handleUpdateField(idx, "sku", e.target.value)}
                        className="w-28 px-2 py-1 text-xs font-mono border border-gray-300 rounded-lg focus:border-[#f85606]"
                      />
                    </div>

                    {/* Price */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Price (£)</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={v.price}
                        onChange={(e) => handleUpdateField(idx, "price", e.target.value)}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded-lg text-right focus:border-[#f85606]"
                      />
                    </div>

                    {/* Stock */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Stock</span>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={v.stock}
                        onChange={(e) => handleUpdateField(idx, "stock", e.target.value)}
                        className="w-18 px-2 py-1 text-xs border border-gray-300 rounded-lg text-right focus:border-[#f85606]"
                      />
                    </div>

                    {/* Status Toggle */}
                    <button
                      type="button"
                      onClick={() => handleUpdateField(idx, "isActive", !v.isActive)}
                      className={`p-2 rounded-lg transition cursor-pointer mt-3.5 ${
                        v.isActive !== false
                          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                          : "text-gray-300 bg-gray-100 hover:bg-gray-200"
                      }`}
                      title={v.isActive !== false ? "Active variant" : "Inactive variant"}
                    >
                      {v.isActive !== false ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>

                    {/* Duplicate */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateVariant(idx)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer mt-3.5"
                      title="Duplicate variant"
                    >
                      <Copy size={15} />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer mt-3.5"
                      title="Remove variant"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddSingleVariant}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-dashed border-gray-300 hover:border-[#f85606] text-gray-600 hover:text-[#f85606] text-xs font-bold transition cursor-pointer bg-white"
            >
              <Plus size={14} />
              <span>Add Another Variant</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
