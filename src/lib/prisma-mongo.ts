import { connectToDatabase, mongoose } from "./mongoose";

/**
 * ==============================================================================
 * GAZAARABIA UNIVERSAL PRISMA-TO-MONGODB COMPATIBILITY ADAPTER
 * ==============================================================================
 * Intercepts Prisma queries across all 50+ models and translates them directly
 * to native MongoDB collection operations with zero MySQL dependency.
 * ==============================================================================
 */

// Model name to MongoDB collection name lookup
const MODEL_TO_COLLECTION: Record<string, string> = {
  roles: "roles",
  role: "roles",
  users: "users",
  user: "users",
  sellers: "sellers",
  seller: "sellers",
  storesyncs: "store_syncs",
  storesync: "store_syncs",
  store_syncs: "store_syncs",
  sellerpayouts: "seller_payouts",
  seller_payouts: "seller_payouts",
  platformsettings: "platform_settings",
  platformsetting: "platform_settings",
  platform_settings: "platform_settings",
  categorycommissions: "category_commissions",
  categorycommission: "category_commissions",
  category_commissions: "category_commissions",
  subcategorycommissions: "subcategory_commission",
  subcategorycommission: "subcategory_commission",
  subcategory_commission: "subcategory_commission",
  sizes: "sizes",
  size: "sizes",
  colors: "colors",
  color: "colors",
  categories: "categories",
  category: "categories",
  subcategories: "subcategories",
  subcategory: "subcategories",
  materialcare: "material_care",
  material_care: "material_care",
  deliveryoptions: "delivery_options",
  deliveryoption: "delivery_options",
  delivery_options: "delivery_options",
  blogcategories: "blog_categories",
  blogcategory: "blog_categories",
  blog_categories: "blog_categories",
  blogs: "blogs",
  blog: "blogs",
  productimages: "productimage",
  productimage: "productimage",
  productvariants: "productvariant",
  productvariant: "productvariant",
  variantimages: "variant_images",
  variantimage: "variant_images",
  variant_images: "variant_images",
  addresses: "addresses",
  address: "addresses",
  wishlist: "wishlist",
  wishlists: "wishlist",
  carts: "carts",
  cart: "carts",
  orders: "orders",
  order: "orders",
  orders_item: "orders_item",
  ordersitem: "orders_item",
  orderitem: "orders_item",
  orderitems: "orders_item",
  reviews: "review",
  review: "review",
  menus: "menus",
  menu: "menus",
  submenus: "submenus",
  submenu: "submenus",
  productrelations: "product_relations",
  productrelation: "product_relations",
  product_relations: "product_relations",
  asparentrelations: "product_relations",
  faqcategories: "faq_categories",
  faqcategory: "faq_categories",
  faq_categories: "faq_categories",
  faqs: "faqs",
  faq: "faqs",
  contactus: "contact_us",
  contact_us: "contact_us",
  affiliates: "affiliate",
  affiliate: "affiliate",
  auditlogs: "audit_log",
  auditlog: "audit_log",
  audit_log: "audit_log",
  coupons: "coupon",
  coupon: "coupon",
  affiliateinvoices: "affiliate_invoice",
  affiliateinvoice: "affiliate_invoice",
  affiliate_invoice: "affiliate_invoice",
  homepagesettings: "homepage_settings",
  homepagesetting: "homepage_settings",
  homepage_settings: "homepage_settings",
  returnreasons: "return_reasons",
  returnreason: "return_reasons",
  return_reasons: "return_reasons",
  returnrequests: "return_requests",
  returnrequest: "return_requests",
  return_requests: "return_requests",
  solidarityreceipts: "solidarity_receipts",
  solidarityreceipt: "solidarity_receipts",
  solidarity_receipts: "solidarity_receipts",
  charitydonations: "charity_donations",
  charitydonation: "charity_donations",
  charity_donations: "charity_donations",
  subscribers: "subscribers",
  subscriber: "subscribers",
  ambassadorinvoices: "ambassador_invoice",
  ambassadorinvoice: "ambassador_invoice",
  ambassador_invoice: "ambassador_invoice",
  deliverysettings: "delivery_settings",
  deliverysetting: "delivery_settings",
  delivery_settings: "delivery_settings",
  affiliatebankaccounts: "affiliate_bank_accounts",
  affiliatebankaccount: "affiliate_bank_accounts",
  affiliate_bank_accounts: "affiliate_bank_accounts",
  refreshtokens: "refresh_tokens",
  refreshtoken: "refresh_tokens",
  refresh_tokens: "refresh_tokens",
  cronlogs: "cron_logs",
  cronlog: "cron_logs",
  cron_logs: "cron_logs",
  products: "products",
  product: "products",
  notifications: "notifications",
  notification: "notifications",
  brands: "brand",
  brand: "brand",
};

