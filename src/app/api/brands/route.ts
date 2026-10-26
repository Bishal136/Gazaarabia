import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

// GET - List all brands (with optional search)
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
        { success: false, message: "Database not connected" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";

    const query: any = search
      ? { name: { $regex: search, $options: "i" } }
      : {};

    const brands = await db
      .collection("brand")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: brands });
  } catch (error: any) {
    console.error("GET Brand Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

// POST - Create new brand
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
        { success: false, message: "Database not connected" },
        { status: 500 }
      );
    }

    const { name, logo, isTrending } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Brand name is required" },
        { status: 400 }
      );
    }

    const existing = await db
      .collection("brand")
      .findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Brand with this name already exists" },
        { status: 409 }
      );
    }

    const lastBrand = await db
      .collection("brand")
      .find()
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = (lastBrand[0]?.id || 0) + 1;

    const newBrand = {
      id: nextId,
      name: name.trim(),
      logo: logo || null,
      isTrending: Boolean(isTrending),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("brand").insertOne(newBrand);

    return NextResponse.json({ success: true, data: newBrand }, { status: 201 });
  } catch (error: any) {
    console.error("POST Brand Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create brand" },
      { status: 500 }
    );
  }
}
