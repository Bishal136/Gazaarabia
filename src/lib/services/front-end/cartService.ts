import { localCartService } from "./localCartService";

function getCartHeaders(token?: any): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token && token !== "undefined" && token !== "null") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const cartService = {
  async getAll(token?: any) {
    // Guest mode fast-path: immediately return localCart without wasting an unauthenticated network round-trip
    if (!token || token === "undefined" || token === "null") {
      return localCartService.get();
    }

    try {
      const res = await fetch("/api/front-end/cart", {
        method: "GET",
        headers: getCartHeaders(token),
        cache: "no-store",
      });

      if (res.ok) {
        return await res.json();
      }

      // Guest mode fallback on 401
      if (res.status === 401) {
        return await localCartService.get();
      }

      throw new Error("Failed to fetch cart items");
    } catch (err: any) {
      if (!token) {
        return await localCartService.get();
      }
      throw err;
    }
  },

  async add(
    token: string | undefined | null,
    productId: number,
    quantity = 1,
    variantId?: number,
    colorId?: number,
    sizeId?: number,
    product?: any,
    selectedVariantData?: any
  ) {
    try {
      const res = await fetch("/api/front-end/cart", {
        method: "POST",
        headers: getCartHeaders(token),
        body: JSON.stringify({ productId, quantity, variantId, colorId, sizeId }),
      });

      if (res.ok) {
        return await res.json();
      }

      // Guest fallback if unauthorized
      if (res.status === 401) {
        const result = localCartService.add({
          productId,
          quantity,
          variantId: variantId!,
          colorId: colorId!,
          sizeId: sizeId!,
          product,
          selectedVariantData,
        });
        if (result?.success === false) throw new Error(result.error);
        return result;
      }

      const data = await res.json().catch(() => ({}));
      const msg = data?.error || data?.message || "Failed to add to cart.";
      throw new Error(msg);
    } catch (err: any) {
      // If network error and guest mode, fallback locally
      if (!token && err?.message && !err.message.includes("available")) {
        const result = localCartService.add({
          productId,
          quantity,
          variantId: variantId!,
          colorId: colorId!,
          sizeId: sizeId!,
          product,
          selectedVariantData,
        });
        if (result?.success === false) throw new Error(result.error);
        return result;
      }
      throw err;
    }
  },

  async remove(token: any, productId: number, variantId: number) {
    try {
      const res = await fetch("/api/front-end/cart", {
        method: "DELETE",
        headers: getCartHeaders(token),
        body: JSON.stringify({ productId, variantId }),
      });

      if (res.ok) {
        return await res.json();
      }

      if (res.status === 401) {
        const result = localCartService.remove(productId, variantId);
        if (!result?.success) throw new Error(result?.message || "Failed to remove item");
        return result;
      }

      throw new Error("Failed to remove from cart");
    } catch (err: any) {
      if (!token) {
        const result = localCartService.remove(productId, variantId);
        if (!result?.success) throw new Error(result?.message || "Failed to remove item");
        return result;
      }
      throw err;
    }
  },

  async updateQuantity(
    token: any,
    productId: number,
    variantId: number,
    quantity: number
  ) {
    try {
      const res = await fetch("/api/front-end/cart", {
        method: "PUT",
        headers: getCartHeaders(token),
        body: JSON.stringify({ productId, variantId, quantity }),
      });

      if (res.ok) {
        return await res.json();
      }

      if (res.status === 401) {
        const result = localCartService.updateQuantity(productId, variantId, quantity);
        if (result?.success === false) {
          throw new Error(result.error);
        }
        return result;
      }

      const data = await res.json().catch(() => ({}));
      const msg = data?.error || data?.message || "Failed to update quantity";
      throw new Error(msg);
    } catch (err: any) {
      if (!token) {
        const result = localCartService.updateQuantity(productId, variantId, quantity);
        if (result?.success === false) {
          throw new Error(result.error);
        }
        return result;
      }
      throw err;
    }
  },

  async clear(token?: string) {
    try {
      const res = await fetch("/api/front-end/cart/clear", {
        method: "DELETE",
        headers: getCartHeaders(token),
      });

      if (res.ok) {
        return await res.json();
      }

      localCartService.clear();
      return { success: true, local: true };
    } catch {
      localCartService.clear();
      return { success: true, local: true };
    }
  },


  /**
 * Validate cart stock before proceeding to checkout
 */
  async validateStock(token?: any) {
    try {
      if (token) {
        //  Logged-in user — validate via server cart (token-based)
        const res = await fetch("/api/front-end/cart/validate-stock", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return {
            success: false,
            message: data?.message || "Stock validation failed.",
            unavailableItems: data?.unavailableItems || [],
          };
        }

        return res.json(); // { success: boolean, unavailableItems?: [] }
      } else {
        // Guest user — validate local cart against live stock
        const localData = localCartService.get();
        const cartItems = localData?.cart || [];

        if (!cartItems.length) {
          return { success: false, message: "Your cart is empty." };
        }

        // // Prepare clean cart payload for API
        // const formattedItems = cartItems.map((item: any) => ({
        //   productId: item.productId,
        //   variantId: item.variantId,
        //   quantity: item.quantity,
        //   productName: item.product?.title || "Unknown Product",
        // }));

        const res = await fetch("/api/front-end/cart/validate-stock/guest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItems: cartItems }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          return {
            success: false,
            message: data?.message || "Stock validation failed.",
            unavailableItems: data?.unavailableItems || [],
          };
        }

        return res.json(); // expected { success: boolean, unavailableItems?: [] }
      }
    } catch (error) {
      console.error("Error validating cart stock:", error);
      return { success: false, message: "Stock validation failed." };
    }
  },


  // async validateStock(token?: string) {
  //   if (!token) {
  //     // For guest users — optional: skip or validate local cart
  //     return { success: true, message: "Guest validation skipped" };
  //   }

  //   try {
  //     const res = await fetch("/api/front-end/cart/validate-stock", {
  //       method: "GET",
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //       cache: "no-store",
  //     });

  //     return res.json(); // expected { success: boolean, unavailableItems?: [] }
  //   } catch (error) {
  //     console.error("Error validating cart stock:", error);
  //     throw error;
  //   }
  // },


  // async syncCart(token?: any, cartItems?: any[]) {
  //   const endpoint = "/api/front-end/cart/sync";

  //   const options: any = {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ cartItems: cartItems || [] }), //  always send body
  //   };

  //   if (token) {
  //     options.headers.Authorization = `Bearer ${token}`;
  //   }

  //   const res = await fetch(endpoint, options);
  //   if (!res.ok) throw new Error("Failed to sync cart");
  //   return res.json();
  // }

  async syncCart(token?: any, cartItems?: any[]) {
  const endpoint = "/api/front-end/cart/sync";

  const options: any = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartItems: cartItems || [] }),
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, options);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Failed to sync cart");
  }

  const data = await res.json();

  //  Guest user — clear old and save fresh
  if (!token && data?.syncedCart) {
    try {
      console.log("🧹 Clearing old guest cart...");
      localCartService.clear();

      //  Reset and save new synced cart
      localCartService.save(data.syncedCart);

      //  Log confirmation
      const newLocal = localCartService.get();
      console.log(" Local cart synced:", newLocal);
    } catch (error) {
      console.error(" Failed to update local cart after sync:", error);
    }
  }

  return data;
}


  // async syncCart(token?: any, cartItems?: any[]) {
  //   const endpoint = "/api/front-end/cart/sync";

  //   const options: any = {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ cartItems: cartItems || [] }), // always send body
  //   };

  //   if (token) {
  //     options.headers.Authorization = `Bearer ${token}`;
  //   }

  //   const res = await fetch(endpoint, options);

  //   if (!res.ok) {
  //     const data = await res.json().catch(() => ({}));
  //     throw new Error(data?.error || "Failed to sync cart");
  //   }

  //   const data = await res.json();

  //   //  Guest user (no token): update local storage with latest synced data
  //   if (!token && data?.syncedCart) {
  //     try {
  //       const updatedCartData = {
  //         cart: data.syncedCart,
  //         subtotal: data.subtotal || 0,
  //       };

  //       // Step 1: clear any old guest cart
  //       localCartService.clear();

  //       // Use existing localCartService.save() to persist properly
  //       localCartService.save(updatedCartData.cart);
  //       console.log('local cart synced:>', localCartService.get())

  //       console.log(" Local cart updated after sync");
  //     } catch (error) {
  //       console.error(" Failed to update local cart after sync:", error);
  //     }
  //   }

  //   return data;
  // }


};