export function getCollectionName(modelName: string): string {
  const normalized = modelName.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return MODEL_TO_COLLECTION[normalized] || normalized;
}

async function getDb() {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Could not connect to MongoDB database");
  }
  return db;
}

/**
 * Convert Prisma where clause to MongoDB filter
 */
export function convertPrismaWhereToMongo(where: any): any {
  if (!where || typeof where !== "object") return {};

  const mongoFilter: Record<string, any> = {};

  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;

    if (key === "OR" && Array.isArray(val)) {
      mongoFilter.$or = val.map(convertPrismaWhereToMongo);
      continue;
    }
    if (key === "AND" && Array.isArray(val)) {
      mongoFilter.$and = val.map(convertPrismaWhereToMongo);
      continue;
    }
    if (key === "NOT") {
      if (Array.isArray(val)) {
        mongoFilter.$nor = val.map(convertPrismaWhereToMongo);
      } else {
        mongoFilter.$nor = [convertPrismaWhereToMongo(val)];
      }
      continue;
    }

    if (val !== null && typeof val === "object" && !(val instanceof Date) && !Array.isArray(val)) {
      const ops: Record<string, any> = {};
      let hasOp = false;

      for (const [subKey, subVal] of Object.entries(val)) {
        if (subKey === "equals") {
          ops.$eq = subVal;
          hasOp = true;
        } else if (subKey === "not") {
          ops.$ne = subVal;
          hasOp = true;
        } else if (subKey === "in" && Array.isArray(subVal)) {
          ops.$in = subVal;
          hasOp = true;
        } else if (subKey === "notIn" && Array.isArray(subVal)) {
          ops.$nin = subVal;
          hasOp = true;
        } else if (subKey === "lt") {
          ops.$lt = subVal;
          hasOp = true;
        } else if (subKey === "lte") {
          ops.$lte = subVal;
          hasOp = true;
        } else if (subKey === "gt") {
          ops.$gt = subVal;
          hasOp = true;
        } else if (subKey === "gte") {
          ops.$gte = subVal;
          hasOp = true;
        } else if (subKey === "contains") {
          ops.$regex = subVal;
          ops.$options = "i";
          hasOp = true;
        } else if (subKey === "startsWith") {
          ops.$regex = `^${subVal}`;
          ops.$options = "i";
          hasOp = true;
        } else if (subKey === "endsWith") {
          ops.$regex = `${subVal}$`;
          ops.$options = "i";
          hasOp = true;
        } else if (subKey === "mode") {
          // Prisma case-insensitive mode, already covered by $options: 'i'
        }
      }

      if (hasOp) {
        mongoFilter[key] = ops;
      } else {
        // Nested relation or complex filter
        mongoFilter[key] = val;
      }
    } else if (typeof val === "boolean") {
      // In migrated MongoDB data, MySQL TINYINT booleans may be stored as 1/0 or true/false
      if (val === true) {
        mongoFilter[key] = { $in: [true, 1] };
      } else {
        mongoFilter[key] = { $in: [false, 0, null] };
      }
    } else {
      mongoFilter[key] = val;
    }
  }

  return mongoFilter;
}

/**
 * Convert Prisma orderBy to MongoDB sort
 */
export function convertPrismaOrderByToMongo(orderBy: any): Record<string, 1 | -1> {
  if (!orderBy) return {};
  const sort: Record<string, 1 | -1> = {};

  const orderList = Array.isArray(orderBy) ? orderBy : [orderBy];
  for (const item of orderList) {
    if (!item || typeof item !== "object") continue;
    for (const [col, dir] of Object.entries(item)) {
      sort[col] = dir === "desc" || dir === "DESC" ? -1 : 1;
    }
  }
  return sort;
}

/**
 * Resolves relations in `include`
 */
