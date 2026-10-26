import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

// GET all subcategories with optional search (Protected)
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
      return NextResponse.json({ success: false, message: "DB not connected" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");

    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    if (categoryId) {
      query.categoryId = Number(categoryId);
    }

    const subcategories = await db
      .collection("subcategories")
      .find(query)
      .sort({ id: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      message:
        subcategories.length === 0
          ? "No subcategories found."
          : "Subcategories fetched successfully.",
      data: subcategories,
    });
  } catch (error: any) {
    console.error("GET Subcategories Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch subcategories." },
      { status: 500 }
    );
  }
}

// Create new subcategory (Protected)
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

    const { name, slug, categoryId } = await req.json();

    if (!name || !slug || !categoryId) {
      return NextResponse.json(
        { success: false, message: "Name, slug, and categoryId are required." },
        { status: 400 }
      );
    }

    const lastSub = await db
      .collection("subcategories")
      .find()
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = (lastSub[0]?.id || 0) + 1;

    const newSubcategory = {
      id: nextId,
      name: name.trim(),
      slug: slug.trim(),
      categoryId: Number(categoryId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("subcategories").insertOne(newSubcategory);

    return NextResponse.json(
      {
        success: true,
        message: "Subcategory created successfully.",
        data: newSubcategory,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST Subcategory Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create subcategory." },
      { status: 500 }
    );
  }
}
