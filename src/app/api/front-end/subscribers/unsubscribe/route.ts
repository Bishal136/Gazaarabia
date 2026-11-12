import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma: any = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { email, token } = await req.json();

        if (!email || typeof email !== "string") {
            return NextResponse.json(
                { success: false, message: "Valid email is required" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // If unsubscribe token is passed, verify cryptographic integrity
        if (token) {
            const secret = process.env.NEXTAUTH_SECRET || "gaza-secret-salt";
            const expectedToken = crypto
                .createHmac("sha256", secret)
                .update(normalizedEmail)
                .digest("hex")
                .slice(0, 16);

            if (token !== expectedToken) {
                return NextResponse.json(
                    { success: false, message: "Invalid or expired unsubscribe link" },
                    { status: 403 }
                );
            }
        }

        const existing = await prisma.subscriber.findUnique({
            where: { email: normalizedEmail },
        });

        if (existing) {
            await prisma.subscriber.update({
                where: { email: normalizedEmail },
                data: { isActive: false },
            });
        }

        return NextResponse.json({ success: true, message: "Successfully unsubscribed" });
    } catch (err: any) {
        console.error("Unsubscribe error:", err);
        return NextResponse.json({ success: false, message: "Failed to process unsubscribe request" }, { status: 500 });
    }
}
