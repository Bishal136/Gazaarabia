import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function GET(req: NextRequest) {
  const authUser = await getAuthenticatedUser(req);
  if (!authUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const roleName = authUser.role?.name?.toLowerCase() || "";
  if (roleName !== "admin") {
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

    const ambassadors = await db
      .collection("affiliate")
      .find({ type: "ambassador", isActive: true })
      .sort({ id: -1 })
      .toArray();

    const userIds = ambassadors.map((a: any) => a.userId).filter(Boolean);
    const users = await db
      .collection("users")
      .find({ id: { $in: userIds } })
      .project({ id: 1, name: 1, email: 1 })
      .toArray();

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const data = ambassadors.map((a: any) => {
      const u = userMap.get(a.userId);
      return {
        ...a,
        user: u || { name: `Ambassador #${a.id}`, email: "" },
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET Ambassadors Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch ambassadors" },
      { status: 500 }
    );
  }
}
