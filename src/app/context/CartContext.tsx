"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { cartService } from "@/lib/services/front-end/cartService";
import { useSession } from "next-auth/react";

const SKIP_CART_PREFIXES = [
  "/affiliate",
  "/ambassador",
  "/admin",
  "/seller",
  "/payment",
  "/shopify",
  "/login",
  "/unauthorized",
] as const;

/**
 * Matches internal panels and auth/payment routes via exact path or trailing slash
 * so storefront sibling slugs like `/ambassador-terms` still initialize the cart.
 */
function shouldSkipCartFetch(pathname: string | null): boolean {
  if (!pathname) return false;
  return SKIP_CART_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

interface CartContextProps {
  cart: any[];
  subtotal: number;
  cartCount: number;
  loading: boolean;
  refreshCart: () => Promise<void>;
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const skipCart = shouldSkipCartFetch(pathname);
  const { data: session } = useSession();
  const token = session?.user?.token || null;

  const [cart, setCart] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [loading, setLoading] = useState(!skipCart);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const openCartDrawer = () => setIsCartDrawerOpen(true);
  const closeCartDrawer = () => setIsCartDrawerOpen(false);

  // Unified refreshCart
  const refreshCart = useCallback(async () => {
    if (skipCart) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await cartService.getAll(token);
      setCart(data.cart || []);
      setSubtotal(data.subtotal || 0);
      const totalQuantity = Array.isArray(data.cart)
        ? data.cart.reduce((sum: any, i: any) => sum + (i.quantity || 0), 0)
        : 0;
      setCartCount(totalQuantity);
    } catch (err) {
      console.error("Error refreshing cart:", err);
    } finally {
      setLoading(false);
    }
  }, [skipCart, token]);

  // Load when user logs in/out or enters storefront routes
  useEffect(() => {
    if (skipCart) {
      setLoading(false);
      return;
    }
    refreshCart();
  }, [skipCart, refreshCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        subtotal,
        cartCount,
        loading,
        refreshCart,
        setCart,
        isCartDrawerOpen,
        openCartDrawer,
        closeCartDrawer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
