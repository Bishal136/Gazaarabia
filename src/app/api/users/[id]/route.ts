import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getTokenFromHeader, getUserIdFromToken } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

const prisma = new PrismaClient();

//  Helper: Validate Admin
async function validateAdmin(req: Request) {
  const token: any = getTokenFromHeader(req);
  const userId = getUserIdFromToken(token);

  if (!userId) return { error: "Unauthorized", status: 401 };

  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || user.role.name.toLowerCase() !== "admin") {
    return { error: "Forbidden", status: 403 };
  }

  return { user };
}

/* -------------------------------------------------------------------------- */
/*                                  GET USER                                  */
/* -------------------------------------------------------------------------- */
// GET /api/users/[id]
export async function GET(req: Request, { params }: any) {
  const auth = await validateAdmin(req);

  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: Number(params.id) },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleId: true,
        createdAt: true,
        role: { select: { name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET User Error:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*                                  UPDATE USER                               */
/* -------------------------------------------------------------------------- */
// PUT /api/users/[id]
export async function PUT(req: Request, { params }: any) {
  const auth = await validateAdmin(req);

  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();

    //  Find roleId using role name
    const roleRecord = await prisma.roles.findFirst({
      where: { name: body.role.toLowerCase() }, // role comes as "customer" / "content_manager"
    });

    if (!roleRecord) {
      return NextResponse.json(
        { error: "Invalid role provided" },
        { status: 400 }
      );
    }

    const updateData: any = {
      name: body.name,
      phone: body.phone,
      roleId: roleRecord.id,
    };

    // Hash password before saving if provided
    if (body.password && body.password.trim() !== "") {
      updateData.password = await bcrypt.hash(body.password.trim(), 10);
    }

    const updatedUser = await prisma.users.update({
      where: { id: Number(params.id) },
      data: updateData,
    });

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("PUT User Error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

/* -------------------------------------------------------------------------- */
/*                                  DELETE USER                               */
/* -------------------------------------------------------------------------- */
// DELETE /api/users/[id]
export async function DELETE(req: Request, { params }: any) {
  const auth = await validateAdmin(req);

  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const anonymize = url.searchParams.get("anonymize") === "true";
    const targetUserId = Number(params.id);

    // If GDPR anonymization is requested for a user with historical records
    if (anonymize) {
      await prisma.users.update({
        where: { id: targetUserId },
        data: {
          name: "GDPR Redacted",
          email: `redacted_${targetUserId}_${Date.now()}@anonymized.local`,
          phone: "0000000000",
          password: "GDPR_REDACTED_ACCOUNT",
        },
      });

      // Anonymize user's shipping addresses in orders
      try {
        await connectToDatabase();
        const db = mongoose.connection.db;
        if (db) {
          await db.collection("orders").updateMany(
            { userId: targetUserId },
            {
              $set: {
                "address.name": "GDPR Redacted",
                "address.phone": "0000000000",
                "address.address": "Redacted for GDPR compliance",
              },
            }
          );
        }
      } catch (err) {
        console.warn("Could not redact order addresses:", err);
      }

      return NextResponse.json({ message: "User PII successfully anonymized under GDPR compliance" });
    }

    // A user with orders can't be hard-deleted (order history is protected at
    // the DB level). Ask the admin to anonymize or deactivate instead.
    const orderCount = await prisma.orders.count({ where: { userId: targetUserId } });
    if (orderCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a user who has orders. Use ?anonymize=true to redact customer PII for GDPR compliance." },
        { status: 409 }
      );
    }

    await prisma.users.delete({
      where: { id: targetUserId },
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    //  Safety net: FK restriction (orders / other related records).
    if (error?.code === "P2003") {
      return NextResponse.json(
        { error: "Cannot delete: user has related records. Deactivate instead." },
        { status: 409 }
      );
    }
    console.error("DELETE User Error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
