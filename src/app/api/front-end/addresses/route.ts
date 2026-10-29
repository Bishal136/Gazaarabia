import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/authToken";

export async function GET(req: Request) {
  const userId = await checkAuth(req);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { userId: Number(userId) },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(addresses);
}

export async function POST(req: Request) {
  const userId = await checkAuth(req);
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const address = await prisma.address.create({
    data: {
      ...body,
      userId: Number(userId),
    },
  });

  return NextResponse.json(address);
}
