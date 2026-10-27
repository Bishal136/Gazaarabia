"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Heart,
  Star,
  Truck,
  RefreshCw,
  Phone,
  Tag,
  Minus,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ShieldCheck,
  Sparkles,
  Store,
  Play,
  MessageCircle,
  Zap,
  Check,
  RotateCcw,
  ShoppingCart,
  ShoppingBag,
} from "lucide-react";

import HowWeDoIt from "@/components/HowWeDoIt";
import ProductSuggestions from "@/components/ProductSuggestions";
import AccordionSection from "@/components/ProductAccordian";
import { getProductBySlug } from "@/lib/services/front-end/productService";
import { wishlistService } from "@/lib/services/front-end/wishlistService";
import { cartService } from "@/lib/services/front-end/cartService";
import Loader from "@/components/Loader";
import NoData from "@/components/NoData";
import AuthPromptModal from "@/components/AuthPromptModal";
import { ROUTES } from "@/constants/routes";
import VariantWarningModal from "@/components/VariantWarningModal";
import { useCart } from "@/app/context/CartContext";
import ErrorAlert from "@/components/ErrorAlert";
import SizeGuideModal from "@/components/home/SizeGuideModal";
import { fbEvent } from "@/components/analytics/FacebookPixel";
import { gaEvent } from "@/components/analytics/GoogleAnalytics";
import { formatGBP } from "@/lib/utils/shipping";

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token: any = session?.user?.token || null;

  const [product, setProduct] = useState<any>(null);
  const [wishlist, setWishlist] = useState<boolean>(false);
  const [addingToCart, setAddingToCart] = useState<boolean>(false);
  const [activeThumb, setActiveThumb] = useState<number>(0);
  const [selectedColor, setSelectedColor] = useState<any>(null);
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [zoomVisible, setZoomVisible] = useState<boolean>(false);
  const [backgroundPosition, setBackgroundPosition] = useState<string>("0% 0%");
  const imgRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showVariantWarning, setShowVariantWarning] = useState<boolean>(false);
  const [images, setImages] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { refreshCart, openCartDrawer } = useCart();
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // identify the mobile or desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);


  // stop modal background scrolling
  useEffect(() => {
    document.body.style.overflow = showImageModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showImageModal]);



  //  Fetch product
  useEffect(() => {
    if (!slug || status === "loading") return;
    (async () => {
      try {
        setLoading(true);
        const data: any = await getProductBySlug(token, slug);
        setProduct(data);
        setWishlist(data?.isInWishlist || false);

        //  Find variant with images or fallback to product images
        if (Array.isArray(data.productvariant) && data.productvariant.length > 0) {
          const variantWithImages = data.productvariant.find(
            (v: any) => Array.isArray(v.variantImages) && v.variantImages.length > 0
          );

          if (variantWithImages) {
            setImages(variantWithImages.variantImages);
          } else if (Array.isArray(data.productimage) && data.productimage.length > 0) {
            setImages(data.productimage);
          } else {
            setImages([]);
          }
        } else if (Array.isArray(data.productimage) && data.productimage.length > 0) {
          setImages(data.productimage);
        } else {
          setImages([]);
        }
      } catch (err) {
        console.error("Failed to fetch product details:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, token, status]);

  const variants: any[] = Array.isArray(product?.productvariant)
    ? product.productvariant
    : [];

  const colors: any[] = Array.from(
    new Map(
      variants.filter((v) => v.color).map((v) => [v.color.id, v.color])
    ).values()
  );

  const sizes: any[] = Array.from(
    new Map(
      variants.filter((v) => v.size).map((v) => [v.size.id, v.size])
    ).values()
  );

  //  Auto select first color & size
  useEffect(() => {
    if (colors.length > 0 && !selectedColor) {
      const firstColor = colors[0];
      setSelectedColor(firstColor);

      const firstVariantForColor = variants.find(
        (v) => v.color?.id === firstColor.id && v.stock > 0
      );
      if (firstVariantForColor?.size) {
        setSelectedSize(firstVariantForColor.size);
      }
    }
    // Size-only products (no colours) — auto-select the first size so a variant resolves.
    if (sizes.length > 0 && colors.length === 0 && !selectedSize) {
      setSelectedSize(sizes[0]);
    }
  }, [colors, sizes, variants]);

  // Products with real colour/size options use the colour+size selection below.
  // Shopify-synced products have variants with no colour/size (colorId/sizeId null),
  // so there is nothing to "select" — fall back to the product's single/default variant.
  const hasVariantOptions = colors.length > 0 || sizes.length > 0;

  // Match only the dimensions the product actually exposes: colour+size, colour-only,
  // size-only, or (Shopify) neither → single/default variant.
  const selectedVariant: any = hasVariantOptions
    ? variants.find(
        (v) =>
          (colors.length === 0 || v.color?.id === selectedColor?.id) &&
          (sizes.length === 0 || v.size?.id === selectedSize?.id)
      ) || null
    : variants[0] || null;

  // Never collapse to 0 simply because no colour/size is selected. Use the selected
  // (or default) variant's stock; for option-less products fall back to the
  // product-level availableStock the API already returns.
  const availableStock =
    selectedVariant?.availableStock ??
    (hasVariantOptions ? 0 : product?.availableStock ?? 0);

  // Media Item Helper: Detect videos (.mp4, .webm, .ogg, .mov, or type: 'video')
  const isMediaVideo = (item: any): boolean => {
    if (!item) return false;
    if (item.type === "video" || item.isVideo) return true;
    const url = typeof item === "string" ? item : item.url || item.videoUrl || "";
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || url.includes("/videos/");
  };

  // Build unified media items (images and videos)
  const mediaList: {
    id: string | number;
    type: "image" | "video";
    url: string;
    alt: string;
    thumbnailUrl?: string;
  }[] = [];

  const variantVideoUrl = selectedVariant?.videoUrl || product?.videoUrl;
  if (variantVideoUrl) {
    mediaList.push({
      id: "variant-video",
      type: "video",
      url: variantVideoUrl,
      alt: `${product?.title || "Product"} Video`,
    });
  }

  images.forEach((item: any, idx: number) => {
    const url = typeof item === "string" ? item : item?.url || "";
    if (!url) return;
    if (variantVideoUrl && url === variantVideoUrl) return; // avoid duplicate

    const isVideo = isMediaVideo(item);
    mediaList.push({
      id: item.id || `media-${idx}`,
      type: isVideo ? "video" : "image",
      url,
      alt: item.alt || product?.title || `Product Media ${idx + 1}`,
      thumbnailUrl: item.thumbnailUrl || (isVideo ? undefined : url),
    });
  });

  if (mediaList.length === 0) {
    mediaList.push({
      id: "fallback-placeholder",
      type: "image",
      url: "/images/placeholder.png",
      alt: product?.title || "Product image",
    });
  }

  const safeActiveThumb =
    activeThumb >= 0 && activeThumb < mediaList.length ? activeThumb : 0;
  const currentMedia = mediaList[safeActiveThumb] || mediaList[0];
  const totalMediaCount = mediaList.length;

  const getZoomImageUrl = () => {
    if (currentMedia?.type !== "image") return null;
    return currentMedia?.url || null;
  };

  useEffect(() => {
    setActiveThumb(0);
  }, [selectedVariant]);

  const handlePrevMedia = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveThumb((prev) => (prev > 0 ? prev - 1 : Math.max(0, totalMediaCount - 1)));
  };

  const handleNextMedia = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveThumb((prev) => (prev < totalMediaCount - 1 ? prev + 1 : 0));
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!showImageModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowImageModal(false);
      else if (e.key === "ArrowLeft") handlePrevMedia();
      else if (e.key === "ArrowRight") handleNextMedia();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showImageModal, totalMediaCount]);

  // Touch Swipe Handling for Lightbox
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) {
      handleNextMedia();
    } else if (distance < -45) {
      handlePrevMedia();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Touch Swipe Handling for Mobile Main Viewer
  const mainTouchStartX = useRef<number | null>(null);
  const mainTouchEndX = useRef<number | null>(null);

  const handleMainTouchStart = (e: React.TouchEvent) => {
    mainTouchStartX.current = e.targetTouches[0].clientX;
  };

  const handleMainTouchMove = (e: React.TouchEvent) => {
    mainTouchEndX.current = e.targetTouches[0].clientX;
  };

  const handleMainTouchEnd = () => {
    if (mainTouchStartX.current === null || mainTouchEndX.current === null) return;
    const distance = mainTouchStartX.current - mainTouchEndX.current;
    if (distance > 45) {
      handleNextMedia();
    } else if (distance < -45) {
      handlePrevMedia();
    }
    mainTouchStartX.current = null;
    mainTouchEndX.current = null;
  };



  //  Color change → update images + size
  const handleColorChange = (color: any) => {
    setSelectedColor(color);
    const colorVariant = variants.find((v) => v.color?.id === color.id);

    //  Update images for selected color
    if (colorVariant?.variantImages?.length > 0) {
      setImages(colorVariant.variantImages);
      setActiveThumb(0);
    } else if (Array.isArray(product?.productimage)) {
      setImages(product.productimage);
      setActiveThumb(0);
    }

    const firstAvailableVariant = variants.find(
      (v) => v.color?.id === color.id && v.stock > 0
    );
    if (firstAvailableVariant?.size) {
      setSelectedSize(firstAvailableVariant.size);
    } else {
      setSelectedSize(null);
    }
    setQuantity(1);
  };

  const handleSizeChange = (size: any) => {
    setSelectedSize(size);
    setQuantity(1);
  };

  const handleQuantityChange = (newQty: number) => {
    if (selectedVariant && newQty > availableStock) return;
    if (newQty < 1) return;
    setQuantity(newQty);
  };

  // Check if current user is an authenticated customer
  const checkCanPurchase = (): boolean => {
    if (status === "loading") return false;

    // Must be logged in
    if (!session || !token) {
      setShowLoginModal(true);
      return false;
    }

    // Role restriction: only customer/user roles can make purchases
    const userRole = session?.user?.role?.toLowerCase();
    if (userRole && userRole !== "customer" && userRole !== "user") {
      setErrorMsg(
        "Only customer accounts can add products to the cart or place orders. Admins and sellers cannot make purchases."
      );
      return false;
    }

    return true;
  };

  const handleAddToCart = async () => {
    if (!checkCanPurchase()) return;

    // Require a selection only for the dimensions the product actually exposes.
    if (
      hasVariantOptions &&
      ((colors.length > 0 && !selectedColor) || (sizes.length > 0 && !selectedSize))
    ) {
      setShowVariantWarning(true);
      return;
    }

    if (!selectedVariant || availableStock <= 0) return;

    try {
      setAddingToCart(true);

      const productData = {
        id: product.id,
        title: product.title,
        slug: product.slug,
        availableStock: product.availableStock,
        sellingPrice: product.sellingPrice,
        productimage: product.productimage || [],
      };

      const variantData = {
        id: selectedVariant.id,
        sizeId: selectedSize?.id ?? null,
        colorId: selectedColor?.id ?? null,
        sizeName: selectedSize?.name ?? null,
        colorName: selectedColor?.name ?? null,
        hexCode: selectedColor?.hexCode ?? null,
        price: selectedVariant.price,
        availableStock: selectedVariant.availableStock,
        variantImages: selectedVariant.variantImages || [],
      };

      const res = await cartService.add(
        token,
        product.id,
        quantity,
        selectedVariant.id,
        selectedColor?.id ?? null,
        selectedSize?.id ?? null,
        productData,
        variantData
      );

      if (res?.error) {
        setErrorMsg(res.error);
        return;
      }

      // Tracking
      fbEvent("AddToCart", {
        content_ids: [product.id],
        content_name: product.title,
        content_type: "product",
        value: selectedVariant.price,
        currency: "GBP",
      });

      gaEvent("add_to_cart", "Ecommerce", product.title, selectedVariant.price);

      await refreshCart(); // instantly updates Header count
      openCartDrawer();
    } catch (err: any) {
      console.error("Failed to add to cart:", err);
      setErrorMsg(err.message || "Unexpected error occurred.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!checkCanPurchase()) return;

    if (
      hasVariantOptions &&
      ((colors.length > 0 && !selectedColor) || (sizes.length > 0 && !selectedSize))
    ) {
      setShowVariantWarning(true);
      return;
    }

    if (!selectedVariant || availableStock <= 0) return;

    try {
      setAddingToCart(true);

      const productData = {
        id: product.id,
        title: product.title,
        slug: product.slug,
        availableStock: product.availableStock,
        sellingPrice: product.sellingPrice,
        productimage: product.productimage || [],
      };

      const variantData = {
        id: selectedVariant.id,
        sizeId: selectedSize?.id ?? null,
        colorId: selectedColor?.id ?? null,
        sizeName: selectedSize?.name ?? null,
        colorName: selectedColor?.name ?? null,
        hexCode: selectedColor?.hexCode ?? null,
        price: selectedVariant.price,
        availableStock: selectedVariant.availableStock,
        variantImages: selectedVariant.variantImages || [],
      };

      const res = await cartService.add(
        token,
        product.id,
        quantity,
        selectedVariant.id,
        selectedColor?.id ?? null,
        selectedSize?.id ?? null,
        productData,
        variantData
      );

      if (res?.error) {
        setErrorMsg(res.error);
        return;
      }

      await refreshCart();
      router.push("/checkout");
    } catch (err: any) {
      console.error("Failed to proceed to checkout:", err);
      setErrorMsg(err.message || "Failed to proceed to checkout.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleChatWithSeller = () => {
    if (!token) {
      setShowLoginModal(true);
      return;
    }
    const store =
      product?.seller?.storeName ||
      product?.seller?.name ||
      product?.brand?.name ||
      "Seller 1's Shop";
    router.push(
      `/contact?inquiry=${encodeURIComponent(
        `Inquiry regarding ${product?.title} (Seller: ${store})`
      )}`
    );
  };

  // Computed Metadata & Pricing
  const displayPrice = Number(
    selectedVariant?.price || product?.discountPrice || product?.sellingPrice || 0
  );
  const originalPrice = product?.discountPrice
    ? Number(product?.sellingPrice)
    : product?.originalPrice
    ? Number(product?.originalPrice)
    : null;

  const discountPercent =
    originalPrice && originalPrice > displayPrice
      ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
      : 0;

  const avgRating = Number(
    product?.reviewsData?.averageRating || product?.averageRating || 4.0
  );
  const reviewCount = Number(
    product?.reviewsData?.totalReviews ?? product?.totalReviews ?? 1
  );
  const sellerName =
    product?.seller?.storeName ||
    product?.seller?.name ||
    product?.brand?.name ||
    "Seller 1's Shop";

  // Check if mediaList contains a video for "Watch Video" trigger
  const videoMediaIndex = mediaList.findIndex((m) => m.type === "video");
  const hasProductVideo = videoMediaIndex !== -1;

  const handleWatchVideo = () => {
    if (hasProductVideo) {
      setActiveThumb(videoMediaIndex);
      imgRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      setShowImageModal(true);
    }
  };


  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setBackgroundPosition(`${x}% ${y}%`);
  };

  return (
    <>
      {loading && <Loader />}
      {!product && !loading ? (
        <div className="mt-16 flex justify-center">
          <NoData message="No product found." />
        </div>
      ) : (
        <>
          <VariantWarningModal
            isOpen={showVariantWarning}
            onClose={() => setShowVariantWarning(false)}
          />

          {/* ========================== PRODUCT SECTION ========================== */}
          <section className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 bg-[var(--background)]">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_12px_45px_rgba(0,0,0,0.06)] p-5 sm:p-7 lg:p-9">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                {/* ========================== MEDIA GALLERY (LEFT COLUMN) ========================== */}
                <div className="relative flex flex-col md:flex-row gap-3.5 lg:gap-4 items-center md:items-start md:h-[620px] lg:h-[680px]">
                  {/* DESKTOP: VERTICAL SCROLLABLE STRIP (LEFT) | MOBILE: HORIZONTAL STRIP (BELOW) */}
                  <div className="order-2 md:order-1 flex md:flex-col gap-2.5 sm:gap-3 w-full md:w-20 lg:w-24 overflow-x-auto md:overflow-y-auto no-scrollbar shrink-0 max-h-none md:max-h-[620px] lg:max-h-[680px] py-1 px-0.5">
                    {mediaList.map((media, index) => {
                      const isActive = safeActiveThumb === index;
                      return (
                        <button
                          key={`${media.id}-${index}`}
                          type="button"
                          onClick={() => setActiveThumb(index)}
                          onMouseEnter={() => setActiveThumb(index)}
                          className={`relative w-18 h-18 sm:w-20 sm:h-20 md:w-20 md:h-20 lg:w-24 lg:h-24 aspect-square rounded-xl border-2 overflow-hidden bg-white shrink-0 cursor-pointer transition-all duration-200 group ${
                            isActive
                              ? "border-[#b08a78] ring-2 ring-[#b08a78]/30 shadow-md scale-[1.02]"
                              : "border-gray-200 hover:border-[#b08a78]/60 opacity-80 hover:opacity-100"
                          }`}
                          aria-label={`View ${media.type === "video" ? "video" : "image"} ${index + 1}`}
                        >
                          {media.type === "video" ? (
                            <div className="w-full h-full relative bg-purple-50 border border-purple-100 flex flex-col items-center justify-center gap-1">
                              <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                <Play size={12} className="fill-current ml-0.5" />
                              </div>
                              <span className="text-[10px] font-bold text-purple-700 tracking-wider">VIDEO</span>
                            </div>
                          ) : (
                            <img
                              src={media.thumbnailUrl || media.url}
                              alt={media.alt}
                              className="w-full h-full object-cover bg-white"
                              onError={(e: any) => {
                                e.currentTarget.src = "/images/placeholder.png";
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* LARGE MAIN MEDIA VIEWER */}
                  <div
                    ref={imgRef}
                    className="order-1 md:order-2 relative w-full flex-1 aspect-square sm:aspect-[4/5] md:aspect-square md:h-[620px] lg:h-[680px] rounded-2xl overflow-hidden flex items-center justify-center bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-1.5 group cursor-zoom-in select-none"
                    onMouseEnter={() => !isMobile && currentMedia?.type === "image" && setZoomVisible(true)}
                    onMouseLeave={() => !isMobile && setZoomVisible(false)}
                    onMouseMove={(e) => !isMobile && currentMedia?.type === "image" && handleMouseMove(e)}
                    onClick={() => setShowImageModal(true)}
                    onTouchStart={handleMainTouchStart}
                    onTouchMove={handleMainTouchMove}
                    onTouchEnd={handleMainTouchEnd}
                  >
                    {/* Top-Left Discount/Sale Badge */}
                    {discountPercent > 0 && (
                      <span className="absolute top-4 left-4 z-20 px-3 py-1 rounded-md bg-[var(--brand-primary)] text-white text-xs font-black uppercase tracking-wider shadow-md">
                        {discountPercent}% OFF
                      </span>
                    )}

                    {/* Fullscreen Expand Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowImageModal(true);
                      }}
                      className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white text-gray-700 hover:text-black shadow-md transition-all backdrop-blur-sm opacity-90 group-hover:opacity-100 hover:scale-105 cursor-pointer"
                      title="Expand fullscreen gallery"
                      aria-label="Expand image"
                    >
                      <Maximize2 size={18} />
                    </button>

                    {/* Video or Image Presentation */}
                    {currentMedia?.type === "video" ? (
                      <div
                        className="w-full h-full flex items-center justify-center bg-black/5 rounded-xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <video
                          key={currentMedia.url}
                          src={currentMedia.url}
                          controls
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <img
                        key={currentMedia?.url}
                        src={currentMedia?.url || "/images/placeholder.png"}
                        alt={currentMedia?.alt || product?.title || "Product image"}
                        className="max-h-full max-w-full object-contain transition-transform duration-300 rounded-xl"
                        onError={(e: any) => {
                          e.currentTarget.src = "/images/placeholder.png";
                        }}
                      />
                    )}
                  </div>

                  {/* DESKTOP HOVER-TO-ZOOM LENS WINDOW */}
                  {zoomVisible && !isMobile && currentMedia?.type === "image" && getZoomImageUrl() && (
                    <div
                      className="hidden lg:block absolute top-0 left-[calc(100%+24px)] 
                        w-[520px] h-[580px] rounded-2xl border border-gray-200 shadow-2xl bg-white 
                        bg-no-repeat bg-center z-40 pointer-events-none overflow-hidden"
                      style={{
                        backgroundImage: `url("${getZoomImageUrl()}")`,
                        backgroundPosition,
                        backgroundSize: "240%",
                      }}
                    />
                  )}
                </div>

                {/* ========================== PRODUCT DETAILS (RIGHT COLUMN) ========================== */}
                <div className="flex flex-col justify-start text-left">
                  {/* 1. SELLER BADGE */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f7f0] text-[#108a55] border border-[#d1f0e2] text-xs font-semibold w-fit mb-3 shadow-2xs">
                    <Store size={14} className="text-[#108a55] shrink-0" />
                    <span>{sellerName}</span>
                    <ShieldCheck size={14} className="text-[#108a55] shrink-0" />
                  </div>

                  {/* 2. PRODUCT TITLE */}
                  <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-gray-900 tracking-tight leading-snug mb-3">
                    {product?.title}
                  </h1>

                  {/* 3. RATINGS & VIDEO TRIGGER ROW */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={
                              i < Math.floor(avgRating)
                                ? "fill-amber-400 text-amber-400"
                                : i < avgRating
                                ? "fill-amber-400/50 text-amber-400"
                                : "text-gray-200 fill-gray-100"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {avgRating.toFixed(1)}{" "}
                        <span className="text-gray-400 font-normal">
                          ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                        </span>
                      </span>
                    </div>

                    {/* Inline 'Watch Video' pill button */}
                    <button
                      type="button"
                      onClick={handleWatchVideo}
                      className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#fbf5fe] hover:bg-[#f3e4fd] text-[#8e33e6] border border-[#ebd8fc] text-xs font-semibold transition cursor-pointer active:scale-95 shadow-2xs"
                    >
                      <Play size={10} className="fill-[#8e33e6] text-[#8e33e6] shrink-0" />
                      <span>Watch Video</span>
                    </button>
                  </div>

                  {/* 4. PRICING ROW */}
                  <div className="flex flex-wrap items-baseline gap-3 mb-2">
                    <span className="text-3xl sm:text-4xl font-black text-[#0f5145] tracking-tight">
                      {formatGBP(displayPrice)}
                    </span>
                    {originalPrice && originalPrice > displayPrice && (
                      <span className="text-xl sm:text-2xl text-gray-400 line-through font-normal">
                        {formatGBP(originalPrice)}
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span className="px-2.5 py-0.5 rounded-md bg-[#ffebee] text-[#e53935] text-xs font-bold uppercase tracking-wider">
                        Save {discountPercent}%
                      </span>
                    )}
                  </div>

                  {/* 5. STOCK PILL */}
                  <div className="mb-4">
                    {availableStock > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0] text-xs font-semibold shadow-2xs">
                        <Check size={13} className="text-[#059669] stroke-[2.5]" />
                        <span>In Stock ({availableStock} available)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold shadow-2xs">
                        <X size={13} className="stroke-[2.5]" />
                        <span>Out of Stock</span>
                      </span>
                    )}
                  </div>

                  {/* Color Selection (if variants exist) */}
                  {colors.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Colour: <span className="text-gray-900">{selectedColor?.name || "Select"}</span>
                      </h4>
                      <div className="flex gap-2 flex-wrap">
                        {colors.map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleColorChange(c)}
                            className={`w-8 h-8 rounded-full border-2 transition ${
                              selectedColor?.id === c.id
                                ? "border-[var(--brand-primary)] scale-110 ring-2 ring-[var(--brand-primary)]/20"
                                : "border-gray-300 hover:border-gray-500"
                            }`}
                            style={{ backgroundColor: c.hexCode }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Size Selection (if variants exist) */}
                  {sizes.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2 pr-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                          Size: <span className="text-gray-900">{selectedSize?.name || "Select"}</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => setShowSizeGuide(true)}
                          className="text-xs font-semibold underline underline-offset-2 text-[var(--brand-primary)] hover:opacity-80"
                        >
                          Size Guide
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map((s: any) => {
                          const variantStock = variants.find(
                            (v) =>
                              (colors.length === 0 || v.color?.id === selectedColor?.id) &&
                              v.size?.id === s.id
                          )?.stock;
                          const isAvailable = variantStock > 0;
                          const isSelected = selectedSize?.id === s.id;

                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => isAvailable && handleSizeChange(s)}
                              disabled={!isAvailable}
                              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                                isSelected
                                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-xs"
                                  : isAvailable
                                  ? "border-gray-200 bg-white hover:border-gray-400 text-gray-800"
                                  : "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                              }`}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* HORIZONTAL DIVIDER */}
                  <hr className="border-gray-100 my-5" />

                  {/* 6. PURCHASE ACTION ROW */}
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {/* Rounded Quantity Counter */}
                    <div className="flex items-center border border-gray-200 rounded-xl h-12 bg-white px-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                        className="w-9 h-full flex items-center justify-center text-gray-600 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="w-10 text-center font-bold text-sm text-gray-900 select-none">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={availableStock > 0 && quantity >= availableStock}
                        className="w-9 h-full flex items-center justify-center text-gray-600 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition"
                        aria-label="Increase quantity"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    {/* Outlined Add to Cart Button */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={availableStock <= 0 || addingToCart}
                      className="flex-1 min-w-[130px] h-12 px-5 rounded-xl border border-gray-300 hover:border-gray-900 bg-white hover:bg-gray-50 text-gray-900 text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs active:scale-[0.98]"
                    >
                      <ShoppingCart size={17} />
                      <span>{addingToCart ? "Adding..." : "Add to Cart"}</span>
                    </button>

                    {/* Filled Primary Buy Now Button */}
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={availableStock <= 0 || addingToCart}
                      className="flex-1 min-w-[130px] h-12 px-6 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
                    >
                      <Zap size={16} className="fill-white" />
                      <span>Buy Now</span>
                    </button>

                    {/* Wishlist Heart Button */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!token) {
                          setShowLoginModal(true);
                          return;
                        }
                        if (!wishlist) await wishlistService.add(token, product.id);
                        else await wishlistService.remove(token, product.id);
                        setWishlist(!wishlist);
                      }}
                      className="w-12 h-12 rounded-xl border border-gray-200 hover:border-gray-300 bg-white flex items-center justify-center text-gray-500 hover:text-rose-500 transition shrink-0 shadow-2xs"
                      aria-label="Add to wishlist"
                    >
                      <Heart
                        size={20}
                        className={
                          wishlist
                            ? "fill-rose-500 text-rose-500"
                            : "text-gray-400"
                        }
                      />
                    </button>
                  </div>

                  {/* 7. SELLER CHAT BUTTON */}
                  <button
                    type="button"
                    onClick={handleChatWithSeller}
                    className="w-full mt-2 mb-4 py-3 px-4 rounded-xl border border-[#a7f3d0] bg-[#f0fbf6] hover:bg-[#e4f7ed] text-[#065f46] text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs active:scale-[0.99]"
                  >
                    <MessageCircle size={18} className="text-[#059669] shrink-0" />
                    <span>Chat with Seller ({sellerName})</span>
                    <ShieldCheck size={16} className="text-[#059669] shrink-0" />
                  </button>

                  {/* 8. 3-COLUMN SERVICE & TRUST CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-5 border-t border-gray-100">
                    <div className="rounded-2xl border border-gray-100 bg-[#fbfcfc] hover:bg-white p-3.5 sm:p-4 flex flex-col items-center text-center gap-1 hover:shadow-xs hover:border-gray-200 transition">
                      <Truck size={20} className="text-[#059669] mb-0.5" />
                      <span className="text-xs sm:text-sm font-bold text-gray-900">Fast Delivery</span>
                      <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Within 24–48 hrs</span>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-[#fbfcfc] hover:bg-white p-3.5 sm:p-4 flex flex-col items-center text-center gap-1 hover:shadow-xs hover:border-gray-200 transition">
                      <RotateCcw size={19} className="text-[#059669] mb-0.5" />
                      <span className="text-xs sm:text-sm font-bold text-gray-900">7 Days Return</span>
                      <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Easy & Free</span>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-[#fbfcfc] hover:bg-white p-3.5 sm:p-4 flex flex-col items-center text-center gap-1 hover:shadow-xs hover:border-gray-200 transition">
                      <ShieldCheck size={20} className="text-[#059669] mb-0.5" />
                      <span className="text-xs sm:text-sm font-bold text-gray-900">100% Authentic</span>
                      <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Verified Seller</span>
                    </div>
                  </div>                         
                </div>
              </div>
            </div>
          </section>


        </>
      )}
    </>
  );
}