async function resolveIncludes(
  db: any,
  modelName: string,
  docs: any[],
  include: any
): Promise<any[]> {
  if (!include || docs.length === 0) return docs;

  const colName = getCollectionName(modelName);

  for (const [relKey, relConfig] of Object.entries(include)) {
    if (!relConfig) continue;

    const isRelationActive = typeof relConfig === "boolean" ? relConfig : true;
    if (!isRelationActive) continue;

    const subInclude = typeof relConfig === "object" ? relConfig.include : null;
    const subSelect = typeof relConfig === "object" ? relConfig.select : null;
    const subWhere = typeof relConfig === "object" && relConfig.where ? convertPrismaWhereToMongo(relConfig.where) : {};
    const subOrderBy = typeof relConfig === "object" && relConfig.orderBy ? convertPrismaOrderByToMongo(relConfig.orderBy) : {};
    const subTake = typeof relConfig === "object" && relConfig.take ? Number(relConfig.take) : null;

    if (colName === "products") {
      if (relKey === "productimage") {
        const productIds = docs.map((d) => d.id).filter(Boolean);
        const images = await db
          .collection("productimage")
          .find({ productId: { $in: productIds }, ...subWhere })
          .sort(subOrderBy)
          .toArray();

        docs.forEach((doc) => {
          let list = images.filter((img: any) => img.productId === doc.id);
          if (subTake) list = list.slice(0, subTake);
          doc.productimage = list;
        });
      } else if (relKey === "productvariant") {
        const productIds = docs.map((d) => d.id).filter(Boolean);
        let variants = await db
          .collection("productvariant")
          .find({ productId: { $in: productIds }, ...subWhere })
          .sort(subOrderBy)
          .toArray();

        if (subInclude) {
          variants = await resolveIncludes(db, "productvariant", variants, subInclude);
        }

        docs.forEach((doc) => {
          let list = variants.filter((v: any) => v.productId === doc.id);
          if (subTake) list = list.slice(0, subTake);
          doc.productvariant = list;
        });
      } else if (relKey === "brand") {
        const brandIds = docs.map((d) => d.brandId).filter(Boolean);
        const brands = await db
          .collection("brand")
          .find({ id: { $in: brandIds } })
          .toArray();
        docs.forEach((doc) => {
          doc.brand = brands.find((b: any) => b.id === doc.brandId) || null;
        });
      } else if (relKey === "categories" || relKey === "category") {
        const catIds = docs.map((d) => d.categoryId).filter(Boolean);
        const cats = await db
          .collection("categories")
          .find({ id: { $in: catIds } })
          .toArray();
        docs.forEach((doc) => {
          const cat = cats.find((c: any) => c.id === doc.categoryId) || null;
          doc[relKey] = cat;
        });
      } else if (relKey === "subcategories" || relKey === "subcategory") {
        const subIds = docs.map((d) => d.subcategoryId).filter(Boolean);
        const subs = await db
          .collection("subcategories")
          .find({ id: { $in: subIds } })
          .toArray();
        docs.forEach((doc) => {
          const sub = subs.find((s: any) => s.id === doc.subcategoryId) || null;
          doc[relKey] = sub;
        });
      } else if (relKey === "materialCare" || relKey === "material_care") {
        const matIds = docs.map((d) => d.materialCareId).filter(Boolean);
        const mats = await db
          .collection("material_care")
          .find({ id: { $in: matIds } })
          .toArray();
        docs.forEach((doc) => {
          doc[relKey] = mats.find((m: any) => m.id === doc.materialCareId) || null;
        });
      } else if (relKey === "reviews") {
        const productIds = docs.map((d) => d.id).filter(Boolean);
        let revs = await db
          .collection("review")
          .find({ productId: { $in: productIds }, ...subWhere })
          .sort(subOrderBy)
          .toArray();

        if (subInclude) {
          revs = await resolveIncludes(db, "reviews", revs, subInclude);
        }

        docs.forEach((doc) => {
          let list = revs.filter((r: any) => r.productId === doc.id);
          if (subTake) list = list.slice(0, subTake);
          doc.reviews = list;
        });
      } else if (relKey === "asParentRelations") {
        const productIds = docs.map((d) => d.id).filter(Boolean);
        const relations = await db
          .collection("product_relations")
          .find({ parentId: { $in: productIds }, ...subWhere })
          .toArray();

        const childIds = relations.map((r: any) => r.childId).filter(Boolean);
        let children = await db
          .collection("products")
          .find({ id: { $in: childIds } })
          .toArray();

        if (subInclude && subInclude.child && subInclude.child.include) {
          children = await resolveIncludes(db, "products", children, subInclude.child.include);
        }

        docs.forEach((doc) => {
          const rels = relations.filter((r: any) => r.parentId === doc.id);
          doc.asParentRelations = rels.map((r: any) => ({
            ...r,
            child: children.find((c: any) => c.id === r.childId) || null,
          }));
        });
      }
    } else if (colName === "productvariant") {
      if (relKey === "color") {
        const colorIds = docs.map((d) => d.colorId).filter(Boolean);
        const colors = await db
          .collection("colors")
          .find({ id: { $in: colorIds } })
          .toArray();
        docs.forEach((doc) => {
          doc.color = colors.find((c: any) => c.id === doc.colorId) || null;
        });
      } else if (relKey === "size") {
        const sizeIds = docs.map((d) => d.sizeId).filter(Boolean);
        const sizes = await db
          .collection("sizes")
          .find({ id: { $in: sizeIds } })
          .toArray();
        docs.forEach((doc) => {
          doc.size = sizes.find((s: any) => s.id === doc.sizeId) || null;
        });
      } else if (relKey === "variantImages") {
        const vIds = docs.map((d) => d.id).filter(Boolean);
        const images = await db
          .collection("variant_images")
          .find({ productVariantId: { $in: vIds }, ...subWhere })
          .sort(subOrderBy)
          .toArray();
        docs.forEach((doc) => {
          doc.variantImages = images.filter((img: any) => img.productVariantId === doc.id);
        });
      }
    } else if (colName === "orders") {
      if (relKey === "orderItem" || relKey === "orderItems") {
        const orderIds = docs.map((d) => d.id).filter(Boolean);
        let items = await db
          .collection("orders_item")
          .find({ orderId: { $in: orderIds }, ...subWhere })
          .sort(subOrderBy)
          .toArray();

        // Self-healing: if an order document has embedded items but none in orders_item, migrate them
        for (const doc of docs) {
          const docItems = items.filter((item: any) => item.orderId === doc.id);
          if (docItems.length === 0 && doc.orderItems) {
            let embeddedList: any[] = [];
            if (Array.isArray(doc.orderItems)) {
              embeddedList = doc.orderItems;
            } else if (Array.isArray(doc.orderItems.create)) {
              embeddedList = doc.orderItems.create;
            } else if (doc.orderItems.create && typeof doc.orderItems.create === "object") {
              embeddedList = [doc.orderItems.create];
            }

            if (embeddedList.length > 0) {
              const itemsCol = db.collection("orders_item");
              const lastItem = await itemsCol.find().sort({ id: -1 }).limit(1).toArray();
              let nextItemId = lastItem.length > 0 && typeof lastItem[0].id === "number" ? lastItem[0].id + 1 : 1;
              const prepared = embeddedList.map((item) => ({
                ...item,
                id: item.id || nextItemId++,
                orderId: doc.id,
                createdAt: item.createdAt || new Date(),
                updatedAt: item.updatedAt || new Date(),
              }));
              await itemsCol.insertMany(prepared);
              await db.collection("orders").updateOne({ id: doc.id }, { $unset: { orderItems: "" } });
              items.push(...prepared);
            }
          }
        }

        if (subInclude) {
          items = await resolveIncludes(db, "orders_item", items, subInclude);
        }

        docs.forEach((doc) => {
          doc[relKey] = items.filter((item: any) => item.orderId === doc.id);
        });
      } else if (relKey === "user") {
        const userIds = docs.map((d) => d.userId).filter(Boolean);
        const users = await db
          .collection("users")
          .find({ id: { $in: userIds } })
          .toArray();
        docs.forEach((doc) => {
          doc.user = users.find((u: any) => u.id === doc.userId) || null;
        });
      } else if (relKey === "address" || relKey === "shippingAddress") {
        const addrIds = docs.map((d) => d.shippingAddressId || d.addressId).filter(Boolean);
        const addresses = await db
          .collection("addresses")
          .find({ id: { $in: addrIds } })
          .toArray();
        docs.forEach((doc) => {
          doc[relKey] = addresses.find((a: any) => a.id === (doc.shippingAddressId || doc.addressId)) || null;
        });
      }
    } else if (colName === "orders_item") {
      if (relKey === "product") {
        const pIds = docs.map((d) => d.productId).filter(Boolean);
        let prods = await db
          .collection("products")
          .find({ id: { $in: pIds } })
          .toArray();
        if (subInclude) {
          prods = await resolveIncludes(db, "products", prods, subInclude);
        }
        docs.forEach((doc) => {
          doc.product = prods.find((p: any) => p.id === doc.productId) || null;
        });
      }
    } else if (colName === "wishlist") {
      if (relKey === "product") {
        const pIds = docs.map((d) => d.productId).filter(Boolean);
        let prods = await db
          .collection("products")
          .find({ id: { $in: pIds } })
          .toArray();
        if (subInclude) {
          prods = await resolveIncludes(db, "products", prods, subInclude);
        }
        docs.forEach((doc) => {
          doc.product = prods.find((p: any) => p.id === doc.productId) || null;
        });
      }
    } else if (colName === "users") {
      if (relKey === "role") {
        const roleIds = docs.map((d) => d.roleId).filter(Boolean);
        const roles = await db
          .collection("roles")
          .find({ id: { $in: roleIds } })
          .toArray();
        docs.forEach((doc) => {
          doc.role = roles.find((r: any) => r.id === doc.roleId) || null;
        });
      } else if (relKey === "seller") {
        const userIds = docs.map((d) => d.id).filter(Boolean);
        const sellers = await db
          .collection("sellers")
          .find({ userId: { $in: userIds } })
          .toArray();
        docs.forEach((doc) => {
          doc.seller = sellers.find((s: any) => s.userId === doc.id) || null;
        });
      } else if (relKey === "affiliate") {
        const userIds = docs.map((d) => d.id).filter(Boolean);
        const affiliates = await db
          .collection("affiliate")
          .find({ userId: { $in: userIds } })
          .toArray();
        docs.forEach((doc) => {
          doc.affiliate = affiliates.find((a: any) => a.userId === doc.id) || null;
        });
      }
    } else if (colName === "categories") {
      if (relKey === "subcategories") {
        const catIds = docs.map((d) => d.id).filter(Boolean);
        const subs = await db
          .collection("subcategories")
          .find({ categoryId: { $in: catIds }, ...subWhere })
          .sort(subOrderBy)
          .toArray();
        docs.forEach((doc) => {
          doc.subcategories = subs.filter((s: any) => s.categoryId === doc.id);
        });
      }
    } else if (colName === "review") {
      if (relKey === "user") {
        const userIds = docs.map((d) => d.userId).filter(Boolean);
        const users = await db
          .collection("users")
          .find({ id: { $in: userIds } })
          .toArray();
        docs.forEach((doc) => {
          let u = users.find((x: any) => x.id === doc.userId) || null;
          if (u && subSelect) {
            const selected: any = {};
            for (const k of Object.keys(subSelect)) {
              if (subSelect[k]) selected[k] = u[k];
            }
            u = selected;
          }
          doc.user = u;
        });
      } else if (relKey === "product") {
        const productIds = docs.map((d) => d.productId).filter(Boolean);
        const products = await db
          .collection("products")
          .find({ id: { $in: productIds } })
          .toArray();
        docs.forEach((doc) => {
          let p = products.find((x: any) => x.id === doc.productId) || null;
          if (p && subSelect) {
            const selected: any = {};
            for (const k of Object.keys(subSelect)) {
              if (subSelect[k]) selected[k] = p[k];
            }
            p = selected;
          }
          doc.product = p;
        });
      } else if (relKey === "variant") {
        const variantIds = docs.map((d) => d.variantId).filter(Boolean);
        const variants = await db
          .collection("productvariant")
          .find({ id: { $in: variantIds } })
          .toArray();
        const colorIds = variants.map((v: any) => v.colorId).filter(Boolean);
        const sizeIds = variants.map((v: any) => v.sizeId).filter(Boolean);
        const colors = colorIds.length > 0 ? await db.collection("colors").find({ id: { $in: colorIds } }).toArray() : [];
        const sizes = sizeIds.length > 0 ? await db.collection("sizes").find({ id: { $in: sizeIds } }).toArray() : [];
        variants.forEach((v: any) => {
          v.color = colors.find((c: any) => c.id === v.colorId) || null;
          v.size = sizes.find((s: any) => s.id === v.sizeId) || null;
        });
        docs.forEach((doc) => {
          doc.variant = variants.find((x: any) => x.id === doc.variantId) || null;
        });
      } else if (relKey === "orderItem") {
        const orderItemIds = docs.map((d) => d.orderItemId).filter(Boolean);
        const orderItems = await db
          .collection("orders_item")
          .find({ id: { $in: orderItemIds } })
          .toArray();
        docs.forEach((doc) => {
          doc.orderItem = orderItems.find((x: any) => x.id === doc.orderItemId) || null;
        });
      }
    }
  }

  // Filter fields if `select` was specified on the root document
  return docs;
}

