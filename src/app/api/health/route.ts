import { NextResponse } from "next/server";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

export async function GET() {
  try {
    await connectToDatabase();
    const readyState = mongoose.connection.readyState;
    const db = mongoose.connection.db;

    if (!db || readyState !== 1) {
      return NextResponse.json(
        {
          status: "error",
          database: "mongodb",
          readyState,
          message: "MongoDB connection is not ready",
        },
        { status: 500 }
      );
    }

    const [userCount, productCount, categoryCount] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("products").countDocuments(),
      db.collection("categories").countDocuments(),
    ]);

    return NextResponse.json({
      status: "healthy",
      database: "mongodb",
      readyState,
      counts: {
        users: userCount,
        products: productCount,
        categories: categoryCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "mongodb",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
