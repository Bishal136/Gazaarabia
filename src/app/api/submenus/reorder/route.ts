import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { checkAuth } from "@/lib/authToken";

const prisma: any = new PrismaClient();

/**
 * PUT /api/submenus/reorder
 * 
 * Reorder submenus within the same menu using a transaction.
 * 
 * Body:
 * {
 *   "menuId": number,
 *   "items": [
 *     { "id": number, "position": number }
 *   ]
 * }
 */
export async function PUT(req: NextRequest) {
  const userId = await checkAuth(req);
  if (!userId)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  // Verify admin role
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user || user.role.name.toLowerCase() !== "admin") {
    return NextResponse.json(
      { success: false, message: "Only admins can reorder submenus" },
      { status: 403 }
    );
  }

  try {
    const { menuId, items } = await req.json();

    // Validation
    if (!menuId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "menuId and items array are required" },
        { status: 400 }
      );
    }

    // Verify menu exists
    const menu = await prisma.menus.findUnique({
      where: { id: Number(menuId) },
    });

    if (!menu) {
      return NextResponse.json(
        { success: false, message: "Menu not found" },
        { status: 404 }
      );
    }

    // Verify all submenus belong to this menu
    const submenuIds = items.map((item) => item.id);
    const existingSubmenus = await prisma.submenus.findMany({
      where: {
        id: { in: submenuIds },
        menuId: Number(menuId),
      },
    });

    if (existingSubmenus.length !== items.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Some submenus do not belong to the specified menu",
        },
        { status: 400 }
      );
    }

    // Use transaction with two-phase update to avoid unique constraint conflicts
    // Phase 1: Assign temporary positions (10000 + index) to avoid collisions
    // Phase 2: Assign final positions
    const updated = await prisma.$transaction(async (tx: any) => {
      // Phase 1: Set temporary positions
      const tempUpdates = items.map((item, index) =>
        tx.submenus.update({
          where: { id: Number(item.id) },
          data: { position: 10000 + index },
        })
      );
      await Promise.all(tempUpdates);

      // Phase 2: Set final positions
      const finalUpdates = items.map((item) =>
        tx.submenus.update({
          where: { id: Number(item.id) },
          data: { position: Number(item.position) },
        })
      );
      return Promise.all(finalUpdates);
    });

    // Re-fetch all submenus for the menu to return normalized data
    const allSubmenus = await prisma.submenus.findMany({
      where: { menuId: Number(menuId) },
      orderBy: { position: "asc" },
      include: { menu: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      success: true,
      message: "Submenus reordered successfully",
      data: allSubmenus,
    });
  } catch (err: any) {
    console.error("Error reordering submenus:", err);
    return NextResponse.json(
      {
        success: false,
        message: err.message || "Failed to reorder submenus",
      },
      { status: 500 }
    );
  }
}