function applySelect(doc: any, select: any): any {
  if (!doc || !select || typeof select !== "object") return doc;
  const filtered: Record<string, any> = {};
  for (const [key, val] of Object.entries(select)) {
    if (val && key in doc) {
      filtered[key] = doc[key];
    }
  }
  return filtered;
}

/**
 * Creates a Model Delegate for a given model
 */
function createModelDelegate(modelName: string) {
  return {
    async findUnique(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      const doc = await col.findOne(filter);
      if (!doc) return null;

      let result = doc;
      const effectiveInclude = { ...(args.include || {}) };
      if (args.select) {
        for (const [k, v] of Object.entries(args.select)) {
          if (v && typeof v === "object") {
            effectiveInclude[k] = v;
          }
        }
      }

      if (Object.keys(effectiveInclude).length > 0) {
        const [enriched] = await resolveIncludes(db, modelName, [result], effectiveInclude);
        result = enriched;
      }
      if (colName === "products") {
        if (effectiveInclude.productvariant && !result.productvariant) result.productvariant = [];
        if (effectiveInclude.productimage && !result.productimage) result.productimage = [];
        if (effectiveInclude.reviews && !result.reviews) result.reviews = [];
      }
      if (args.select) {
        result = applySelect(result, args.select);
      }
      return result;
    },

    async findFirst(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      const sort = convertPrismaOrderByToMongo(args.orderBy);

      let cursor = col.find(filter);
      if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
      if (args.skip) cursor = cursor.skip(Number(args.skip));

      const doc = await cursor.limit(1).next();
      if (!doc) return null;

      let result = doc;
      const effectiveInclude = { ...(args.include || {}) };
      if (args.select) {
        for (const [k, v] of Object.entries(args.select)) {
          if (v && typeof v === "object") {
            effectiveInclude[k] = v;
          }
        }
      }

      if (Object.keys(effectiveInclude).length > 0) {
        const [enriched] = await resolveIncludes(db, modelName, [result], effectiveInclude);
        result = enriched;
      }
      if (colName === "products") {
        if (effectiveInclude.productvariant && !result.productvariant) result.productvariant = [];
        if (effectiveInclude.productimage && !result.productimage) result.productimage = [];
        if (effectiveInclude.reviews && !result.reviews) result.reviews = [];
      }
      if (args.select) {
        result = applySelect(result, args.select);
      }
      return result;
    },

    async findMany(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      let filter = convertPrismaWhereToMongo(args.where);

      // Handle relation filter: productvariant.some
      if (colName === "products" && args.where && args.where.productvariant && args.where.productvariant.some) {
        const variantWhere = convertPrismaWhereToMongo(args.where.productvariant.some);
        const matchingVariants = await db.collection("productvariant").find(variantWhere).project({ productId: 1 }).toArray();
        const pIds = matchingVariants.map((v: any) => v.productId);
        delete filter.productvariant;
        filter.id = { ...(filter.id || {}), $in: pIds };
      }

      const sort = convertPrismaOrderByToMongo(args.orderBy);

      let cursor = col.find(filter);
      if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
      if (args.skip) cursor = cursor.skip(Number(args.skip));
      if (args.take) cursor = cursor.limit(Number(args.take));

      let docs = await cursor.toArray();

      // Extract relations if select has nested relations
      const effectiveInclude = { ...(args.include || {}) };
      if (args.select) {
        for (const [k, v] of Object.entries(args.select)) {
          if (v && typeof v === "object") {
            effectiveInclude[k] = v;
          }
        }
      }

      if (Object.keys(effectiveInclude).length > 0) {
        docs = await resolveIncludes(db, modelName, docs, effectiveInclude);
      }

      // Default arrays for relations on products if requested
      if (colName === "products") {
        docs.forEach((d) => {
          if (effectiveInclude.productvariant && !d.productvariant) d.productvariant = [];
          if (effectiveInclude.productimage && !d.productimage) d.productimage = [];
          if (effectiveInclude.reviews && !d.reviews) d.reviews = [];
        });
      }

      if (args.select) {
        docs = docs.map((d) => applySelect(d, args.select));
      }

      return docs;
    },

    async count(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      return await col.countDocuments(filter);
    },

    async create(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const data = { ...(args.data || {}) };

      // Generate numeric ID if missing
      if (data.id === undefined) {
        const last = await col.find().sort({ id: -1 }).limit(1).toArray();
        data.id = last.length > 0 && typeof last[0].id === "number" ? last[0].id + 1 : 1;
      }

      // If creating an order with nested orderItems, extract them before saving the order doc
      let nestedOrderItems: any[] = [];
      if (colName === "orders" && data.orderItems) {
        if (Array.isArray(data.orderItems.create)) {
          nestedOrderItems = data.orderItems.create;
        } else if (data.orderItems.create && typeof data.orderItems.create === "object") {
          nestedOrderItems = [data.orderItems.create];
        } else if (Array.isArray(data.orderItems.createMany?.data)) {
          nestedOrderItems = data.orderItems.createMany.data;
        } else if (Array.isArray(data.orderItems)) {
          nestedOrderItems = data.orderItems;
        }
        delete data.orderItems;
      }

      const now = new Date();
      if (!data.createdAt) data.createdAt = now;
      if (!data.updatedAt) data.updatedAt = now;

      await col.insertOne(data);

      // Insert nested order items into orders_item collection with the order's id
      if (colName === "orders" && nestedOrderItems.length > 0) {
        const itemsCol = db.collection("orders_item");
        const lastItem = await itemsCol.find().sort({ id: -1 }).limit(1).toArray();
        let nextItemId = lastItem.length > 0 && typeof lastItem[0].id === "number" ? lastItem[0].id + 1 : 1;

        const docsToInsert = nestedOrderItems.map((item) => ({
          ...item,
          id: item.id || nextItemId++,
          orderId: data.id,
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || now,
        }));
        await itemsCol.insertMany(docsToInsert);
      }

      let result = data;
      if (args.include) {
        const [enriched] = await resolveIncludes(db, modelName, [result], args.include);
        result = enriched;
      }
      if (args.select) {
        result = applySelect(result, args.select);
      }
      return result;
    },

    async createMany(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const list = args.data || [];
      if (!Array.isArray(list) || list.length === 0) return { count: 0 };

      const last = await col.find().sort({ id: -1 }).limit(1).toArray();
      let nextId = last.length > 0 && typeof last[0].id === "number" ? last[0].id + 1 : 1;
      const now = new Date();

      const prepared = list.map((item) => {
        const doc = { ...item };
        if (doc.id === undefined) doc.id = nextId++;
        if (!doc.createdAt) doc.createdAt = now;
        if (!doc.updatedAt) doc.updatedAt = now;
        return doc;
      });

      const res = await col.insertMany(prepared);
      return { count: res.insertedCount };
    },

    async update(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      const updateData = { ...(args.data || {}) };
      delete updateData._id;
      delete updateData.id;
      updateData.updatedAt = new Date();

      // Separate operators if any
      const setFields: Record<string, any> = {};
      const incFields: Record<string, any> = {};

      for (const [k, v] of Object.entries(updateData)) {
        if (v && typeof v === "object" && "increment" in (v as any)) {
          incFields[k] = (v as any).increment;
        } else if (v && typeof v === "object" && "decrement" in (v as any)) {
          incFields[k] = -(v as any).decrement;
        } else {
          setFields[k] = v;
        }
      }

      const updateOps: Record<string, any> = {};
      if (Object.keys(setFields).length > 0) updateOps.$set = setFields;
      if (Object.keys(incFields).length > 0) updateOps.$inc = incFields;

      await col.updateOne(filter, updateOps);
      const updated = await col.findOne(filter);

      let result = updated;
      if (args.include && result) {
        const [enriched] = await resolveIncludes(db, modelName, [result], args.include);
        result = enriched;
      }
      if (args.select && result) {
        result = applySelect(result, args.select);
      }
      return result;
    },

    async updateMany(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      const updateData = { ...(args.data || {}) };
      delete updateData._id;
      delete updateData.id;
      updateData.updatedAt = new Date();

      const res = await col.updateMany(filter, { $set: updateData });
      return { count: res.matchedCount !== undefined ? res.matchedCount : res.modifiedCount };
    },

    async upsert(args: any = {}) {
      const existing = await this.findFirst({ where: args.where });
      if (existing) {
        return await this.update({ where: args.where, data: args.update, select: args.select, include: args.include });
      } else {
        return await this.create({ data: { ...args.where, ...args.create }, select: args.select, include: args.include });
      }
    },

    async delete(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      const doc = await col.findOne(filter);
      if (doc) {
        await col.deleteOne(filter);
      }
      return doc;
    },

    async deleteMany(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      const res = await col.deleteMany(filter);
      return { count: res.deletedCount };
    },

    async aggregate(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      const docs = await col.find(filter).toArray();

      const result: any = {};

      if (args._count) {
        if (typeof args._count === "object") {
          result._count = { id: docs.length, _all: docs.length };
          for (const [field] of Object.entries(args._count)) {
            result._count[field] = docs.length;
          }
        } else {
          result._count = docs.length;
        }
      }
      if (args._avg) {
        result._avg = {};
        for (const [field] of Object.entries(args._avg)) {
          const sum = docs.reduce((acc: number, d: any) => acc + (Number(d[field]) || 0), 0);
          result._avg[field] = docs.length > 0 ? sum / docs.length : 0;
        }
      }
      if (args._sum) {
        result._sum = {};
        for (const [field] of Object.entries(args._sum)) {
          result._sum[field] = docs.reduce((acc: number, d: any) => acc + (Number(d[field]) || 0), 0);
        }
      }

      return result;
    },

    async groupBy(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      const byFields = Array.isArray(args.by) ? args.by : [args.by];

      const groupId: Record<string, string> = {};
      byFields.forEach((f: string) => {
        groupId[f] = `$${f}`;
      });

      const pipeline: any[] = [];
      if (Object.keys(filter).length > 0) {
        pipeline.push({ $match: filter });
      }

      const groupStage: any = { _id: groupId };
      if (args._count) {
        groupStage.__count = { $sum: 1 };
      }
      if (args._avg) {
        for (const [f] of Object.entries(args._avg)) {
          groupStage[`__avg_${f}`] = { $avg: `$${f}` };
        }
      }
      if (args._sum) {
        for (const [f] of Object.entries(args._sum)) {
          groupStage[`__sum_${f}`] = { $sum: `$${f}` };
        }
      }
      pipeline.push({ $group: groupStage });

      const results = await col.aggregate(pipeline).toArray();
      return results.map((r: any) => {
        const item: any = { ...r._id };
        if (args._count) {
          const countVal = r.__count !== undefined ? r.__count : (r._count || 0);
          if (typeof args._count === "object") {
            item._count = { id: countVal, _all: countVal };
            for (const [f] of Object.entries(args._count)) {
              item._count[f] = countVal;
            }
          } else {
            item._count = countVal;
          }
        }
        if (args._avg) {
          item._avg = {};
          for (const [f] of Object.entries(args._avg)) {
            item._avg[f] = r[`__avg_${f}`] !== undefined && r[`__avg_${f}`] !== null ? r[`__avg_${f}`] : 0;
          }
        }
        if (args._sum) {
          item._sum = {};
          for (const [f] of Object.entries(args._sum)) {
            item._sum[f] = r[`__sum_${f}`] !== undefined && r[`__sum_${f}`] !== null ? r[`__sum_${f}`] : 0;
          }
        }
        return item;
      });
    },
  };
}

