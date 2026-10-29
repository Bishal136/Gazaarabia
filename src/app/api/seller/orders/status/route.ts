import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { sendOrderShippedEmail } from "@/lib/helpers/emailHelper";

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const roleName = (authUser.role?.name || "").toLowerCase().trim();
    if (roleName !== "seller" && roleName !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden: Seller access only" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ success: false, message: "Database connection failed" }, { status: 500 });
    }

    const body = await req.json();
    const { orderId, status, trackingNumber } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, message: "Both orderId and status are required" },
        { status: 400 }
      );
    }

    const normalizedStatus = String(status).toLowerCase().trim();
    const validStatuses = ["pending", "processing", "shipped", "dispatched", "delivered", "completed", "cancelled"];
    if (!validStatuses.includes(normalizedStatus)) {
      return NextResponse.json(
        { success: false, message: `Invalid status: '${status}'. Allowed: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const numOrderId = Number(orderId);

    // If seller, ensure this order contains items from their shop
    if (roleName === "seller") {
      const seller = await db.collection("sellers").findOne({ userId: authUser.id });
      if (!seller) {
        return NextResponse.json({ success: false, message: "Seller profile not found" }, { status: 404 });
      }

      const sellerItem = await db.collection("orders_item").findOne({
        orderId: numOrderId,
        sellerId: seller.id,
      });

      if (!sellerItem) {
        return NextResponse.json(
          { success: false, message: "You are not authorized to manage this order" },
          { status: 403 }
        );
      }
    }

    const order = await db.collection("orders").findOne({ id: numOrderId });
    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    // Update order status in orders collection
    const updateDoc: any = {
      status: normalizedStatus,
      updatedAt: new Date(),
    };
    if (trackingNumber !== undefined) {
      updateDoc.trackingNumber = trackingNumber ? String(trackingNumber).trim() : null;
    }

    await db.collection("orders").updateOne({ id: numOrderId }, { $set: updateDoc });

    // Update fulfillment on orders_item
    if (normalizedStatus === "shipped" || normalizedStatus === "dispatched" || normalizedStatus === "delivered" || normalizedStatus === "completed") {
      const itemFulfillment = normalizedStatus === "delivered" || normalizedStatus === "completed" ? "fulfilled" : "shipped";
      const itemUpdate: any = {
        fulfillmentStatus: itemFulfillment,
        updatedAt: new Date(),
      };
      if (trackingNumber) {
        itemUpdate.trackingNumber = String(trackingNumber).trim();
      }
      await db.collection("orders_item").updateMany(
        { orderId: numOrderId },
        { $set: itemUpdate }
      );
    }

    // Send shipment email if transitioning to shipped/dispatched
    if (normalizedStatus === "shipped" || normalizedStatus === "dispatched") {
      try {
        let customerEmail = order.email;
        let customerName = `${order.firstName || ""} ${order.lastName || ""}`.trim();
        if (order.userId) {
          const userDoc = await db.collection("users").findOne({ id: order.userId });
          if (userDoc) {
            customerEmail = customerEmail || userDoc.email;
            customerName = customerName || userDoc.name;
          }
        }
        if (customerEmail) {
          await sendOrderShippedEmail({
            to: customerEmail,
            name: customerName,
            userId: order.userId,
            trackingNumber: trackingNumber || order.trackingNumber || undefined,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send order shipped notification email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order #${numOrderId} status updated to ${normalizedStatus.toUpperCase()}`,
      status: normalizedStatus,
      trackingNumber: updateDoc.trackingNumber ?? order.trackingNumber ?? null,
    });
  } catch (error: any) {
    console.error("Seller order status update error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to update order status" },
      { status: 500 }
    );
  }
}
