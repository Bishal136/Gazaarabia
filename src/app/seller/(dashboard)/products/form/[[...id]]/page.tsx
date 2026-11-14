"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Check, ImageIcon, Info, DollarSign, Shirt, Eye, AlertCircle, ShoppingBag, ChevronRight, ChevronLeft, Sparkles, Tag, X, Plus } from "lucide-react";
import PopupAlert from "@/components/PopupAlert";
import AlertMessage from "@/components/AlertMessage";
import { PopUpInterface, AlertInterface } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { productService } from "@/lib/services/seller/productService";
import { brandService } from "@/lib/services/brandService";
import { categoryService } from "@/lib/services/categoryService";
import { subcategoryService } from "@/lib/services/subcategoryService";
import { colorService } from "@/lib/services/colorService";
import { sizeService } from "@/lib/services/sizeService";

import { TextField, MenuItem, Box, Button, Popover } from "@mui/material";
import { ROUTES } from "@/constants/routes";
import RichTextEditor from "@/components/RichTextEditor";
import { MediaUploader } from "@/components/seller/MediaUploader";
import { VariantVideoUploader } from "@/components/seller/VariantVideoUploader";
import { VariantsTikTokStyle } from "@/components/seller/VariantsTikTokStyle";
// import { ProductPreviewCard } from "@/components/seller/ProductPreviewCard";

