export const orderSellerService = {
    getAll: async (token: string, search?: string, page: number = 1, limit: number = 50) => {
        let url = `/api/seller/orders?page=${page}&limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch orders");
        return res.json();
    },

    updateStatus: async (token: string, orderId: number, status: string, trackingNumber?: string) => {
        const res = await fetch(`/api/seller/orders/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ orderId, status, trackingNumber }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
            throw new Error(data.message || "Failed to update order status");
        }
        return data;
    },
};
