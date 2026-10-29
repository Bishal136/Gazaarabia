"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart, ShoppingBag, ArrowRight } from "lucide-react";
import ProductCard, { Product } from "@/components/SimpleProductCard";
import Pagination from "@/components/Pagination";
import { wishlistService } from "@/lib/services/front-end/wishlistService";
import { cartService } from "@/lib/services/front-end/cartService";
import Loader from "@/components/Loader";
import AlertMessage from "@/components/AlertMessage";
import CartDrawer from "@/components/CartDrawer";
import { ROUTES } from "@/constants/routes";
import { useCart } from "@/app/context/CartContext";

function WishlistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const token = session?.user?.token || null;

  const { refreshCart } = useCart();
  const [cartDrawer, setCartDrawer] = useState(false);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(
    Number(searchParams.get("page")) || 1
  );
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "";
    message: string;
  }>({
    isOpen: false,
    type: "",
    message: "",
  });

  const isAuthenticated = status === "authenticated" && Boolean(session?.user);

  // Fetch wishlist
  const fetchWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const data = await wishlistService.getAll(token, currentPage, 10);
      const rawList = Array.isArray(data?.wishlist) ? data.wishlist : [];

      const formatted: Product[] = rawList
        .filter((w: any) => Boolean(w?.product))
        .map((w: any) => ({
          id: w.product.id,
          slug: w.product.slug,
          title: w.product.title || "Product",
          img: w.product.productimage?.[0]?.url || "/images/placeholder.jpg",
          price: `${w.product.sellingPrice || 0}`,
          isNew: Boolean(w.product.isNew),
          isWishlisted: true,
        }));

      setWishlist(formatted);
      setTotalPages(Math.max(1, Number(data?.totalPages) || 1));
    } catch (err: any) {
      console.error("Failed to load wishlist:", err);
      setAlert({
        isOpen: true,
        type: "error",
        message: err.message || "Failed to load wishlist items.",
      });
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  }, [token, currentPage]);

  useEffect(() => {
    if (status === "loading") return;

    if (isAuthenticated) {
      fetchWishlist();
    } else {
      setLoading(false);
    }
  }, [status, isAuthenticated, fetchWishlist]);

  useEffect(() => {
    if (isAuthenticated && currentPage > 1) {
      router.replace(`?page=${currentPage}`, { scroll: false });
    }
  }, [currentPage, router, isAuthenticated]);

  // Remove item
  const handleRemove = async (product: Product) => {
    const productId = Number(product.id);
    // Optimistic UI update
    setWishlist((prev) => prev.filter((p) => Number(p.id) !== productId));

    try {
      await wishlistService.remove(token, productId);
      setAlert({
        isOpen: true,
        type: "success",
        message: "Removed from wishlist.",
      });
    } catch (err: any) {
      // Re-fetch on failure to restore state
      fetchWishlist();
      setAlert({ isOpen: true, type: "error", message: err.message || "Failed to remove item." });
    }
  };

  // Add to bag
  const handleAddToBag = async (product: Product) => {
    if (!isAuthenticated) {
      setAlert({
        isOpen: true,
        type: "error",
        message: "Please login to add items to your bag.",
      });
      return;
    }

    const rawRole = (session?.user as any)?.role;
    const userRole = (rawRole || "customer").toLowerCase().trim();
    if (userRole !== "customer" && userRole !== "user") {
      setAlert({
        isOpen: true,
        type: "error",
        message:
          "Only standard customer accounts can add products to the bag. Admins and sellers cannot make purchases.",
      });
      return;
    }

    try {
      await cartService.add(token, Number(product.id), 1);
      await refreshCart();
      setAlert({
        isOpen: true,
        type: "success",
        message: `${product.title} added to your bag.`,
      });
      setCartDrawer(true);
    } catch (error: any) {
      setAlert({
        isOpen: true,
        type: "error",
        message: error.message || "Failed to add to bag.",
      });
    }
  };

  // Wishlist toggle
  const handleWishlistToggle = (product: Product) => {
    handleRemove(product);
  };

  // Show loader while session resolving
  if (status === "loading" || loading) {
    return (
      <div className="py-28 flex items-center justify-center min-h-[50vh]">
        <Loader />
      </div>
    );
  }

  // Show login prompt if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 sm:py-32 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-[#e8d5c8]/40 flex items-center justify-center mb-6 text-[#b08a78]">
          <Heart size={36} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0a0808] mb-3">
          Sign In to View Your Wishlist
        </h2>
        <p className="text-gray-600 text-sm sm:text-base mb-8 max-w-md leading-relaxed">
          Keep track of your favorite abayas, thobes, and ethical items across all your devices.
        </p>
        <Link
          href={ROUTES.USER.LOGIN}
          className="inline-flex items-center gap-2 bg-[#b08a78] hover:bg-[#967262] text-white px-8 py-3.5 rounded-full font-semibold transition shadow-sm active:scale-95"
        >
          <span>Sign In / Register</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  // Authenticated user wishlist
  return (
    <>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0a0808] tracking-tight">
            My Wishlist
          </h1>
          {wishlist.length > 0 && (
            <p className="text-[var(--text-muted)] mt-2 text-sm">
              {wishlist.length} item{wishlist.length !== 1 ? "s" : ""} saved in your collection
            </p>
          )}
        </div>

        {alert.isOpen && alert.type && (
          <div className="mb-6 max-w-2xl mx-auto">
            <AlertMessage
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert((p) => ({ ...p, isOpen: false }))}
            />
          </div>
        )}

        {wishlist.length === 0 ? (
          <div className="bg-white border border-[#e8d5c8]/80 rounded-3xl p-8 sm:p-14 text-center max-w-2xl mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#e8d5c8]/40 text-[#b08a78] flex items-center justify-center mx-auto mb-4">
              <Heart size={30} />
            </div>
            <h3 className="text-xl font-bold text-[#0a0808] mb-2">
              Your Wishlist is Empty
            </h3>
            <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
              Explore our handcrafted collections and save your favorite styles here for easy access.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#b08a78] hover:bg-[#967262] text-white px-7 py-3 rounded-full font-semibold transition shadow-sm text-sm"
            >
              <ShoppingBag size={16} />
              <span>Explore Products</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
              {wishlist.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  removable
                  onRemove={handleRemove}
                  onAddToBag={handleAddToBag}
                  onToggleWishlist={handleWishlistToggle}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <Pagination
                  totalPages={totalPages}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartDrawer} onClose={() => setCartDrawer(false)} />
    </>
  );
}

export default function WishlistPage() {
  return (
    <Suspense
      fallback={
        <div className="py-28 flex items-center justify-center min-h-[50vh]">
          <Loader />
        </div>
      }
    >
      <WishlistContent />
    </Suspense>
  );
}
