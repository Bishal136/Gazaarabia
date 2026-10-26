import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authToken";
import { connectToDatabase, mongoose } from "@/lib/mongoose";
import { sendReturnStatusEmail } from "@/lib/helpers/emailHelper";

// GET — Single Return Request
export async function GET(req: NextRequest, context: any) {
  try {
    const { params } = await context;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!user.role || user.role.name.toLowerCase() !== "seller") {
      return NextResponse.json({ success: false, message: "Seller Only" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ success: false, message: "Database not connected" }, { status: 500 });
    }

    const seller = await db.collection("sellers").findOne({ userId: user.id });
    if (!seller) {
      return NextResponse.json({ success: false, message: "Seller profile not found" }, { status: 404 });
    }

    const request = await db.collection("return_requests").findOne({ id: Number(params.id) });
    if (!request) {
      return NextResponse.json({ success: false, message: "Return request not found" }, { status: 404 });
    }

    const [customer, order, orderItem] = await Promise.all([
      db.collection("users").findOne({ id: request.userId }),
      db.collection("orders").findOne({ id: request.orderId }),
      db.collection("orders_item").findOne({ id: request.orderItemId }),
    ]);

    let product = null;
    let variant = null;
    if (orderItem) {
      product = await db.collection("products").findOne({ id: orderItem.productId });
      if (orderItem.variantId) {
        variant = await db.collection("productvariant").findOne({ id: orderItem.variantId });
      }
    }

    const enriched = {
      ...request,
      user: customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null,
      order: order ? { id: order.id, createdAt: order.createdAt } : null,
      orderItem: orderItem ? {
        ...orderItem,
        product: product ? { title: product.title, productimage: [] } : null,
        variant: variant || null,
      } : null,
    };

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error("GET return request error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch" }, { status: 500 });
  }
}

// PATCH — Update Status
export async function PATCH(req: NextRequest, context: any) {
  try {
    const { params } = await context;
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!user.role || user.role.name.toLowerCase() !== "seller") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ success: false, message: "Database not connected" }, { status: 500 });
    }

    const { status, adminNote, refundAmount } = await req.json();

    const request = await db.collection("return_requests").findOne({ id: Number(params.id) });
    if (!request) {
      return NextResponse.json({ success: false, message: "Return request not found" }, { status: 404 });
    }

    await db.collection("return_requests").updateOne(
      { id: Number(params.id) },
      {
        $set: {
          status,
          adminNote: adminNote || null,
          refundAmount: refundAmount || null,
          updatedAt: new Date(),
        },
      }
    );

    if (request.orderItemId) {
      await db.collection("orders_item").updateOne(
        { id: request.orderItemId },
        {
          $set: {
            returnStatus: status,
            refundedAmount: refundAmount || null,
            updatedAt: new Date(),
          },
        }
      );
    }

    const customer = await db.collection("users").findOne({ id: request.userId });

    if (customer?.email) {
      try {
        await sendReturnStatusEmail({
          to: customer.email,
          userId: customer.id,
          orderItemId: request.orderItemId,
          status,
          adminNote,
          refundAmount,
        });
      } catch (e) {
        console.error("Failed to send return status email:", e);
      }
    }

    const updated = await db.collection("return_requests").findOne({ id: Number(params.id) });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PATCH return request error:", error);
    return NextResponse.json({ success: false, message: "Failed to update status" }, { status: 500 });
  }
}
