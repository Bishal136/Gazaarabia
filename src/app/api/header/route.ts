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

// In-memory cache for high-concurrency header traffic
let cachedHeader: { data: any; expiry: number } | null = null;
const HEADER_CACHE_TTL_MS = 60 * 1000; // 60 seconds

export async function GET() {
  const now = Date.now();
  if (cachedHeader && now < cachedHeader.expiry) {
    const res = NextResponse.json(cachedHeader.data);
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res;
  }

  try {
    await connectToDatabase();
    const db = mongoose.connection.db;

    if (db) {
      const [menus, submenus, categories, subcategories, homepage] = await Promise.all([
        db.collection("menus").find().project({ id: 1, name: 1, slug: 1, type: 1, images: 1, position: 1 }).sort({ position: 1 }).toArray(),
        db.collection("submenus").find().project({ id: 1, menuId: 1, name: 1, slug: 1, position: 1 }).sort({ position: 1 }).toArray(),
        db.collection("categories").find().project({ id: 1, submenuId: 1, name: 1, slug: 1, image: 1, position: 1 }).sort({ position: 1 }).toArray(),
        db.collection("subcategories").find().project({ id: 1, categoryId: 1, name: 1, slug: 1 }).toArray(),
        db.collection("homepage_settings").findOne({}, { projection: { headerText: 1 } }),
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

      const payload = {
        success: true,
        headerText: homepage?.headerText || "",
        data: formatted,
      };

      cachedHeader = {
        data: payload,
        expiry: Date.now() + HEADER_CACHE_TTL_MS,
      };

      const res = NextResponse.json(payload);
      res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      return res;
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