/**
 * Universal PrismaClient replacement delegating completely to MongoDB
 */
export class PrismaClient {
  private delegates: Map<string, any> = new Map();

  constructor(_options?: any) {
    return new Proxy(this, {
      get(target: any, prop: string | symbol) {
        if (typeof prop !== "string") return target[prop];

        if (prop in target) return target[prop];

        if (prop.startsWith("$")) {
          if (prop === "$transaction") {
            return async (arg: any) => {
              if (Array.isArray(arg)) {
                return Promise.all(arg);
              }
              if (typeof arg === "function") {
                return await arg(target);
              }
              return null;
            };
          }
          if (prop === "$queryRaw" || prop === "$queryRawUnsafe") {
            return async () => [];
          }
          if (prop === "$connect" || prop === "$disconnect") {
            return async () => {};
          }
        }

        if (!target.delegates.has(prop)) {
          target.delegates.set(prop, createModelDelegate(prop));
        }
        return target.delegates.get(prop);
      },
    });
  }
}

// Global cached client instance
declare global {
  var prismaClientMongo: PrismaClient | undefined;
}

export const prisma = global.prismaClientMongo || new PrismaClient();
if (process.env.NODE_ENV !== "production") {
  global.prismaClientMongo = prisma;
}

export const Prisma: any = {
  SortOrder: {
    asc: "asc",
    desc: "desc",
  },
};

export default prisma;