function ProductFormContent() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const token: any = session?.user?.token;
  const id = params?.id?.[0];
  const isEditMode = Boolean(id);

  const allowedRoles = ["seller"];

  useEffect(() => {
    if (!session) return;
    if (status === "authenticated" && !allowedRoles.includes(session?.user?.role)) {
      router.replace(ROUTES.HOME);
    }
  }, [session, router]);

  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    description: "",
    fitType: "",
    materialCareId: "",
    tags: [] as string[],
    soldCount: "",
    costPrice: "",
    sellingPrice: "",
    discountPrice: "",
    baseQty: "",
    barcode: "",
    brandId: "",
    categoryId: "",
    subcategoryId: "",
    active: true,
  });

  const [tagInput, setTagInput] = useState("");

  const [images, setImages] = useState<any[]>([]);
  const [productVideo, setProductVideo] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);

  const [brands, setBrands] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [sizes, setSizes] = useState<any[]>([]);
  const [allSubcategories, setAllSubcategories] = useState<any[]>([]);
  const [categoryAnchorEl, setCategoryAnchorEl] = useState<null | HTMLElement>(null);
  const [hoveredCategory, setHoveredCategory] = useState<any | null>(null);
  const [drillDownCategory, setDrillDownCategory] = useState<any | null>(null);

  const [wearWith, setWearWith] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [alertMessage, setAlertMessage] = useState<AlertInterface>({
    isOpen: false,
    type: "",
    message: "",
  });

  const [popup, setPopup] = useState<PopUpInterface>({
    isOpen: false,
    type: "",
    message: "",
  });

  const fieldStyle = {
  
    "& .MuiOutlinedInput-root": {
      borderRadius: "0.5rem",
      backgroundColor: "#f9fafb",
      "&:hover fieldset": {
        borderColor: "#cbd5e1",
      },
    },
    "& .MuiOutlinedInput-root.Mui-focused fieldset": {
      borderColor: "var(--brand-secondary, #2563eb)",
      borderWidth: "2px",
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "var(--brand-secondary, #2563eb)",
    },
  };

  const fetchDropdownData = async () => {
    try {
      const [
        brandsData,
        categoriesData,
        subcatData,
        colorsData,
        sizesData,
      ]: any = await Promise.all([
        brandService.getAll(token),
        categoryService.getAll(token),
        subcategoryService.getAll(token),
        colorService.getAll(token),
        sizeService.getAll(token),
      ]);

      setBrands(brandsData.data ?? brandsData);
      setCategories(categoriesData.data ?? categoriesData);
      const subList = subcatData.data ?? subcatData;
      setSubcategories(subList);
      setAllSubcategories(subList);
      setColors(colorsData.data ?? colorsData);
      setSizes(sizesData.data ?? sizesData);
    } catch {
      setAlertMessage({
        isOpen: true,
        type: "error",
        message: "Failed to load dropdown data.",
      });
    }
  };

  const fetchProduct = async () => {
    try {
      const res = await productService.getById(token!, Number(id));
      const data = res?.data ?? null;
      setForm({
        title: data.title || "",
        shortDescription: data.shortDescription || "",
        description: data.description || "",
        fitType: data.fitType || "",
        soldCount: data.soldCount || "",
        materialCareId: data.materialCareId || "",
        tags: Array.isArray(data.tags)
          ? data.tags
          : typeof data.tags === "string" && data.tags
          ? data.tags.split(",").map((t: string) => t.trim().replace(/^#+/, "")).filter(Boolean)
          : [],
        costPrice: data.costPrice || "",
        sellingPrice: data.sellingPrice || "",
        discountPrice: data.discountPrice || "",
        baseQty: data.baseQty || "",
        barcode: data.barcode || "",
        brandId: data.brandId?.toString() || "",
        categoryId: data.categoryId?.toString() || "",
        subcategoryId: data.subcategoryId?.toString() || "",
        active: data.active ?? true,
      });

      setImages(data.productimage || []);
      setProductVideo({
        url: data.videoUrl || "",
        thumbnail: data.videoThumbnail || "",
      });
      setVariants(
        (data.productvariant || []).map((v: any) => ({
          ...v,
          images: v.variantImages || [],
        }))
      );
      setWearWith(data.wearWith || []);
    } catch {
      setAlertMessage({
        isOpen: true,
        type: "error",
        message: "Failed to load product.",
      });
    }
  };

  useEffect(() => {
    if (token) {
      fetchDropdownData();
      if (isEditMode) fetchProduct();
    }
  }, [token, id]);

  const handleInputChange = async (e: any) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (name === "categoryId") {
      setForm((prev) => ({ ...prev, subcategoryId: "" }));
      if (value) {
        try {
          const res: any = await subcategoryService.getByCategory(token, Number(value));
          setSubcategories(res.data ?? []);
        } catch {
          setSubcategories([]);
        }
      } else {
        setSubcategories([]);
      }
    }
  };

  const handleAddTag = (rawTag?: string) => {
    const raw = rawTag !== undefined ? rawTag : tagInput;
    const clean = raw.trim().replace(/^#+/, "");
    if (!clean) return;

    if (form.tags.length >= 5) {
      setAlertMessage({
        isOpen: true,
        type: "error",
        message: "You can add a maximum of 5 tags.",
      });
      return;
    }

    if (form.tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setAlertMessage({
        isOpen: true,
        type: "error",
        message: `Tag "${clean}" has already been added.`,
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      tags: [...prev.tags, clean],
    }));
    setTagInput("");
  };

  const handleRemoveTag = (indexToRemove: number) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Pricing handlers
  const handleRegularPriceChange = (val: string) => {
    setForm((prev) => {
      const updated = { ...prev, sellingPrice: val };
      if (variants.length > 0) {
        setVariants((vList) =>
          vList.map((v) => ({
            ...v,
            compareAtPrice: prev.discountPrice && Number(prev.discountPrice) < Number(val) ? val : undefined,
          }))
        );
      }
      return updated;
    });
  };

  const handleDiscountPriceChange = (val: string) => {
    setForm((prev) => {
      const updated = { ...prev, discountPrice: val };
      const reg = parseFloat(prev.sellingPrice);
      const disc = parseFloat(val);
      if (variants.length > 0) {
        if (!isNaN(reg) && reg > 0 && !isNaN(disc) && disc > 0 && disc < reg) {
          setVariants((vList) =>
            vList.map((v) => ({
              ...v,
              price: val,
              compareAtPrice: prev.sellingPrice,
            }))
          );
        } else if (!val || isNaN(disc) || disc <= 0) {
          setVariants((vList) =>
            vList.map((v) => ({
              ...v,
              price: prev.sellingPrice,
              compareAtPrice: undefined,
            }))
          );
        }
      }
      return updated;
    });
  };

  // Calculate total quantity from all variants (supports multi-color and multi-size variants)
  const calculateTotalVariantQuantity = () => {
    return variants.reduce((total, v) => {
      const qty = parseInt(String(v.stock)) || 0;
      const cCount = (v.colorName || "").split(",").map((c: string) => c.trim()).filter(Boolean).length || 1;
      const sCount = (v.sizeName || "").split(",").map((s: string) => s.trim()).filter(Boolean).length || 1;
      return total + (qty * cCount * sCount);
    }, 0);
  };

  // Auto-fill base quantity from variants
  const handleAutoFillBaseQty = () => {
    const totalQty = calculateTotalVariantQuantity();
    if (totalQty > 0) {
      setForm((prev) => ({ ...prev, baseQty: totalQty.toString() }));
      setAlertMessage({
        isOpen: true,
        type: "success",
        message: `Base quantity auto-filled: ${totalQty} (sum of all variant quantities)`,
      });
    } else {
      setAlertMessage({
        isOpen: true,
        type: "error",
        message: "No variants with stock quantities found. Please add variant quantities first.",
      });
    }
  };


  const handleSubmit = async (e: any) => {
    e.preventDefault();

    if (images.length === 0) {
      setPopup({
        isOpen: true,
        type: "error",
        message: "Please upload at least one main product image.",
      });
      return;
    }

    if (!form.title || !form.description || !form.brandId || !form.categoryId) {
      setPopup({
        isOpen: true,
        type: "error",
        message: "Please fill in all basic product information.",
      });
      return;
    }

    if (variants.length === 0) {
      setPopup({
        isOpen: true,
        type: "error",
        message: "Please add at least one product variant.",
      });
      return;
    }

    // Validate each variant
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const errors: string[] = [];

      const hasColor = Boolean(v.colorId || v.colorName);
      const hasSize = Boolean(v.sizeId || v.sizeName);
      if (!hasColor && !hasSize) {
        errors.push("Color or Size option");
      }
      if (!v.price) errors.push("Price");
      if (v.stock === "" || v.stock === undefined) errors.push("Stock");
      if (!v.images || v.images.length === 0) {
        if (images && images.length > 0) {
          // Auto-fallback to product-level photos
          v.images = images.map((img: any) => ({
            url: typeof img === "string" ? img : img.url,
            alt: form.title || "",
          }));
          v.imageUrl = v.images[0]?.url || null;
        } else {
          errors.push("Images");
        }
      }

      if (errors.length > 0) {
        setPopup({
          isOpen: true,
          type: "error",
          message: `Variant #${i + 1}: Missing ${errors.join(", ")}`,
        });
        return;
      }
    }

    if (!form.costPrice || !form.sellingPrice || !form.baseQty) {
      setPopup({
        isOpen: true,
        type: "error",
        message: "Please fill in all required pricing and inventory details.",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Expand any variant with multiple comma-separated colors or sizes into individual SKU combinations
      const expandedVariants: any[] = [];
      for (const v of variants) {
        const colorNames = (v.colorName || "")
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean);
        const sizeNames = (v.sizeName || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);

        const effectiveColors = colorNames.length > 0 ? colorNames : [v.colorName || ""];
        const effectiveSizes = sizeNames.length > 0 ? sizeNames : [v.sizeName || ""];

        for (const cName of effectiveColors) {
          for (const sName of effectiveSizes) {
            const cleanTitle = (form.title || "GZ")
              .split(" ")
              .slice(0, 2)
              .map((w: string) => w.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase())
              .join("-") || "GZ";
            const cleanColor = cName ? cName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() : "";
            const cleanSize = sName ? sName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() : "";
            const autoSku = [cleanTitle, cleanColor, cleanSize].filter(Boolean).join("-");

            const regPrice = parseFloat(form.sellingPrice || "0");
            const discPrice = parseFloat(form.discountPrice || "0");
            const hasPromo = discPrice > 0 && regPrice > discPrice;

            expandedVariants.push({
              ...v,
              price: v.price || (hasPromo ? form.discountPrice : form.sellingPrice),
              compareAtPrice: v.compareAtPrice || (hasPromo ? form.sellingPrice : undefined),
              colorId: colorNames.length > 1 ? "" : v.colorId,
              colorName: cName,
              sizeId: sizeNames.length > 1 ? "" : v.sizeId,
              sizeName: sName,
              sku: effectiveColors.length === 1 && effectiveSizes.length === 1 && v.sku ? v.sku : autoSku,
            });
          }
        }
      }

      const payload = {
        ...form,
        images,
        variants: expandedVariants,
        wearWith: wearWith.map((w) => w.id),
        videoUrl: productVideo?.url || "",
        videoThumbnail: productVideo?.thumbnail || "",
      };

      if (isEditMode) {
        await productService.update(token!, Number(id), payload);
        setAlertMessage({
          isOpen: true,
          type: "success",
          message: "Product updated successfully!",
        });
      } else {
        await productService.create(token!, payload);
        setAlertMessage({
          isOpen: true,
          type: "success",
          message: "Product published successfully!",
        });
      }

      setTimeout(() => router.push("/seller/products"), 1200);
    } catch (err: any) {
      setAlertMessage({
        isOpen: true,
        type: "error",
        message: err.message || "Failed to save product.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchProducts = async () => {
    if (!searchQuery.trim()) return;
    try {
      setIsSearching(true);
      const res = await productService.getAll(token, { search: searchQuery });
      const products = res.data ?? [];
      setSearchResults(products.filter((p: any) => p.id !== Number(id)));
    } catch {
      setAlertMessage({
        isOpen: true,
        type: "error",
        message: "Failed to search products.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddWearWith = (product: any) => {
    if (!wearWith.find((p) => p.id === product.id)) {
      setWearWith((prev) => [...prev, product]);
    }
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleRemoveWearWith = (productId: number | string) => {
    setWearWith((prev) => prev.filter((p) => p.id !== productId));
  };

  const RequiredLabel = ({ text }: { text: string }) => (
    <span className="font-medium text-gray-700">{text} <span className="text-red-500">*</span></span>
  );

  return (
    <Box className="min-h-screen bg-[#F5F5F5] pb-24">
      {/* Top Banner */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-auto sm:h-16 py-3 sm:py-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-blue-600" size={20} />
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {isEditMode ? "Update Product" : "Publish New Product"}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button
              variant="outlined"
              onClick={() => router.push("/seller/products")}
              fullWidth
              sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600, borderColor: '#E2E8F0', color: '#64748B', py: 1 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              fullWidth
              disabled={submitting}
              sx={{ background: "var(--brand-secondary, #2563eb)", textTransform: 'none', borderRadius: '8px', fontWeight: 600, boxShadow: 'none', py: 1 }}
            >
              {submitting ? "..." : isEditMode ? "Update" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-8">
        {alertMessage.isOpen && alertMessage.type && (
          <AlertMessage
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage((p) => ({ ...p, isOpen: false }))}
          />
        )}

        <div className="w-full max-w-5xl mx-auto space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">

              {/* MEDIA */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="mb-6 flex items-start sm:items-center gap-2">
                  <ImageIcon className="text-blue-600 mt-1 sm:mt-0" size={24} />
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Product Media</h2>
                    <p className="text-sm text-gray-500 mt-1">Upload high-quality images and video to showcase your product.</p>
                  </div>
                </div>

                {/* Images Section */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Product Images</h3>
                  <MediaUploader
                    images={images}
                    onImagesChange={setImages}
                    onError={(msg) =>
                      setAlertMessage({ isOpen: true, type: "error", message: msg })
                    }
                    maxImages={10}
                  />
                </div>

                {/* Video Section */}
                <div className="mb-8 pb-8 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Product Video & Video Link (Optional)</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Upload a high-resolution product showcase video (up to 1GB) or paste a video link (YouTube, Vimeo, CDN).
                  </p>
                  <VariantVideoUploader
                    videoUrl={productVideo?.url || ""}
                    videoThumbnail={productVideo?.thumbnail}
                    onVideoChange={(url) => setProductVideo((prev: any) => ({ ...prev, url }))}
                    onVideoThumbnailChange={(thumb) => setProductVideo((prev: any) => ({ ...prev, thumbnail: thumb }))}
                    onError={(msg) =>
                      setAlertMessage({ isOpen: true, type: "error", message: msg })
                    }
                    variantLabel="Product"
                  />
                </div>

                <div className="bg-blue-50/50 rounded-xl p-4 flex gap-3 items-start border border-blue-100">
                  <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Media Guidelines</p>
                    <ul className="list-disc pl-4 space-y-1 text-blue-800/80">
                      <li>First image will be the product cover.</li>
                      <li>Use clear, well-lit photos with a clean background.</li>
                      <li>Recommended resolution: 1080x1080px (1:1 ratio).</li>
                      <li>Video must be under 1GB (MP4, WebM, MOV) or a valid video link (YouTube, Vimeo, direct URL).</li>
                    </ul>
                  </div>
                </div>



              </div>

              {/* BASIC INFO */}
              <div className="space-y-6">
                {/* Product Details Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-8">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Info className="text-blue-600" size={24} />
                    Product Details
                  </h2>

                  <div className="space-y-6">
                    <TextField
                      label={<RequiredLabel text="Product Name" />}
                      name="title"
                      value={form.title}
                      onChange={handleInputChange}
                      fullWidth
                      sx={fieldStyle}
                      placeholder="e.g., Premium Cotton T-Shirt"
                    />

                    <div className="relative">
                      <TextField
                        label={<RequiredLabel text="Category & Subcategory" />}
                        value={(() => {
                          const sub = allSubcategories.find((s) => String(s.id) === String(form.subcategoryId));
                          const cat = categories.find((c) => String(c.id) === String(sub?.categoryId));
                          // return cat && sub ? `${cat.name} - ${sub.name}` : "";
                          const catDisplay = cat ? (cat.submenu?.menu?.name ? `${cat.submenu.menu.name} > ${cat.name}` : cat.name) : "";
                          return catDisplay && sub ? `${catDisplay} > ${sub.name}` : "";
                        })()}
                        onClick={(e) => setCategoryAnchorEl(e.currentTarget)}
                        fullWidth
                        autoComplete="off"
                        sx={fieldStyle}
                        placeholder="Select Category & Subcategory"
                        InputProps={{
                          readOnly: true,
                          endAdornment: <ChevronRight size={18} className={`text-gray-400 transition-transform ${categoryAnchorEl ? 'rotate-90' : ''}`} />,
                          sx: { cursor: 'pointer', '& input': { cursor: 'pointer' } }
                        }}
                      />

                      <Popover
                        open={Boolean(categoryAnchorEl)}
                        anchorEl={categoryAnchorEl}
                        onClose={() => setCategoryAnchorEl(null)}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'left',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'left',
                        }}
                        PaperProps={{
                          sx: {
                            mt: 1,
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                            borderRadius: '12px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            width: { xs: 'calc(100vw - 32px)', sm: '500px' }, // Total width for two columns
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' }
                          }
                        }}
                      >
                        {/* Categories Column */}
                        <div className="w-full sm:w-1/2 border-r border-slate-100 py-2 bg-slate-50 overflow-y-auto max-h-[300px] sm:max-h-[400px]">
                          <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categories</p>
                          {[...categories].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((cat) => (
                            <div
                              key={cat.id}
                              onMouseEnter={() => setHoveredCategory(cat)}
                              onClick={() => {
                                // On mobile, clicking a category should also set it for subcategory view
                                setHoveredCategory(cat);
                              }}
                              className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${hoveredCategory?.id === cat.id
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                              {/* <span className="text-sm font-medium">{cat.name}</span> */}
                              <span className="text-sm font-medium">
                                {cat.name}{cat.submenu?.menu?.name ? ` - ${cat.submenu.menu.name}` : ""}
                              </span>
                              <ChevronRight size={14} className={hoveredCategory?.id === cat.id ? 'text-white' : 'text-slate-400'} />
                            </div>
                          ))}
                        </div>

                        {/* Subcategories Column */}
                        <div className="w-full sm:w-1/2 py-2 bg-white overflow-y-auto max-h-[300px] sm:max-h-[400px]">
                          {hoveredCategory ? (
                            <>
                              <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {hoveredCategory.name} Subcategories
                              </p>
                              {allSubcategories
                                .filter((s) => String(s.categoryId) === String(hoveredCategory.id))
                                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                                .map((sub) => (
                                  <div
                                    key={sub.id}
                                    onClick={() => {
                                      setForm((prev) => ({
                                        ...prev,
                                        subcategoryId: String(sub.id),
                                        categoryId: String(sub.categoryId),
                                      }));
                                      setCategoryAnchorEl(null);
                                    }}
                                    className="px-4 py-2.5 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 cursor-pointer transition-colors"
                                  >
                                    {sub.name}
                                  </div>
                                ))}
                              {allSubcategories.filter((s) => String(s.categoryId) === String(hoveredCategory.id)).length === 0 && (
                                <div className="px-4 py-8 text-center text-slate-400 text-sm">
                                  No subcategories found
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="h-full flex items-center justify-center p-8 text-center text-slate-400 text-sm italic">
                              Hover over a category to see subcategories
                            </div>
                          )}
                        </div>
                      </Popover>
                    </div>

                    <TextField
                      label={<RequiredLabel text="Brand" />}
                      select
                      name="brandId"
                      value={form.brandId}
                      onChange={handleInputChange}
                      fullWidth
                      sx={fieldStyle}
                    >
                      {brands.map((b) => (
                        <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                      ))}
                    </TextField>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Specifications (Add 4 or 5 key Benefits and Features) <span className="text-red-500">*</span></label>
                      <RichTextEditor
                        value={form.shortDescription}
                        onChange={(value) => setForm((prev) => ({ ...prev, shortDescription: value }))}
                        minHeight={250}
                        placeholder="Brief summary for specifications..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Full Description <span className="text-red-500">*</span></label>
                      <RichTextEditor
                        value={form.description}
                        onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
                        minHeight={400}
                        placeholder="Detailed features, materials..."
                      />
                    </div>

                    {/* Product Tags (Replaced Material & Care Guide) */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          <Tag size={16} className="text-gray-500" />
                          <span>Product Tags</span>
                          <span className="text-xs text-gray-400 font-normal">(Max 5 tags)</span>
                        </label>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full transition-colors ${
                            form.tags.length >= 5
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                          }`}
                        >
                          {form.tags.length}/5 tags
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            disabled={form.tags.length >= 5}
                            placeholder={
                              form.tags.length >= 5
                                ? "Maximum 5 tags reached"
                                : "Type a tag and press Enter or comma (e.g. Cotton, Summer, Casual)..."
                            }
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-[#f9fafb] text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-secondary,#2563eb)] focus:border-transparent transition disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddTag()}
                          disabled={form.tags.length >= 5 || !tagInput.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs"
                        >
                          <Plus size={14} />
                          <span>Add</span>
                        </button>
                      </div>

                      {/* Tag Chips */}
                      {form.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {form.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 group hover:border-gray-300 transition"
                            >
                              <span className="text-gray-400 font-semibold">#</span>
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(idx)}
                                className="text-gray-400 hover:text-red-600 rounded-full p-0.5 hover:bg-white transition"
                                title="Remove tag"
                              >
                                <X size={13} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-400">
                        Add up to 5 keywords to help customers find your product in search. Press Enter or comma to add.
                      </p>
                    </div>


                    {/* </div> */}
                  </div>
                </div>

              </div>

              {/* VARIANTS - TikTok Style Manager */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <VariantsTikTokStyle
                  variants={variants}
                  onVariantsChange={setVariants}
                  colors={colors}
                  sizes={sizes}
                  basePrice={form.discountPrice && Number(form.discountPrice) < Number(form.sellingPrice) ? form.discountPrice : form.sellingPrice}
                  productTitle={form.title}
                  onError={(msg) =>
                    setAlertMessage({
                      isOpen: true,
                      type: "error",
                      message: msg,
                    })
                  }
                />
              </div>

              {/* PRICING */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="text-blue-600" size={24} />
                    Pricing & Inventory
                  </h2>
                  <p className="text-gray-500 mt-1">Set your base product pricing, promotional discounts, and tracking information.</p>
                </div>

                {/* 1. Base Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <TextField
                    label={<RequiredLabel text="Regular Price (RRP)" />}
                    name="sellingPrice"
                    type="number"
                    value={form.sellingPrice}
                    onChange={(e) => handleRegularPriceChange(e.target.value)}
                    inputProps={{ step: "0.01", min: "0" }}
                    fullWidth
                    sx={fieldStyle}
                    helperText="Original retail price (shown strikethrough when discounted)"
                    InputProps={{
                      startAdornment: <span className="text-gray-500 mr-2 font-semibold">£</span>,
                    }}
                  />

                  <TextField
                    label="Sale / Discount Price (Optional)"
                    name="discountPrice"
                    type="number"
                    value={form.discountPrice}
                    onChange={(e) => handleDiscountPriceChange(e.target.value)}
                    inputProps={{ step: "0.01", min: "0" }}
                    fullWidth
                    sx={fieldStyle}
                    helperText="Promotional price customer pays"
                    InputProps={{
                      startAdornment: <span className="text-gray-500 mr-2 font-semibold">£</span>,
                    }}
                  />
                </div>

                {/* 2. Cost Price & Barcode */}
                <div className="pt-6 mt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <TextField
                      label={<RequiredLabel text="Cost Price" />}
                      name="costPrice"
                      type="number"
                      value={form.costPrice}
                      onChange={handleInputChange}
                      inputProps={{ step: "0.01", min: "0" }}
                      fullWidth
                      sx={fieldStyle}
                      helperText="Your wholesale / production cost (private to you)"
                      InputProps={{
                        startAdornment: <span className="text-gray-500 mr-2 font-semibold">£</span>,
                      }}
                    />
                  </div>

                  <div>
                    <TextField
                      label="Barcode (EAN/UPC)"
                      name="barcode"
                      value={form.barcode}
                      onChange={handleInputChange}
                      fullWidth
                      sx={fieldStyle}
                      helperText="Optional inventory barcode or UPC number"
                    />
                  </div>
                </div>

                {/* 4. Base Inventory & Variant Quantities */}
                <div className="pt-6 mt-6 border-t border-gray-100">
                  <div className="max-w-md">
                    <div className="flex items-end gap-2 mb-2">
                      <div className="flex-1">
                        <TextField
                          label={<RequiredLabel text="Base Quantity" />}
                          name="baseQty"
                          type="number"
                          value={form.baseQty}
                          onChange={handleInputChange}
                          inputProps={{ min: "0" }}
                          fullWidth
                          sx={fieldStyle}
                          helperText="Initial stock level for base product"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={handleAutoFillBaseQty}
                        size="small"
                        sx={{
                          borderRadius: "6px",
                          textTransform: "none",
                          fontWeight: 600,
                          borderColor: "#cbd5e1",
                          color: "#475569",
                          whiteSpace: "nowrap",
                          mb: 0.5,
                        }}
                      >
                        Auto Fill
                      </Button>
                    </div>

                    {/* Variant Quantity Breakdown */}
                    {variants.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-2">
                          Variant Quantities: {calculateTotalVariantQuantity()} total
                        </p>
                        <div className="text-xs text-blue-800 space-y-1.5 max-h-32 overflow-y-auto">
                          {variants.map((v, idx) => {
                            const colorName = v.colorName || colors.find((c) => String(c.id) === String(v.colorId))?.name || "Universal";
                            const sizeName = v.sizeName || sizes.find((s) => String(s.id) === String(v.sizeId))?.name || "Universal";
                            const qty = parseInt(String(v.stock)) || 0;
                            const cCount = (v.colorName || "").split(",").map((c: string) => c.trim()).filter(Boolean).length || 1;
                            const sCount = (v.sizeName || "").split(",").map((s: string) => s.trim()).filter(Boolean).length || 1;
                            const totalCombos = cCount * sCount;
                            const totalQty = qty * totalCombos;
                            return (
                              <div key={idx} className="flex justify-between items-center text-xs py-0.5 border-b border-blue-100 last:border-0">
                                <span>
                                  {colorName} - {sizeName}
                                  {totalCombos > 1 && (
                                    <span className="text-[10px] text-blue-600 font-bold ml-1.5">
                                      ({totalCombos} combos × {qty})
                                    </span>
                                  )}
                                </span>
                                <span className="font-bold">{totalQty}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>



              {/* Form Navigation (Bottom) */}
              <div className="mt-8 flex items-center justify-end border-t border-gray-200 pt-6">
                <div className="flex gap-4">
                  <Button
                    variant="outlined"
                    onClick={() => router.push("/seller/products")}
                    sx={{
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 4,
                      py: 1.5,
                      borderColor: '#cbd5e1',
                      color: '#475569'
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting}
                    sx={{
                      background: "var(--brand-secondary, #2563eb)",
                      borderRadius: '8px',
                      textTransform: 'none',
                      fontWeight: 600,
                      boxShadow: 'none',
                      px: 6,
                      py: 1.5
                    }}
                  >
                    {submitting ? "Saving..." : isEditMode ? "Update Product" : "Publish Product"}
                  </Button>
                </div>
              </div>

            </form>
        </div>
      </div>

      <PopupAlert
        type={popup.type as any}
        message={popup.message}
        confirmText="OK"
        onConfirm={() => setPopup((p) => ({ ...p, isOpen: false }))}
        show={popup.isOpen}
      />

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </Box>
  );
}

export default dynamic(() => Promise.resolve(ProductFormContent), { ssr: false });
