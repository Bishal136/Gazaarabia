// src/lib/services/front-end/stripeService.ts

export const stripeService = {
    async createCustomer(token: string | null) {
        try {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/stripe/create-customer", {
                method: "POST",
                headers,
            });

            return await res.json().catch(() => ({ error: "Failed to parse response" }));
        } catch (err: any) {
            return { error: err.message || "Network error" };
        }
    },

    async getSavedMethods(token: string | null) {
        try {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/stripe/saved-methods", {
                method: "GET",
                headers,
            });

            return await res.json().catch(() => ({ paymentMethods: [], error: null }));
        } catch {
            return { paymentMethods: [], error: null };
        }
    },

    async createPaymentIntent(token: string | null, amount: number) {
        try {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/stripe/create-payment-intent", {
                method: "POST",
                headers,
                body: JSON.stringify({ amount }),
            });

            const data = await res.json().catch(() => null);
            if (!data) {
                return { error: "Payment server temporarily unreachable. Please try again." };
            }
            return data;
        } catch {
            return { error: "Network connection lost. Please check your internet connection and try again." };
        }
    },

    async payWithSavedCard(token: string | null, paymentMethodId: string, amount: number) {
        try {
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch("/api/stripe/pay-with-saved-card", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    paymentMethodId,
                    amount,
                }),
            });

            const data = await res.json().catch(() => null);
            if (!data) {
                return { error: "Payment server temporarily unreachable. Please try again." };
            }
            return data;
        } catch {
            return { error: "Network connection lost. Please check your internet connection." };
        }
    },
};
