import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/authToken";

export async function GET(req: Request) {
    try {
        const userId = await checkAuth(req);

        if (!userId) {
            return NextResponse.json({
                success: true,
                paymentMethods: []
            });
        }

        const user = await prisma.users.findUnique({
            where: { id: Number(userId) },
            select: { stripeCustomerId: true }
        });

        if (!user || !user.stripeCustomerId) {
            return NextResponse.json({
                success: true,
                paymentMethods: []
            });
        }

        const paymentMethods = await stripe.paymentMethods.list({
            customer: user.stripeCustomerId,
            type: "card",
        });

        return NextResponse.json({
            success: true,
            paymentMethods: paymentMethods.data || [],
        });

    } catch (error: any) {
        console.error("Error fetching saved cards:", error.message);

        return NextResponse.json({
            success: true,
            paymentMethods: [],
            warning: "Unable to fetch saved cards"
        });
    }
}
