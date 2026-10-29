import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAuth } from "@/lib/authToken";

type RouteContext = { params: Promise<{ id: string }> };

// GET Single Address
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const addressId = Number(id);

    if (isNaN(addressId) || addressId <= 0) {
      return NextResponse.json({ message: "Invalid address ID" }, { status: 400 });
    }

    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const address = await prisma.address.findFirst({
      where: { id: addressId, userId: Number(userId) },
    });

    if (!address) {
      return NextResponse.json({ message: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: address });
  } catch (error) {
    console.error(" GET /address/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to fetch address" },
      { status: 500 }
    );
  }
}

// UPDATE Address
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const addressId = Number(id);

    if (isNaN(addressId) || addressId <= 0) {
      return NextResponse.json({ message: "Invalid address ID" }, { status: 400 });
    }

    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const {
      firstName,
      lastName,
      company,
      address1,
      address2,
      city,
      country,
      postalCode,
      phone,
      isDefault,
    } = body;

    const dataToUpdate: any = {};
    if (firstName !== undefined) dataToUpdate.firstName = String(firstName).trim();
    if (lastName !== undefined) dataToUpdate.lastName = String(lastName).trim();
    if (company !== undefined) dataToUpdate.company = String(company).trim();
    if (address1 !== undefined) dataToUpdate.address1 = String(address1).trim();
    if (address2 !== undefined) dataToUpdate.address2 = String(address2).trim();
    if (city !== undefined) dataToUpdate.city = String(city).trim();
    if (country !== undefined) dataToUpdate.country = String(country).trim();
    if (postalCode !== undefined) dataToUpdate.postalCode = String(postalCode).trim();
    if (phone !== undefined) dataToUpdate.phone = String(phone).trim();
    if (isDefault !== undefined) dataToUpdate.isDefault = Boolean(isDefault);

    if (dataToUpdate.isDefault) {
      await prisma.address.updateMany({
        where: { userId: Number(userId), NOT: { id: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.updateMany({
      where: { id: addressId, userId: Number(userId) },
      data: dataToUpdate,
    });

    if (!updated.count) {
      return NextResponse.json({ message: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Address updated successfully" });
  } catch (error) {
    console.error(" PUT /address/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to update address" },
      { status: 500 }
    );
  }
}

//  DELETE Address
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const addressId = Number(id);

    if (isNaN(addressId) || addressId <= 0) {
      return NextResponse.json({ message: "Invalid address ID" }, { status: 400 });
    }

    const userId = await checkAuth(req);
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const deleted = await prisma.address.deleteMany({
      where: { id: addressId, userId: Number(userId) },
    });

    if (!deleted.count) {
      return NextResponse.json({ message: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error(" DELETE /address/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to delete address" },
      { status: 500 }
    );
  }
}
