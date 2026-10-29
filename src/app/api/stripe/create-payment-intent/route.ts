import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/authToken";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount } = body;

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return NextResponse.json(
                { error: "Invalid payment amount" },
                { status: 400 }
            );
        }

        // 1. Authenticate user if available
        const userId = await checkAuth(req);

        let customerId: string | undefined = undefined;

        if (userId) {
            // Logged-in user: safely fetch Stripe customerId from DB
            const user = await prisma.users.findUnique({
                where: { id: Number(userId) },
                select: { stripeCustomerId: true }
            });

            customerId = user?.stripeCustomerId || undefined;
        }

        // 2. Create secure PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(numAmount * 100),
            currency: "gbp",
            customer: customerId ?? undefined,
            automatic_payment_methods: {
                enabled: true,
            },
            setup_future_usage: customerId ? "off_session" : undefined,
            metadata: {
                orderId: "pending",
                createdBy: userId ? `user_${userId}` : "guest"
            }
        });

        return NextResponse.json({
            clientSecret: paymentIntent.client_secret,
            customerEnabled: !!customerId
        });

    } catch (err: any) {
        console.error("PaymentIntent error:", err);

        const isConnectionError =
            err?.type === "StripeConnectionError" ||
            err?.message?.includes("connection to Stripe") ||
            err?.code === "ENOTFOUND" ||
            err?.code === "ETIMEDOUT";

        const userMessage = isConnectionError
            ? "Unable to connect to payment server. Please check your internet connection and try again."
            : err.message || "Failed to create PaymentIntent";

        return NextResponse.json(
            { error: userMessage, isConnectionError },
            { status: 500 }
        );
    }
}
