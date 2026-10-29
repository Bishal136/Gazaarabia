export interface CreateReviewPayload {
  orderItemId: number;
  productId: number;
  rating: number;
  comment?: string;
  variantId?: number | null;
  images?: string[];
  video?: string | null;
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string;
  images?: string[];
  video?: string | null;
}

export const reviewService = {
  // Get reviews list (optionally for a specific product)
  getAll: async (token?: string, productId?: number) => {
    let url = "/api/front-end/reviews";
    if (productId) url += `?productId=${productId}`;

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch reviews");
    return res.json();
  },

  // Get single review by ID
  getById: async (token: string, id: number) => {
    const res = await fetch(`/api/front-end/reviews/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch review");
    return res.json();
  },

  // Get customer's "To Be Reviewed" items and "Review History"
  getMyReviews: async (token: string) => {
    const res = await fetch("/api/front-end/reviews/my", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.message || "Failed to fetch customer reviews");
    }
    return data;
  },

  // Create a new review
  create: async (token: string, data: CreateReviewPayload) => {
    const res = await fetch("/api/front-end/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const responseData = await res.json();
    if (!res.ok) {
      throw new Error(responseData?.message || "Failed to create review");
    }
    return responseData;
  },

  // Update an existing review
  update: async (token: string, id: number, data: UpdateReviewPayload) => {
    const res = await fetch(`/api/front-end/reviews/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const responseData = await res.json();
    if (!res.ok) {
      throw new Error(responseData?.message || "Failed to update review");
    }
    return responseData;
  },

  // Delete a review
  remove: async (token: string, id: number) => {
    const res = await fetch(`/api/front-end/reviews/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const responseData = await res.json();
    if (!res.ok) {
      throw new Error(responseData?.message || "Failed to delete review");
    }
    return responseData;
  },
};
