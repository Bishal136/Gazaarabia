import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { checkAuth } from "@/lib/authToken";
import { stripe } from "@/lib/stripe";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { ledgerService } from "@/lib/services/ledgerService";
// @ts-ignore - Import from separate email flows file
import { sendRefundConfirmationEmail } from "@/lib/helpers/emailFlows9-14";

const prisma: any = new PrismaClient();

// PROCESS REFUND (Admin only with line-item discount apportionment & Stripe API integration)
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

    const { orderId, orderItemId, refundAmount: customRefundAmount, reason } = await req.json();

    if (!orderId) {
      return NextResponse.json({ message: "orderId required" }, { status: 400 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ message: "Database connection failed" }, { status: 500 });
    }

    // Fetch order with user info and all order items
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

    let calculatedRefundAmount = 0;
    let sellerClawbackTotal = 0;
    let commissionReversalTotal = 0;

    const totalOrderItemsGross = order.orderItems.reduce(
      (sum: number, item: any) => sum + (item.subtotal || item.price * item.quantity),
      0
    );

    // Scenario A: Single Item Refund
    if (orderItemId) {
      const targetItem = order.orderItems.find((i: any) => i.id === Number(orderItemId));
      if (!targetItem) {
        return NextResponse.json({ message: "OrderItem not found in this order" }, { status: 404 });
      }

      // Proportional discount allocation
      const itemGross = targetItem.subtotal || targetItem.price * targetItem.quantity;
      const discountRatio = totalOrderItemsGross > 0 ? itemGross / totalOrderItemsGross : 0;
      const itemDiscountShare = (order.discountTotal || 0) * discountRatio;
      const netPaidItemAmount = Math.max(0, itemGross - itemDiscountShare);

      calculatedRefundAmount = customRefundAmount ? Number(customRefundAmount) : Number(netPaidItemAmount.toFixed(2));
      sellerClawbackTotal = targetItem.sellerEarning || 0;
      commissionReversalTotal = targetItem.commissionAmount || 0;

      // Update OrderItem status in DB
      await db.collection("orders_item").updateOne(
        { id: targetItem.id },
        {
          $set: {
            returnStatus: "refunded",
            refundedAmount: calculatedRefundAmount,
            refundedAt: new Date(),
          },
        }
      );

      // Claw back seller pending balance
      if (targetItem.sellerId && sellerClawbackTotal > 0) {
        await db.collection("sellers").updateOne(
          { id: targetItem.sellerId },
          { $inc: { pendingBalance: -sellerClawbackTotal } }
        );
      }

      // Double-entry ledger entry
      await ledgerService.recordItemRefund({
        orderId: order.id,
        orderItemId: targetItem.id,
        sellerId: targetItem.sellerId,
        refundAmount: calculatedRefundAmount,
        sellerClawback: sellerClawbackTotal,
        platformCommissionReversal: commissionReversalTotal,
        reason: reason || "Admin line-item refund",
      });
    } else {
      // Scenario B: Full Order Refund
      calculatedRefundAmount = customRefundAmount ? Number(customRefundAmount) : order.totalAmount;

      for (const item of order.orderItems) {
        sellerClawbackTotal += item.sellerEarning || 0;
        commissionReversalTotal += item.commissionAmount || 0;

        await db.collection("orders_item").updateOne(
          { id: item.id },
          {
            $set: {
              returnStatus: "refunded",
              refundedAmount: item.subtotal || 0,
              refundedAt: new Date(),
            },
          }
        );

        if (item.sellerId && item.sellerEarning > 0) {
          await db.collection("sellers").updateOne(
            { id: item.sellerId },
            { $inc: { pendingBalance: -item.sellerEarning } }
          );
        }

        await ledgerService.recordItemRefund({
          orderId: order.id,
          orderItemId: item.id,
          sellerId: item.sellerId,
          refundAmount: item.subtotal || 0,
          sellerClawback: item.sellerEarning || 0,
          platformCommissionReversal: item.commissionAmount || 0,
          reason: reason || "Full order cancellation/refund",
        });
      }
    }

    // Call Stripe API to refund payment if paid via Stripe
    let stripeRefundId: string | null = null;
    if (
      order.paymentMethod === "stripe" &&
      order.transactionId &&
      !order.transactionId.startsWith("pi_mock") &&
      calculatedRefundAmount > 0
    ) {
      try {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: order.transactionId,
          amount: Math.round(calculatedRefundAmount * 100),
          reason: "requested_by_customer",
          metadata: {
            orderId: order.id.toString(),
            orderItemId: orderItemId ? orderItemId.toString() : "all",
            adminUserId: userId.toString(),
          },
        });
        stripeRefundId = stripeRefund.id;
      } catch (stripeErr: any) {
        console.error("Stripe refund call warning:", stripeErr.message);
        // Continue DB update even if gateway requires manual intervention
      }
    }

    // Determine new overall order status
    const unrefundedCount = await db.collection("orders_item").countDocuments({
      orderId: order.id,
      returnStatus: { $ne: "refunded" },
    });

    const newPaymentStatus = unrefundedCount === 0 ? "refunded" : "partially_refunded";

    const refundedOrder = await prisma.orders.update({
      where: { id: Number(orderId) },
      data: {
        status: newPaymentStatus,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Send refund confirmation email
    if (refundedOrder.user?.email) {
      await sendRefundConfirmationEmail({
        to: refundedOrder.user.email,
        orderId: refundedOrder.id,
        refundAmount: Number(calculatedRefundAmount),
        paymentMethod: order.paymentMethod || "Unknown",
        userId: refundedOrder.user.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Refund of £${calculatedRefundAmount.toFixed(2)} processed successfully.`,
      paymentStatus: newPaymentStatus,
      stripeRefundId,
      order: refundedOrder,
    });
  } catch (error: any) {
    console.error("Refund processing error:", error);
    return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
  }
}
