export async function getProductBySlug(token: any, slug: string) {
  try {
    const res = await fetch(`/api/front-end/product/${slug}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }), // only send token if present
      },
    });

    if (!res.ok) throw new Error("Failed to fetch product");
    return res.json();
  } catch (error) {
    console.error(" getProductBySlug error:", error);
    return null;
  }
}


export async function getAllProducts(
  search: string,
  preview: boolean = false,
  page = 1,
  limit = 12,
  filters: any = {}
) {
  try {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (preview) params.set("preview", "true");
    params.set("page", String(page));
    params.set("limit", String(limit));

    if (filters.sort) params.set("sort", filters.sort);
    if (filters.priceMin !== undefined && filters.priceMin > 0)
      params.set("priceMin", String(filters.priceMin));
    if (filters.priceMax !== undefined && filters.priceMax < 100000)
      params.set("priceMax", String(filters.priceMax));
    if (filters.rating) params.set("rating", String(filters.rating));

    (filters.availability || []).forEach((a: string) =>
      params.append("availability[]", a)
    );
    (filters.sizes || []).forEach((s: any) =>
      params.append("sizes[]", String(s))
    );
    (filters.colors || []).forEach((c: any) =>
      params.append("colors[]", String(c))
    );
    (filters.categories || []).forEach((cat: any) =>
      params.append("categories[]", String(cat))
    );
    (filters.subcategories || []).forEach((sub: any) =>
      params.append("subcategories[]", String(sub))
    );

    const res = await fetch(`/api/front-end/product?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) throw new Error("Failed to fetch product");
    return res.json();
  } catch (error) {
    console.error(" getAllProducts error:", error);
    return null;
  }
}
