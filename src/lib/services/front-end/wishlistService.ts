function getWishlistHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token && token !== "undefined" && token !== "null") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const wishlistService = {
  getAll: async (token?: string | null, page = 1, limit = 6) => {
    const res = await fetch(`/api/front-end/wishlist?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: getWishlistHeaders(token),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to load wishlist" }));
      throw new Error(err.message || "Failed to load wishlist");
    }
    return res.json();
  },

  add: async (token: string | null | undefined, productId: number) => {
    const res = await fetch("/api/front-end/wishlist", {
      method: "POST",
      headers: getWishlistHeaders(token),
      body: JSON.stringify({ productId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to add to wishlist" }));
      throw new Error(err.message || "Failed to add to wishlist");
    }
    return res.json();
  },

  remove: async (token: string | null | undefined, productId: number) => {
    const res = await fetch(`/api/front-end/wishlist/${productId}`, {
      method: "DELETE",
      headers: getWishlistHeaders(token),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to remove from wishlist" }));
      throw new Error(err.message || "Failed to remove from wishlist");
    }
    return res.json();
  },
};
