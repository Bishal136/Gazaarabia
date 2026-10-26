import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

// POST - Create a new category
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
      return NextResponse.json({ success: false, message: "DB not connected" }, { status: 500 });
    }

    const { name, slug, image, description, submenuId } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Name is required." },
        { status: 400 }
      );
    }
    if (!slug || slug.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Slug is required." },
        { status: 400 }
      );
    }

    const existing = await db.collection("categories").findOne({ slug: slug.trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Category with this slug already exists." },
        { status: 409 }
      );
    }

    const lastCat = await db.collection("categories").find().sort({ id: -1 }).limit(1).toArray();
    const nextId = (lastCat[0]?.id || 0) + 1;

    const newCategory = {
      id: nextId,
      name: name.trim(),
      slug: slug.trim(),
      image: image || null,
      description: description || null,
      submenuId: submenuId ? Number(submenuId) : null,
      position: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("categories").insertOne(newCategory);
    return NextResponse.json({ success: true, data: newCategory }, { status: 201 });
  } catch (error) {
    console.error("POST Category Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create category." },
      { status: 500 }
    );
  }
}

// GET - List all categories
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

    const url = new URL(req.url);
    const submenuId = url.searchParams.get("submenuId");

    const query: any = submenuId ? { submenuId: Number(submenuId) } : {};
    const sort: any = submenuId ? { position: 1 } : { id: -1 };

    const categories = await db.collection("categories").find(query).sort(sort).toArray();
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("GET Category Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch categories." },
      { status: 500 }
    );
  }
}
