import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/authToken";

export async function GET(req: Request) {
  try {
    const userId = await checkAuth(req);

    if (!userId) {
      return NextResponse.json(
        { message: "Unauthorized or expired session" },
        { status: 401 }
      );
    }

    // Get user from DB
    const user = await prisma.users.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("Profile error:", err);
    return NextResponse.json(
      { message: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
