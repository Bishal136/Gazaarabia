import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = parseInt(id);
    if (isNaN(conversationId)) {
      return NextResponse.json({ message: "Invalid conversation ID" }, { status: 400 });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const roleName = user.role?.name?.toLowerCase() || "";
    if (roleName !== "admin" && roleName !== "superadmin") {
      return NextResponse.json({ message: "Forbidden: Admin access required" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database not connected" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const isFlagged = Boolean(body.isFlagged);
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    const updateDoc: any = {
      isFlagged: isFlagged,
      status: isFlagged ? "flagged" : "active",
      updatedAt: new Date(),
    };

    if (isFlagged) {
      updateDoc.flagReason = reason || "Flagged manually by admin";
      updateDoc.flaggedAt = new Date();
      updateDoc.flaggedBy = user.id;
    } else {
      updateDoc.flagReason = null;
      updateDoc.flaggedAt = null;
      updateDoc.flaggedBy = null;
    }

    const result = await db.collection("conversations").updateOne(
      { id: conversationId },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: isFlagged ? "Conversation flagged for policy review" : "Flag removed successfully",
      isFlagged,
    });
  } catch (error: any) {
    console.error("ADMIN FLAG ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
