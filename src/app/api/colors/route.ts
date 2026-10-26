import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

// GET all colors (Protected)
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

    const colors = await db
      .collection("colors")
      .find({})
      .sort({ id: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: colors });
  } catch (error: any) {
    console.error("GET Colors Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch colors." },
      { status: 500 }
    );
  }
}

// POST - Create new color (Protected)
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

    const { name, hexCode } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Color name is required." },
        { status: 400 }
      );
    }

    const lastColor = await db
      .collection("colors")
      .find()
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = (lastColor[0]?.id || 0) + 1;

    const newColor = {
      id: nextId,
      name: name.trim(),
      hexCode: hexCode || "#000000",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("colors").insertOne(newColor);

    return NextResponse.json(
      { success: true, message: "Color created successfully.", data: newColor },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST Color Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create color." },
      { status: 500 }
    );
  }
}
