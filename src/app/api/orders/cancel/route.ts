import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { checkAuth } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { ledgerService } from "@/lib/services/ledgerService";
// @ts-ignore - Import from separate email flows file
import { sendOrderCancellationEmail } from "@/lib/helpers/emailFlows9-14";

const prisma: any = new PrismaClient();

// CANCEL ORDER (Admin only)
export async function POST(req: NextRequest) {
  const userId = await checkAuth(req);
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is admin
    const user = await prisma.users.findUnique({
      where: { id: Number(userId) },
      include: { role: true },
    });

    if (!user || user.role?.name?.toLowerCase() !== "admin") {
      return NextResponse.json({ message: "Forbidden: Admin only" }, { status: 403 });
    }

    const { orderId, reason } = await req.json();

    if (!orderId) {
      return NextResponse.json({ message: "orderId required" }, { status: 400 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;

    // Fetch current order with user info and items
    const order = await prisma.orders.findUnique({
      where: { id: Number(orderId) },
      include: {
        user: { select: { id: true, name: true, email: true } },
        orderItems: true,
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // 1. Mark order items as cancelled so stock calculations restore inventory
    if (db) {
      await db.collection("orders_item").updateMany(
        { orderId: order.id },
        {
          $set: {
            returnStatus: "cancelled",
            cancelledAt: new Date(),
          },
        }
      );

      // 2. Claw back pending balances from sellers for cancelled items
      for (const item of (order.orderItems || [])) {
        if (item.sellerId && item.sellerEarning > 0) {
          await db.collection("sellers").updateOne(
            { id: item.sellerId },
            { $inc: { pendingBalance: -item.sellerEarning } }
          );

          // Record line item refund/cancellation in ledger
          await ledgerService.recordItemRefund({
            orderId: order.id,
            orderItemId: item.id,
            sellerId: item.sellerId,
            refundAmount: item.subtotal || 0,
            sellerClawback: item.sellerEarning || 0,
            platformCommissionReversal: item.commissionAmount || 0,
            reason: reason || "Admin order cancellation",
          });
        }
      }
    }

    // 3. Update order status to cancelled
    const cancelledOrder = await prisma.orders.update({
      where: { id: Number(orderId) },
      data: {
        status: "cancelled",
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // 4. Send cancellation email
    await sendOrderCancellationEmail({
      to: cancelledOrder.user?.email,
      orderId: cancelledOrder.id,
      reason: reason || "Cancelled by admin",
      userId: cancelledOrder.user?.id,
    });

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully and inventory restored",
      order: cancelledOrder,
    });
  } catch (error: any) {
    console.error("Order cancellation error:", error);
    return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
  }
}
