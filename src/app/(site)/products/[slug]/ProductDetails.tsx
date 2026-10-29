"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  ThumbsUp,
  HelpCircle,
} from "lucide-react";

import HowWeDoIt from "@/components/HowWeDoIt";
import ProductSuggestions from "@/components/ProductSuggestions";
import AccordionSection from "@/components/ProductAccordian";
import CustomerChatDrawer from "@/components/chat/CustomerChatDrawer";
import { getProductBySlug } from "@/lib/services/front-end/productService";
import { wishlistService } from "@/lib/services/front-end/wishlistService";
import { cartService } from "@/lib/services/front-end/cartService";
import { localCartService } from "@/lib/services/front-end/localCartService";
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { refreshCart, openCartDrawer } = useCart();
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [reviewLightboxImage, setReviewLightboxImage] = useState<string | null>(null);
  const [chatDrawerOpen, setChatDrawerOpen] = useState<boolean>(false);

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
      const inStockColor =
        colors.find((c: any) =>
          variants.some(
            (v: any) =>
              (v.color?.id === c.id || v.colorId === c.id) &&
              ((v.availableStock ?? v.stock ?? 0) > 0)
          )
        ) || colors[0];

      setSelectedColor(inStockColor);

      const colorVariants = variants.filter(
        (v) => v.color?.id === inStockColor.id || v.colorId === inStockColor.id
      );

      const firstVariantForColor =
        colorVariants.find((v) => ((v.availableStock ?? v.stock ?? 0) > 0) && v.size) ||
        colorVariants[0];

      if (firstVariantForColor?.size) {
        setSelectedSize(firstVariantForColor.size);
      }
    }
    // Size-only products (no colours) — auto-select the first size so a variant resolves.
    if (sizes.length > 0 && colors.length === 0 && !selectedSize) {
      const inStockSize =
        sizes.find((s: any) =>
          variants.some(
            (v: any) =>
              (v.size?.id === s.id || v.sizeId === s.id) &&
              ((v.availableStock ?? v.stock ?? 0) > 0)
          )
        ) || sizes[0];
      setSelectedSize(inStockSize);
    }
  }, [colors, sizes, variants, selectedColor, selectedSize]);

  // Products with real colour/size options use the colour+size selection below.
  // Shopify-synced products have variants with no colour/size (colorId/sizeId null),
  // so there is nothing to "select" — fall back to the product's single/default variant.
  const hasVariantOptions = colors.length > 0 || sizes.length > 0;

  // Match only the dimensions the product actually exposes: colour+size, colour-only,
  // size-only, or (Shopify) neither → single/default variant.
  const selectedVariant: any = hasVariantOptions
    ? variants.find(
        (v) =>
          (colors.length === 0 || v.color?.id === selectedColor?.id || v.colorId === selectedColor?.id) &&
          (sizes.length === 0 || v.size?.id === selectedSize?.id || v.sizeId === selectedSize?.id)
      ) || null
    : variants[0] || null;

  // Never collapse to 0 simply because no colour/size is selected. Use the selected
  // (or default) variant's stock; for option-less products fall back to the
  // product-level availableStock the API already returns.
  const availableStock =
    selectedVariant?.availableStock ??
    (hasVariantOptions ? 0 : product?.availableStock ?? 0);

  // Base filename helper: strips timestamp prefixes to identify identical photos across uploads
  const getBaseFilename = (url?: string): string => {
    if (!url) return "";
    try {
      const filename = url.split("/").pop() || "";
      return filename.replace(/^\d+[-_]/, "").trim().toLowerCase();
    } catch {
      return "";
    }
  };

  // Media Item Helper: Detect videos (.mp4, .webm, .ogg, .mov, or type: 'video', or video service links)
  const isMediaVideo = (item: any): boolean => {
    if (!item) return false;
    if (item.type === "video" || item.isVideo) return true;
    const url = typeof item === "string" ? item : item.url || item.videoUrl || "";
    if (!url) return false;
    return (
      /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i.test(url) ||
      url.includes("/videos/") ||
      url.includes("/variant-videos/") ||
      url.includes("/uploads/videos/") ||
      url.includes("/uploads/variant-videos/") ||
      url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("vimeo.com")
    );
  };

  const getEmbedVideoUrl = (url?: string) => {
    if (!url) return null;
    try {
      if (url.includes("youtube.com/watch?v=")) {
        const videoId = url.split("watch?v=")[1]?.split("&")[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1` : null;
      }
      if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1]?.split("?")[0];
        return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1` : null;
      }
      if (url.includes("youtube.com/embed/")) {
        return url;
      }
      if (url.includes("vimeo.com/")) {
        const videoId = url.split("vimeo.com/")[1]?.split("?")[0];
        return videoId ? `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1` : null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const getYoutubeVideoId = (url?: string): string | null => {
    if (!url) return null;
    try {
      if (url.includes("youtube.com/watch?v=")) {
        return url.split("watch?v=")[1]?.split("&")[0] || null;
      }
      if (url.includes("youtu.be/")) {
        return url.split("youtu.be/")[1]?.split("?")[0] || null;
      }
      if (url.includes("youtube.com/embed/")) {
        return url.split("youtube.com/embed/")[1]?.split("?")[0] || null;
      }
    } catch {
      return null;
    }
    return null;
  };

  const getVideoThumbnailUrl = (url?: string, fallbackCover?: string): string => {
    const ytId = getYoutubeVideoId(url);
    if (ytId) {
      return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
    }
    return fallbackCover || "/images/placeholder.png";
  };

  // Build unified media items:
  // 1. VIDEO 1st with Title (if product or variant has video)
  // 2. All product images without dropping any photo
  const mediaList = useMemo(() => {
    const list: {
      id: string | number;
      type: "image" | "video";
      url: string;
      alt: string;
      thumbnailUrl?: string;
      coverImage?: string;
    }[] = [];

    const seenUrls = new Set<string>();
    const seenBaseNames = new Set<string>();

    const primaryCoverImage =
      (Array.isArray(product?.productimage) && (typeof product.productimage[0] === "string" ? product.productimage[0] : product.productimage[0]?.url)) ||
      selectedVariant?.imageUrl ||
      "/images/placeholder.png";

    // 1. VIDEO FIRST: Show video 1st with title
    const rawVideoUrl = selectedVariant?.videoUrl || product?.videoUrl;
    if (rawVideoUrl && typeof rawVideoUrl === "string" && rawVideoUrl.trim() !== "") {
      const vUrl = rawVideoUrl.trim();
      list.push({
        id: "product-video",
        type: "video",
        url: vUrl,
        alt: `${product?.title || "Product"} - Video`,
        thumbnailUrl: getVideoThumbnailUrl(vUrl, primaryCoverImage),
        coverImage: primaryCoverImage,
      });
      seenUrls.add(vUrl);
    }

    // Check if any productimage item is actually a video file
    if (Array.isArray(product?.productimage)) {
      product.productimage.forEach((item: any, idx: number) => {
        const u = typeof item === "string" ? item : item?.url;
        if (u && typeof u === "string" && isMediaVideo(u) && !seenUrls.has(u.trim())) {
          const cleanUrl = u.trim();
          list.push({
            id: item?.id || `product-video-${idx}`,
            type: "video",
            url: cleanUrl,
            alt: item?.alt || `${product?.title || "Product"} - Video`,
            thumbnailUrl: getVideoThumbnailUrl(cleanUrl, primaryCoverImage),
            coverImage: primaryCoverImage,
          });
          seenUrls.add(cleanUrl);
        }
      });
    }

    // Helper to add images without losing any photos and avoiding duplicate identical uploads
    const addImage = (url?: string, altText?: string, id?: string | number) => {
      if (!url || typeof url !== "string") return;
      const cleanUrl = url.trim();
      if (!cleanUrl || seenUrls.has(cleanUrl) || isMediaVideo(cleanUrl)) return;

      const baseName = getBaseFilename(cleanUrl);
      if (baseName && seenBaseNames.has(baseName)) return;

      list.push({
        id: id || `img-${list.length}`,
        type: "image",
        url: cleanUrl,
        alt: altText || product?.title || `Product Image ${list.length + 1}`,
        thumbnailUrl: cleanUrl,
      });
      seenUrls.add(cleanUrl);
      if (baseName) seenBaseNames.add(baseName);
    };

    // 2. ALL PRODUCT IMAGES: Ensure every image from product.productimage is included
    if (Array.isArray(product?.productimage)) {
      product.productimage.forEach((item: any, idx: number) => {
        const u = typeof item === "string" ? item : item?.url;
        addImage(u, item?.alt, item?.id || `product-img-${idx}`);
      });
    }

    // 3. ANY VARIANT IMAGES not already in product.productimage
    if (Array.isArray(product?.productvariant)) {
      product.productvariant.forEach((v: any, vIdx: number) => {
        if (v.imageUrl) {
          addImage(v.imageUrl, `${product?.title || "Product"} - ${v.color?.name || ""}`, `variant-img-${vIdx}`);
        }
        if (Array.isArray(v.variantImages)) {
          v.variantImages.forEach((vImg: any, imgIdx: number) => {
            const u = typeof vImg === "string" ? vImg : vImg?.url;
            addImage(u, vImg?.alt || `${product?.title || "Product"} - Variant`, `variant-img-${vIdx}-${imgIdx}`);
          });
        }
        if (Array.isArray(v.images)) {
          v.images.forEach((vImg: any, imgIdx: number) => {
            const u = typeof vImg === "string" ? vImg : vImg?.url;
            addImage(u, vImg?.alt || `${product?.title || "Product"} - Variant`, `variant-img-extra-${vIdx}-${imgIdx}`);
          });
        }
      });
    }

    // 4. Fallback placeholder if no media exists
    if (list.length === 0) {
      list.push({
        id: "fallback-placeholder",
        type: "image",
        url: "/images/placeholder.png",
        alt: product?.title || "Product image",
      });
    }

    return list;
  }, [product, selectedVariant?.videoUrl]);

  const safeActiveThumb =
    activeThumb >= 0 && activeThumb < mediaList.length ? activeThumb : 0;
  const currentMedia = mediaList[safeActiveThumb] || mediaList[0];
  const totalMediaCount = mediaList.length;

  const getZoomImageUrl = () => {
    if (currentMedia?.type !== "image") return null;
    return currentMedia?.url || null;
  };

  // Reset active thumb to 0 only when navigating to a different product
  useEffect(() => {
    setActiveThumb(0);
  }, [slug]);

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



  // Helpers for Color Family & Size selectors
  const getColorThumbnail = (color: any): string => {
    if (!color) return "";
    const colorVariants = variants.filter(
      (v) => v.color?.id === color.id || v.colorId === color.id
    );
    for (const v of colorVariants) {
      if (Array.isArray(v.variantImages) && v.variantImages.length > 0) {
        const first = v.variantImages[0];
        const url = typeof first === "string" ? first : first?.url;
        if (url) return url;
      }
      if (Array.isArray(v.images) && v.images.length > 0) {
        const first = v.images[0];
        const url = typeof first === "string" ? first : first?.url;
        if (url) return url;
      }
      if (v.imageUrl) return v.imageUrl;
    }
    if (Array.isArray(product?.productimage)) {
      const match = product.productimage.find((img: any) => img.colorId === color.id);
      if (match) {
        const url = typeof match === "string" ? match : match?.url;
        if (url) return url;
      }
      if (product.productimage.length > 0) {
        const first = product.productimage[0];
        const url = typeof first === "string" ? first : first?.url;
        if (url) return url;
      }
    }
    return "";
  };

  const isColorInStock = (color: any): boolean => {
    if (!color) return false;
    const colorVariants = variants.filter(
      (v) => v.color?.id === color.id || v.colorId === color.id
    );
    if (colorVariants.length === 0) return false;
    return colorVariants.some(
      (v) => ((v.availableStock ?? v.stock ?? 0) > 0)
    );
  };

  const isSizeInStockForSelectedColor = (size: any): boolean => {
    if (!size) return false;
    if (colors.length === 0) {
      const v = variants.find(
        (item) => item.size?.id === size.id || item.sizeId === size.id
      );
      return (v?.availableStock ?? v?.stock ?? 0) > 0;
    }
    const v = variants.find(
      (item) =>
        (item.color?.id === selectedColor?.id || item.colorId === selectedColor?.id) &&
        (item.size?.id === size.id || item.sizeId === size.id)
    );
    return (v?.availableStock ?? v?.stock ?? 0) > 0;
  };

  //  Color change → update images + size
  const handleColorChange = (color: any) => {
    setSelectedColor(color);
    const colorVariants = variants.filter(
      (v) => v.color?.id === color.id || v.colorId === color.id
    );

    // If this color has a specific image in the gallery, switch active thumbnail to show it
    const variantWithImages = colorVariants.find(
      (v) =>
        Boolean(v.imageUrl) ||
        (Array.isArray(v.variantImages) && v.variantImages.length > 0) ||
        (Array.isArray(v.images) && v.images.length > 0)
    );

    const targetUrl =
      variantWithImages?.imageUrl ||
      (Array.isArray(variantWithImages?.variantImages) && variantWithImages.variantImages[0]?.url) ||
      (Array.isArray(variantWithImages?.images) && variantWithImages.images[0]?.url);

    if (targetUrl) {
      // 1. Exact match
      let targetIdx = mediaList.findIndex((m) => m.url === targetUrl);
      // 2. Base filename match (ignoring upload timestamp prefixes)
      if (targetIdx === -1) {
        const targetBase = getBaseFilename(targetUrl);
        targetIdx = mediaList.findIndex((m) => getBaseFilename(m.url) === targetBase);
      }
      if (targetIdx !== -1) {
        setActiveThumb(targetIdx);
      }
    } else if (Array.isArray(product?.productimage)) {
      const matchColorImg = product.productimage.find((img: any) => img.colorId === color.id);
      if (matchColorImg) {
        const u = typeof matchColorImg === "string" ? matchColorImg : matchColorImg?.url;
        const targetIdx = mediaList.findIndex((m) => m.url === u);
        if (targetIdx !== -1) {
          setActiveThumb(targetIdx);
        }
      }
    }

    // Preserve size if available in new color, otherwise choose first in-stock size
    const currentSizeAvailable =
      selectedSize &&
      colorVariants.some(
        (v) =>
          (v.size?.id === selectedSize.id || v.sizeId === selectedSize.id) &&
          ((v.availableStock ?? v.stock ?? 0) > 0)
      );

    if (!currentSizeAvailable) {
      const firstAvailableVariant = colorVariants.find(
        (v) => ((v.availableStock ?? v.stock ?? 0) > 0) && v.size
      );
      if (firstAvailableVariant?.size) {
        setSelectedSize(firstAvailableVariant.size);
      } else if (colorVariants[0]?.size) {
        setSelectedSize(colorVariants[0].size);
      }
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

  // Check if current user is logged in
  const isUserAuthenticated = (): boolean => {
    return status === "authenticated" && Boolean(session?.user);
  };

  // Check if current user is an authenticated customer
  const checkCanPurchase = (): boolean => {
    if (status === "loading") return false;

    // Must be logged in
    if (!isUserAuthenticated()) {
      setShowLoginModal(true);
      return false;
    }

    // Role restriction: only customer/user roles can make purchases
    const rawRole = (session?.user as any)?.role;
    const userRole = (rawRole || "customer").toLowerCase().trim();
    if (userRole !== "customer" && userRole !== "user") {
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

      // Clear any prior cart items so Buy Now checks out strictly the selected product
      try {
        await cartService.clear(token);
        localCartService.clear();
      } catch (clearErr) {
        console.error("Cart clear before Buy Now failed (non-fatal):", clearErr);
      }

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

  const handleWishlistToggle = async () => {
    if (!isUserAuthenticated()) {
      setShowLoginModal(true);
      return;
    }

    try {
      if (!wishlist) {
        await wishlistService.add(token, product.id);
        setWishlist(true);
      } else {
        await wishlistService.remove(token, product.id);
        setWishlist(false);
      }
    } catch (err) {
      console.error("Wishlist toggle error:", err);
    }
  };

  const handleChatWithSeller = () => {
    if (!isUserAuthenticated()) {
      setShowLoginModal(true);
      return;
    }
    setChatDrawerOpen(true);
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

  if (loading) {
    return <Loader />;
  }

  if (!product) {
    return (
      <div className="mt-16 flex justify-center">
        <NoData message="No product found." />
      </div>
    );
  }

  return (
    <>
      <VariantWarningModal
        isOpen={showVariantWarning}
        onClose={() => setShowVariantWarning(false)}
      />

          {/* ========================== PRODUCT SECTION ========================== */}
          <section className="max-w-[1500px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10 bg-[#e8d5c8]/25">
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#e8d5c8]/70 shadow-[0_12px_45px_rgba(0,0,0,0.06)] p-3.5 sm:p-6 lg:p-9">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">
                {/* ========================== MEDIA GALLERY (LEFT COLUMN) ========================== */}
                <div className="relative flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-start w-full">
                  {/* DESKTOP: VERTICAL SCROLLABLE STRIP (LEFT) | MOBILE: HORIZONTAL STRIP (BELOW) */}
                  <div className="order-2 md:order-1 flex md:flex-col gap-2 sm:gap-2.5 w-full md:w-20 lg:w-24 overflow-x-auto md:overflow-y-auto no-scrollbar shrink-0 max-h-none md:max-h-[500px] sm:md:max-h-[560px] md:max-h-[600px] lg:max-h-[640px] py-1 px-0.5">
                    {mediaList.map((media, index) => {
                      const isActive = safeActiveThumb === index;
                      return (
                        <button
                          key={`${media.id}-${index}`}
                          type="button"
                          onClick={() => setActiveThumb(index)}
                          onMouseEnter={() => setActiveThumb(index)}
                          className={`relative w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 lg:w-22 lg:h-22 aspect-square rounded-xl border-2 overflow-hidden bg-white shrink-0 cursor-pointer transition-all duration-200 group ${
                            isActive
                              ? "border-[#b08a78] ring-2 ring-[#b08a78]/30 shadow-md scale-[1.02]"
                              : "border-gray-200 hover:border-[#b08a78]/60 opacity-80 hover:opacity-100"
                          }`}
                          aria-label={`View ${media.type === "video" ? "video" : "image"} ${index + 1}`}
                        >
                          {media.type === "video" ? (
                            <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center group/vthumb select-none">
                              {/* Background preview / cover image */}
                              <img
                                src={media.thumbnailUrl || media.coverImage || "/images/placeholder.png"}
                                alt="Video preview"
                                className="absolute inset-0 w-full h-full object-cover opacity-90"
                                onError={(e: any) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/images/placeholder.png";
                                }}
                              />

                              {/* Video metadata frame overlay for local/mp4 videos */}
                              {isMediaVideo(media.url) && !media.url.includes("youtube") && !media.url.includes("vimeo") && (
                                <video
                                  src={`${media.url}#t=0.5`}
                                  preload="metadata"
                                  muted
                                  playsInline
                                  className="absolute inset-0 w-full h-full object-cover opacity-90 pointer-events-none transition-opacity duration-300"
                                />
                              )}

                              {/* Dark vignette overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/30 pointer-events-none" />

                              {/* Centered Play Button Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 backdrop-blur-xs text-white border border-white/50 flex items-center justify-center shadow-md group-hover/vthumb:scale-110 group-hover/vthumb:bg-[#f85606] group-hover/vthumb:border-[#f85606] transition-all">
                                  <Play size={13} className="fill-white text-white ml-0.5" />
                                </div>
                              </div>

                              {/* Bottom badge: VIDEO */}
                              <span className="absolute bottom-1 right-1 z-10 px-1.5 py-0.5 rounded-[4px] bg-black/80 backdrop-blur-xs text-[9px] font-extrabold text-white tracking-wider uppercase flex items-center gap-1 pointer-events-none shadow-xs">
                                <Play size={7} className="fill-white text-white" />
                                VIDEO
                              </span>
                            </div>
                          ) : (
                            <img
                              src={media.thumbnailUrl || media.url}
                              alt={media.alt}
                              className="w-full h-full object-cover bg-white"
                              onError={(e: any) => {
                                e.currentTarget.onerror = null;
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
                    className="order-1 md:order-2 relative w-full flex-1 aspect-square sm:aspect-[4/5] md:aspect-square lg:aspect-[4/5] max-h-[500px] sm:max-h-[560px] md:max-h-[600px] lg:max-h-[640px] rounded-2xl overflow-hidden flex items-center justify-center bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-2 sm:p-3 group cursor-zoom-in select-none"
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
                      <span className="absolute top-4 left-4 z-20 px-3 py-1 rounded-md bg-[#b08a78] text-white text-xs font-black uppercase tracking-wider shadow-md">
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
                        className="w-full h-full flex items-center justify-center bg-black/95 rounded-xl overflow-hidden relative group/video"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Video Title Header Overlay */}
                        <div className="absolute top-0 inset-x-0 z-20 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
                          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-12">
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow flex items-center gap-1">
                              <Play size={10} className="fill-white" />
                              VIDEO
                            </span>
                            <h3 className="text-white text-xs sm:text-sm font-bold truncate drop-shadow-md">
                              {product?.title || "Product Video"}
                            </h3>
                          </div>
                        </div>

                        {getEmbedVideoUrl(currentMedia.url) ? (
                          <iframe
                            key={currentMedia.url}
                            src={getEmbedVideoUrl(currentMedia.url)!}
                            className="w-full h-full aspect-video rounded-xl"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={product?.title ? `${product.title} - Video` : "Product video"}
                          />
                        ) : (
                          <video
                            key={currentMedia.url}
                            src={currentMedia.url}
                            controls
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    ) : (
                      <img
                        key={currentMedia?.url}
                        src={currentMedia?.url || "/images/placeholder.png"}
                        alt={currentMedia?.alt || product?.title || "Product image"}
                        className="w-full h-full object-contain object-center transition-transform duration-300 rounded-xl group-hover:scale-[1.02]"
                        onError={(e: any) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/images/placeholder.png";
                        }}
                      />
                    )}
                  </div>

                  {/* DESKTOP HOVER-TO-ZOOM LENS WINDOW */}
                  {zoomVisible && !isMobile && currentMedia?.type === "image" && getZoomImageUrl() && (
                    <div
                      className="hidden lg:block absolute top-0 left-[calc(100%+20px)] 
                        w-[520px] h-[540px] rounded-2xl border border-gray-200 shadow-2xl bg-white 
                        bg-no-repeat bg-center z-40 pointer-events-none overflow-hidden"
                      style={{
                        backgroundImage: `url("${getZoomImageUrl()}")`,
                        backgroundPosition,
                        backgroundSize: "220%",
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
                  <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-[#0a0808] tracking-tight leading-snug mb-3">
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

                    {/* Inline 'Watch Video' pill button (only if product has video) */}
                    {hasProductVideo && (
                      <button
                        type="button"
                        onClick={handleWatchVideo}
                        className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#b08a78]/10 hover:bg-[#b08a78]/20 text-[#b08a78] border border-[#b08a78]/30 text-xs font-semibold transition cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <Play size={10} className="fill-[#b08a78] text-[#b08a78] shrink-0" />
                        <span>Watch Video</span>
                      </button>
                    )}
                  </div>

                  {/* 4. PRICING ROW */}
                  <div className="flex flex-wrap items-baseline gap-3 mb-2">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[#0a0808] tracking-tight">
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

                  {/* Color Family Selection (matches reference UI) */}
                  {colors.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center text-sm mb-2.5">
                        <span className="text-gray-500 font-normal">Color Family</span>
                        <span className="text-gray-900 font-semibold ml-4">
                          {selectedColor?.name || "Select"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {colors.map((c: any) => {
                          const isSelected = selectedColor?.id === c.id;
                          const inStock = isColorInStock(c);
                          const thumbnail = getColorThumbnail(c);

                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleColorChange(c)}
                              className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-[2px] overflow-hidden transition-all bg-gray-50 flex items-center justify-center p-0 ${
                                isSelected
                                  ? "border-2 border-[#f85606] shadow-2xs"
                                  : inStock
                                  ? "border border-gray-300 hover:border-gray-500"
                                  : "border border-gray-200 opacity-25 grayscale hover:opacity-50"
                              }`}
                              title={inStock ? c.name : `${c.name} (Out of stock)`}
                            >
                              {thumbnail ? (
                                <img
                                  src={thumbnail}
                                  alt={c.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span
                                  className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white shadow-inner uppercase"
                                  style={{ backgroundColor: c.hexCode || "#9ca3af" }}
                                >
                                  {c.name?.slice(0, 2)}
                                </span>
                              )}

                              {/* Selected Orange Bottom-Right Corner Badge with White Checkmark */}
                              {isSelected && (
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 pointer-events-none overflow-hidden">
                                  <svg
                                    viewBox="0 0 16 16"
                                    className="w-full h-full text-[#f85606] fill-current"
                                  >
                                    <polygon points="16,0 16,16 0,16" />
                                  </svg>
                                  <Check
                                    size={8}
                                    className="absolute bottom-0 right-0 text-white stroke-[3.5]"
                                  />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Size Selection (matches reference UI) */}
                  {sizes.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center justify-between text-sm mb-2.5">
                        <div className="flex items-center">
                          <span className="text-gray-500 font-normal">Size</span>
                          <span className="text-gray-900 font-semibold ml-4">
                            {selectedSize?.name || "Select"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSizeGuide(true)}
                          className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M7 16v-3M12 16v-6M17 16v-4" />
                          </svg>
                          <span>Size Guide</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {sizes.map((s: any) => {
                          const isAvailable = isSizeInStockForSelectedColor(s);
                          const isSelected = selectedSize?.id === s.id;

                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => isAvailable && handleSizeChange(s)}
                              disabled={!isAvailable}
                              className={`min-w-[44px] h-[36px] px-3.5 text-xs sm:text-sm rounded-[2px] transition flex items-center justify-center ${
                                isSelected
                                  ? "border border-[#f85606] text-[#f85606] font-semibold bg-white shadow-2xs"
                                  : isAvailable
                                  ? "border border-gray-300 bg-white hover:border-gray-500 text-gray-800 font-normal"
                                  : "border border-dashed border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed line-through font-normal"
                              }`}
                              title={isAvailable ? s.name : `${s.name} (Out of stock)`}
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
                      <span className="w-10 text-center font-bold text-sm text-[#0a0808] select-none">
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
                      className="flex-1 min-w-[130px] h-12 px-5 rounded-xl border border-gray-300 hover:border-[#b08a78] hover:text-[#b08a78] bg-white hover:bg-gray-50 text-[#0a0808] text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs active:scale-[0.98]"
                    >
                      <ShoppingCart size={17} />
                      <span>{addingToCart ? "Adding..." : "Add to Cart"}</span>
                    </button>

                    {/* Filled Primary Buy Now Button */}
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={availableStock <= 0 || addingToCart}
                      className="flex-1 min-w-[130px] h-12 px-6 rounded-xl bg-[#b08a78] hover:bg-[#9d7765] text-white text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
                    >
                      <Zap size={16} className="fill-white" />
                      <span>Buy Now</span>
                    </button>

                    {/* Wishlist Heart Button */}
                    <button
                      type="button"
                      onClick={handleWishlistToggle}
                      className="w-12 h-12 rounded-xl border border-gray-200 hover:border-[#b08a78] bg-white flex items-center justify-center text-gray-400 hover:text-[#b08a78] transition shrink-0 shadow-2xs"
                      aria-label="Add to wishlist"
                    >
                      <Heart
                        size={20}
                        className={
                          wishlist
                            ? "fill-[#b08a78] text-[#b08a78]"
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

          {/* ========================== LOWER SECTION 1: PRODUCT DETAILS ========================== */}
          <section className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-[#e8d5c8]/25">
            <div className="bg-white rounded-3xl border border-[#e8d5c8]/70 shadow-[0_12px_45px_rgba(0,0,0,0.06)] p-6 sm:p-8 lg:p-10">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a0808] mb-6 pb-4 border-b border-gray-100">
                Product details of {product?.title || "Product"}
              </h2>

              <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                {/* Short description / highlights */}
                {product?.shortDescription && (
                  <div
                    className="prose max-w-none text-gray-800 leading-relaxed font-medium"
                    dangerouslySetInnerHTML={{ __html: product.shortDescription }}
                  />
                )}

                {/* Full description */}
                {product?.description && (
                  <div
                    className="prose max-w-none text-gray-700 leading-relaxed border-t border-gray-100 pt-6"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                )}

                {/* Materials & Care Advice */}
                {product?.materialCare && (
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0a0808] mb-3">
                      Materials & Care Advice
                    </h3>
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      {product?.materialCare?.icon && (
                        <img
                          src={product.materialCare.icon}
                          alt={product?.materialCare?.title || "Material icon"}
                          className="w-10 h-10 object-contain shrink-0"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-sm text-[#0a0808]">
                          {product?.materialCare?.title || "Fabric Care"}
                        </p>
                        {product?.materialCare?.description && (
                          <div
                            className="text-xs text-gray-600 mt-1 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: product.materialCare.description }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Information */}
                {product?.deliverySettings && (
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0a0808] mb-3">
                      Delivery & Returns
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <p className="font-semibold text-xs text-[#0a0808]">
                          {product?.deliverySettings?.standardDeliveryTitle || "Standard Delivery"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {product?.deliverySettings?.standardDeliveryMinDays}–{product?.deliverySettings?.standardDeliveryMaxDays} working days (Cost: £{product?.deliverySettings?.standardDeliveryCost})
                        </p>
                        {product?.deliverySettings?.freeDeliveryText && (
                          <p className="text-xs text-emerald-700 font-semibold pt-1">
                            {product.deliverySettings.freeDeliveryText}
                          </p>
                        )}
                      </div>
                      <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                        <p className="font-semibold text-xs text-[#0a0808]">Returns Policy</p>
                        <p className="text-xs text-gray-600">
                          {product?.deliverySettings?.returnText || "Free and easy returns within 7 to 14 days."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ========================== LOWER SECTION 2: RATINGS & REVIEWS ========================== */}
          <section className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-[#e8d5c8]/25">
            <div className="bg-white rounded-3xl border border-[#e8d5c8]/70 shadow-[0_12px_45px_rgba(0,0,0,0.06)] p-6 sm:p-8 lg:p-10">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a0808] mb-6 pb-4 border-b border-gray-100">
                Ratings & Reviews of {product?.title || "Product"}
              </h2>

              {/* Rating Summary & Star Distribution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pb-8 border-b border-gray-100">
                {/* Score Column */}
                <div className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left gap-2 border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-5xl sm:text-6xl font-black text-[#0a0808] tracking-tight">
                      {avgRating.toFixed(1)}
                    </span>
                    <span className="text-2xl text-gray-400 font-medium">/5</span>
                  </div>
                  <div className="flex text-amber-400 gap-1 my-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={22}
                        className={
                          i < Math.floor(avgRating)
                            ? "fill-amber-400 text-amber-400"
                            : i < avgRating
                            ? "fill-amber-400/50 text-amber-400"
                            : "fill-gray-200 text-gray-200"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {reviewCount} {reviewCount === 1 ? "Rating" : "Ratings"}
                  </span>
                </div>

                {/* Star Distribution Progress Bars */}
                <div className="md:col-span-8 space-y-2.5 max-w-md w-full mx-auto md:mx-0">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count =
                      product?.reviewsData?.list?.filter((r: any) => Math.round(r.rating) === star)
                        ?.length || (star === 5 ? Math.max(1, reviewCount - 1) : 0);
                    const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;

                    return (
                      <div key={star} className="flex items-center gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1 w-16 shrink-0 text-amber-400">
                          {[...Array(5)].map((_, idx) => (
                            <Star
                              key={idx}
                              size={11}
                              className={
                                idx < star
                                  ? "fill-amber-400 text-amber-400"
                                  : "fill-gray-200 text-gray-200"
                              }
                            />
                          ))}
                        </div>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-semibold text-gray-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review Filter & Sort Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-gray-100 text-xs sm:text-sm">
                <span className="font-bold text-[#0a0808]">Product Reviews</span>
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs flex items-center gap-1.5 cursor-pointer transition">
                    Sort: Relevance
                  </span>
                  <span className="px-3.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs flex items-center gap-1.5 cursor-pointer transition">
                    Filter: All star
                  </span>
                </div>
              </div>

              {/* Review List */}
              <div className="divide-y divide-gray-100 mt-2">
                {product?.reviewsData?.list && product.reviewsData.list.length > 0 ? (
                  product.reviewsData.list.map((review: any, index: number) => (
                    <div key={review.id || index} className="py-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={
                                  i < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-gray-200 text-gray-200"
                                }
                              />
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-[#0a0808]">
                            {review.user?.name || "Verified Customer"}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            <Check size={10} /> Verified Purchase
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "Recent"}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {review.comment}
                      </p>

                      {/* Review Photos Gallery */}
                      {((Array.isArray(review.images) && review.images.length > 0) || review.image) && (
                        <div className="pt-2">
                          <div className="flex flex-wrap gap-2">
                            {(Array.isArray(review.images) && review.images.length > 0
                              ? review.images
                              : [review.image]
                            )
                              .filter(Boolean)
                              .map((imgUrl: string, idx: number) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setReviewLightboxImage(imgUrl)}
                                  className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-50 border border-gray-200 hover:border-[#b08a78] transition shadow-xs flex-shrink-0"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Customer review photo ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                    <Maximize2 size={14} />
                                  </div>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Review Video Player */}
                      {review.video && (
                        <div className="pt-2 max-w-sm">
                          <video
                            src={review.video}
                            controls
                            className="w-full h-44 object-contain rounded-xl bg-black border border-gray-200 shadow-xs"
                          />
                        </div>
                      )}

                      {/* Seller Response Callout */}
                      {review.sellerReply && (
                        <div className="mt-3 ml-1 sm:ml-4 p-3.5 bg-amber-50/70 border-l-2 border-[#b08a78] rounded-r-xl space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0a0808]">
                              {review.sellerReplyShopName || sellerName || "Store"} Response
                            </span>
                            <span className="text-[10px] bg-[#b08a78] text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                              Seller
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                            {review.sellerReply}
                          </p>
                          {review.sellerRepliedAt && (
                            <span className="text-[10px] text-gray-400 block pt-0.5">
                              {new Date(review.sellerRepliedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Helpful Button */}
                      <div className="flex items-center gap-4 pt-1">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-black transition"
                        >
                          <ThumbsUp size={13} />
                          <span>0</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-gray-500 text-sm">
                    No reviews yet. Be the first to review this product!
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ========================== LOWER SECTION 3: QUESTIONS ABOUT PRODUCT no need this section Iam delete it  ========================== */}
         

          {/* ========================== LOWER SECTION 4: YOU MAY ALSO LIKE ========================== */}
          {Array.isArray(product?.youMayAlsoLike || product?.wearWith) &&
            ((product?.youMayAlsoLike || product?.wearWith).length > 0) && (
            <section className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-[#e8d5c8]/25">
              <div className="bg-white rounded-3xl border border-[#e8d5c8]/70 shadow-[0_12px_45px_rgba(0,0,0,0.06)] p-6 sm:p-8 lg:p-10">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0a0808] mb-6 pb-4 border-b border-gray-100">
                  You may also like
                </h2>
                <ProductSuggestions wearWith={product?.youMayAlsoLike || product?.wearWith} hideHeader={true} />
              </div>
            </section>
          )}

          {/* Values Section removed as requested */} 
         

          {/* ========================== MODALS & LIGHTBOX ========================== */}
          <AuthPromptModal
            show={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onLogin={() => router.push(ROUTES.USER.LOGIN)}
          />

          <SizeGuideModal open={showSizeGuide} onClose={() => setShowSizeGuide(false)} />

          {/* FULLSCREEN LIGHTBOX MODAL */}
          {showImageModal && (
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
              onClick={() => setShowImageModal(false)}
            >
              <div
                className="relative max-w-5xl w-full max-h-[92vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-[fadeIn_0.15s_ease-out]"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Header / Close button */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                  <span className="text-sm font-semibold text-[#0a0808]">
                    {currentMedia?.alt || product?.title} ({safeActiveThumb + 1}/{totalMediaCount})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowImageModal(false)}
                    aria-label="Close lightbox"
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition"
                  >
                    <X size={22} />
                  </button>
                </div>

                {/* Main Media in Lightbox */}
                <div className="relative flex-1 flex items-center justify-center p-4 sm:p-6 bg-gray-50 min-h-[380px] max-h-[65vh] select-none">
                  {/* Prev Button */}
                  {totalMediaCount > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevMedia}
                      className="absolute left-4 z-10 p-3 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-lg transition active:scale-95"
                      aria-label="Previous media"
                    >
                      <ChevronLeft size={22} />
                    </button>
                  )}

                  {currentMedia?.type === "video" ? (
                    getEmbedVideoUrl(currentMedia.url) ? (
                      <iframe
                        key={currentMedia.url}
                        src={getEmbedVideoUrl(currentMedia.url)!}
                        className="w-full max-h-[62vh] aspect-video rounded-xl"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Product video gallery"
                      />
                    ) : (
                      <video
                        key={currentMedia.url}
                        src={currentMedia.url}
                        controls
                        autoPlay
                        className="max-h-[62vh] max-w-full rounded-xl object-contain bg-black/5"
                      />
                    )
                  ) : (
                    <img
                      key={currentMedia?.url}
                      src={currentMedia?.url || "/images/placeholder.png"}
                      alt={currentMedia?.alt || "Preview"}
                      className="max-h-[62vh] max-w-full rounded-xl object-contain"
                      onError={(e: any) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/images/placeholder.png";
                      }}
                    />
                  )}

                  {/* Next Button */}
                  {totalMediaCount > 1 && (
                    <button
                      type="button"
                      onClick={handleNextMedia}
                      className="absolute right-4 z-10 p-3 rounded-full bg-white/90 hover:bg-white text-gray-800 shadow-lg transition active:scale-95"
                      aria-label="Next media"
                    >
                      <ChevronRight size={22} />
                    </button>
                  )}
                </div>

                {/* Thumbnails strip at bottom of Lightbox */}
                {totalMediaCount > 1 && (
                  <div className="flex items-center gap-3 p-4 bg-white border-t border-gray-100 overflow-x-auto no-scrollbar justify-center">
                    {mediaList.map((m, idx) => (
                      <button
                        key={`lightbox-thumb-${idx}`}
                        type="button"
                        onClick={() => setActiveThumb(idx)}
                        className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition ${
                          safeActiveThumb === idx
                            ? "border-[#b08a78] ring-2 ring-[#b08a78]/30 scale-105"
                            : "border-gray-200 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {m.type === "video" ? (
                          <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                            <img
                              src={m.thumbnailUrl || m.coverImage || "/images/placeholder.png"}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover opacity-85"
                              onError={(e: any) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/images/placeholder.png";
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center shadow">
                                <Play size={10} className="fill-white text-white ml-0.5" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={m.thumbnailUrl || m.url}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e: any) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/images/placeholder.png";
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Review Photo Lightbox Modal */}
          {reviewLightboxImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200"
              onClick={() => setReviewLightboxImage(null)}
            >
              <div
                className="relative max-w-3xl max-h-[85vh] w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setReviewLightboxImage(null)}
                  className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition"
                  title="Close photo"
                >
                  <X size={26} />
                </button>
                <img
                  src={reviewLightboxImage}
                  alt="Customer review photo"
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                />
              </div>
            </div>
          )}

          {/* Floating Customer-to-Seller Chat Drawer */}
          {chatDrawerOpen && product && (
            <CustomerChatDrawer
              isOpen={chatDrawerOpen}
              onClose={() => setChatDrawerOpen(false)}
              sellerId={product?.sellerId || product?.seller?.id || 1}
              sellerName={sellerName}
              initialProduct={{
                id: product.id,
                title: product.title,
                slug: product.slug,
                image: mediaList[0]?.url || product.productimage?.[0]?.url || product.image || "/placeholder.png",
                price: displayPrice,
              }}
            />
          )}

          {/* Popup Error Alert */}
          {errorMsg && <ErrorAlert message={errorMsg} onClose={() => setErrorMsg(null)} />}
        </>
  );
}
