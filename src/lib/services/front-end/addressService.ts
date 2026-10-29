function getAuthHeaders(token?: any): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token && token !== "undefined" && token !== "null") {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export const addressService = {
  // Get all addresses of the current user
  getAll: async (token?: any) => {
    const res = await fetch("/api/front-end/addresses", {
      method: "GET",
      headers: getAuthHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to fetch addresses" }));
      throw new Error(err.message || "Failed to fetch addresses");
    }
    return res.json();
  },

  // Add a new address
  create: async (token: any, data: any) => {
    const res = await fetch("/api/front-end/addresses", {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to create address" }));
      throw new Error(err.message || "Failed to create address");
    }
    return res.json();
  },

  // Update an address
  update: async (token: any, id: number, data: any) => {
    const res = await fetch(`/api/front-end/addresses/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to update address" }));
      throw new Error(err.message || "Failed to update address");
    }
    return res.json();
  },

  // Delete an address
  remove: async (token: any, id: number) => {
    const res = await fetch(`/api/front-end/addresses/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Failed to delete address" }));
      throw new Error(err.message || "Failed to delete address");
    }
    return res.json();
  },
};
