import { connectToDatabase, mongoose } from "@/lib/mongoose";

export interface HeaderSubcategory {
  id: number;
  name: string;
  slug: string;
}

export interface HeaderCategory {
  id: number;
  name: string;
  slug: string;
  image?: string;
  subcategories: HeaderSubcategory[];
}

export interface HeaderSubmenu {
  id: number;
  name: string;
  slug: string;
  categories: HeaderCategory[];
}

export interface HeaderMenuDropdown {
  submenus: HeaderSubmenu[];
  banners: { image: string; title: string; link: string }[];
}

export interface HeaderMenuItem {
  id: number;
  name: string;
  slug: string;
  type: string;
  dropdown: HeaderMenuDropdown;
}

export interface HeaderPayload {
  success: boolean;
  headerText: string;
  data: HeaderMenuItem[];
}

let cachedHeader: { data: HeaderPayload; expiry: number } | null = null;
const HEADER_CACHE_TTL_MS = 60 * 1000;

/**
 * Fetches hierarchical navigation menus and announcement header text from MongoDB
 * with a short in-memory cache so SSR layouts and `/api/header` share one source of truth.
 */
export async function fetchHeaderData(): Promise<HeaderPayload | null> {
  const now = Date.now();
  if (cachedHeader && now < cachedHeader.expiry) {
    return cachedHeader.data;
  }

  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) {
    return null;
  }

  const [menus, submenus, categories, subcategories, blogCategories, homepage] =
    await Promise.all([
      db
        .collection("menus")
        .find()
        .project({ id: 1, name: 1, slug: 1, type: 1, images: 1, position: 1 })
        .sort({ position: 1 })
        .toArray(),
      db
        .collection("submenus")
        .find()
        .project({ id: 1, menuId: 1, name: 1, slug: 1, position: 1 })
        .sort({ position: 1 })
        .toArray(),
      db
        .collection("categories")
        .find()
        .project({ id: 1, submenuId: 1, name: 1, slug: 1, image: 1, position: 1 })
        .sort({ position: 1 })
        .toArray(),
      db
        .collection("subcategories")
        .find()
        .project({ id: 1, categoryId: 1, name: 1, slug: 1 })
        .toArray(),
      db
        .collection("blog_categories")
        .find()
        .project({ id: 1, name: 1, slug: 1 })
        .sort({ id: 1 })
        .toArray(),
      db.collection("homepage_settings").findOne({}, { projection: { headerText: 1 } }),
    ]);

  const formatted: HeaderMenuItem[] = menus.map((menu: any) => {
    if (menu.type === "blog") {
      return {
        id: menu.id,
        name: menu.name,
        slug: menu.slug,
        type: menu.type,
        dropdown: {
          submenus: [
            {
              id: 999,
              name: "Journal Topics",
              slug: "journal",
              categories: blogCategories.map((bc: any) => ({
                id: bc.id,
                name: String(bc.name || "").trim(),
                slug: bc.slug,
                image: undefined,
                subcategories: [],
              })),
            },
          ],
          banners: [],
        },
      };
    }

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

  const payload: HeaderPayload = JSON.parse(
    JSON.stringify({
      success: true,
      headerText: homepage?.headerText || "",
      data: formatted,
    })
  );

  cachedHeader = {
    data: payload,
    expiry: Date.now() + HEADER_CACHE_TTL_MS,
  };

  return payload;
}
