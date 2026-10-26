import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

// GET all sizes (Protected)
export async function GET(req: any) {
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
        { error: "Database not connected" },
        { status: 500 }
      );
    }

    const sizes = await db
      .collection("sizes")
      .find({})
      .sort({ id: -1 })
      .toArray();

    return NextResponse.json(sizes);
  } catch (error: any) {
    console.error("GET Sizes Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sizes" },
      { status: 500 }
    );
  }
}

// CREATE new size (Protected)
export async function POST(req: any) {
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
        { error: "Database not connected" },
        { status: 500 }
      );
    }

    const { name } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { message: "Size name is required" },
        { status: 400 }
      );
    }

    const lastSize = await db
      .collection("sizes")
      .find()
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = (lastSize[0]?.id || 0) + 1;

    const newSize = {
      id: nextId,
      name: name.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("sizes").insertOne(newSize);

    return NextResponse.json(newSize, { status: 201 });
  } catch (error: any) {
    console.error("POST Size Error:", error);
    return NextResponse.json(
      { error: "Failed to create size" },
      { status: 500 }
    );
  }
}
