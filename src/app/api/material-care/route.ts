import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["admin", "seller"];
  if (!user.role || !allowedRoles.includes(user.role.name.toLowerCase())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { message: "Database not connected" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();

    const query: any = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { careType: { $regex: search, $options: "i" } },
            { material: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const materialCares = await db
      .collection("material_care")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(materialCares);
  } catch (error: any) {
    console.error("GET Material Care Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch material care records" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const allowedRoles = ["admin"];
  if (!user.role || !allowedRoles.includes(user.role.name.toLowerCase())) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json(
        { message: "Database not connected" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const lastItem = await db
      .collection("material_care")
      .find()
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = (lastItem[0]?.id || 0) + 1;

    const newItem = {
      ...body,
      id: nextId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("material_care").insertOne(newItem);

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    console.error("POST Material Care Error:", error);
    return NextResponse.json(
      { message: "Failed to create material care record" },
      { status: 500 }
    );
  }
}
