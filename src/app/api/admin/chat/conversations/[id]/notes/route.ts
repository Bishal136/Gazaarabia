import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export const dynamic = "force-dynamic";

async function getNextId(collection: any): Promise<number> {
  const last = await collection.find().sort({ id: -1 }).limit(1).toArray();
  return last.length > 0 && typeof last[0].id === "number" ? last[0].id + 1 : 1;
}

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

    const conversation = await db.collection("conversations").findOne({ id: conversationId });
    if (!conversation) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const noteText = typeof body.note === "string" ? body.note.trim() : "";
    if (!noteText) {
      return NextResponse.json({ message: "Note text is required" }, { status: 400 });
    }

    const newId = await getNextId(db.collection("messages"));
    const noteItem = {
      id: newId,
      adminId: user.id,
      adminName: user.name || "Platform Admin",
      note: noteText,
      createdAt: new Date(),
    };

    // Insert into messages as internal note
    const messageDoc = {
      id: newId,
      conversationId: conversationId,
      senderId: user.id,
      receiverId: 0,
      senderRole: "admin",
      isInternalAdminNote: true,
      text: noteText,
      mediaType: "system_notice",
      mediaUrls: [],
      metadata: {
        adminName: user.name || "Platform Admin",
        systemAction: "INTERNAL_ADMIN_NOTE",
      },
      isRead: true,
      readAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await Promise.all([
      db.collection("messages").insertOne(messageDoc),
      db.collection("conversations").updateOne(
        { id: conversationId },
        {
          $push: { adminNotes: noteItem as any },
          $set: { updatedAt: new Date() },
        }
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: noteItem,
    });
  } catch (error: any) {
    console.error("ADMIN ADD NOTE ERROR:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
