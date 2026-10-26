import { NextResponse } from "next/server";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

interface Subcategory {
  id: number;
  name: string;
  slug: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string;
  subcategories: Subcategory[];
}

interface Submenu {
  id: number;
  name: string;
  slug: string;
  categories: Category[];
}

interface MenuDropdown {
  submenus: Submenu[];
  banners: { image: string; title: string; link: string }[];
}

interface FormattedMenu {
  id: number;
  name: string;
  slug: string;
  type: string;
  dropdown: MenuDropdown;
}

export async function GET() {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;

    if (db) {
      const [menus, submenus, categories, subcategories, homepage] = await Promise.all([
        db.collection("menus").find().sort({ position: 1 }).toArray(),
        db.collection("submenus").find().sort({ position: 1 }).toArray(),
        db.collection("categories").find().sort({ position: 1 }).toArray(),
        db.collection("subcategories").find().sort({ position: 1 }).toArray(),
        db.collection("homepage_settings").findOne(),
      ]);

      const formatted: FormattedMenu[] = menus.map((menu: any) => {
        const menuSubmenus = submenus.filter((s: any) => s.menuId === menu.id);
        const submenusWithCats = menuSubmenus.map((submenu: any) => {
          const subCats = categories.filter((c: any) => c.submenuId === submenu.id);
          const catsWithSub = subCats.map((cat: any) => {
            const catSubcats = subcategories.filter((sc: any) => sc.categoryId === cat.id);
            return {
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
              image: cat.image,
              subcategories: catSubcats.map((sc: any) => ({
                id: sc.id,
                name: sc.name,
                slug: sc.slug,
              })),
            };
          });
          return {
            id: submenu.id,
            name: submenu.name,
            slug: submenu.slug,
            categories: catsWithSub,
          };
        });

        const banners =
          Array.isArray(menu.images) && menu.images.length > 0
            ? menu.images.map((img: string) => ({
                image: img,
                title: menu.name,
                link: menu.type === "blog" ? "/blogs/journal" : `/shop/${menu.slug}`,
              }))
            : [];

        return {
          id: menu.id,
          name: menu.name,
          slug: menu.slug,
          type: menu.type,
          dropdown: {
            submenus: submenusWithCats,
            banners,
          },
        };
      });

      return NextResponse.json({
        success: true,
        headerText: homepage?.headerText || "",
        data: formatted,
      });
    }

    return NextResponse.json(
      { success: false, message: "Database not connected" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Header API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load header data" },
      { status: 500 }
    );
  }
}
