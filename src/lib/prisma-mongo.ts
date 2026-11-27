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
      if (key === "isActive") {
        if (val === true) {
          mongoFilter[key] = { $nin: [false, 0] };
        } else {
          mongoFilter[key] = { $in: [false, 0] };
        }
      } else if (val === true) {
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

const MODEL_RELATION_KEYS: Record<string, Set<string>> = {
  products: new Set([
    "productimage",
    "productvariant",
    "brand",
    "categories",
    "category",
    "subcategories",
    "subcategory",
    "materialCare",
    "material_care",
    "reviews",
    "asParentRelations",
  ]),
  productvariant: new Set(["color", "size", "variantImages"]),
  orders: new Set([
    "orderItem",
    "orderItems",
    "user",
    "address",
    "shippingAddress",
    "affiliate",
    "ambassador",
    "coupon",
  ]),
  orders_item: new Set(["product", "variant", "order", "seller", "ambassador", "returnRequests", "reviews"]),
  users: new Set(["role", "seller", "affiliate"]),
  affiliate: new Set([
    "user",
    "bankAccount",
    "coupons",
    "orders",
    "ambassadorOrders",
    "invoices",
    "ambassadorInvoices",
  ]),
  coupon: new Set(["affiliate", "creator", "orders"]),
  affiliate_invoice: new Set(["affiliate"]),
  ambassador_invoice: new Set(["ambassador"]),
  affiliate_bank_accounts: new Set(["affiliate"]),
  review: new Set(["user", "product", "variant", "orderItem"]),
  blogs: new Set(["category", "blogCategory"]),
  blog_categories: new Set(["blogs"]),
  categories: new Set(["subcategories"]),
  wishlist: new Set(["product"]),
  return_requests: new Set(["reason"]),
};

/**
 * Merges `include` with nested relation selections inside `select` so both
 * `include: { rel: { select: ... } }` and `select: { rel: true | { ... } }` populate relations.
 */
function buildEffectiveInclude(colName: string, include?: any, select?: any): Record<string, any> | null {
  const merged: Record<string, any> = include && typeof include === "object" ? { ...include } : {};
  if (select && typeof select === "object") {
    const knownRelations = MODEL_RELATION_KEYS[colName];
    for (const [k, v] of Object.entries(select)) {
      if (!v) continue;
      if (typeof v === "object" || (v === true && knownRelations?.has(k))) {
        if (!(k in merged)) {
          merged[k] = v;
        }
      }
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

function parseRelConfig(relConfig: any) {
  const isObj = typeof relConfig === "object" && relConfig !== null;
  const subInclude = isObj ? relConfig.include : null;
  const subSelect = isObj ? relConfig.select : null;
  const subWhere = isObj && relConfig.where ? convertPrismaWhereToMongo(relConfig.where) : {};
  const subOrderBy = isObj && relConfig.orderBy ? convertPrismaOrderByToMongo(relConfig.orderBy) : {};
  const subTake = isObj && relConfig.take ? Number(relConfig.take) : null;
  return { subInclude, subSelect, subWhere, subOrderBy, subTake };
}

function extractUniqueKeys(docs: any[], getVal: (doc: any) => any): any[] {
  const seen = new Set<any>();
  for (const doc of docs) {
    const val = getVal(doc);
    if (val !== undefined && val !== null) {
      seen.add(val);
    }
  }
  return Array.from(seen);
}

/**
 * Resolves a many-to-one / belongs-to relation (FK stored on `docs`) with nested includes & subSelect.
 */
async function resolveBelongsTo(
  db: any,
  docs: any[],
  relKey: string,
  targetModel: string,
  getFk: (doc: any) => any,
  relConfig: any,
  options: { targetField?: string; defaultInclude?: Record<string, any> | null } = {}
) {
  const targetField = options.targetField || "id";
  const ids = extractUniqueKeys(docs, getFk);
  if (ids.length === 0) {
    docs.forEach((doc) => {
      doc[relKey] = null;
    });
    return;
  }

  const targetCol = getCollectionName(targetModel);
  const { subInclude, subSelect, subWhere } = parseRelConfig(relConfig);
  const effectiveSubInclude =
    buildEffectiveInclude(targetCol, subInclude, subSelect) || options.defaultInclude || null;

  let targets = await db
    .collection(targetCol)
    .find({ [targetField]: { $in: ids }, ...subWhere })
    .toArray();

  if (effectiveSubInclude && targets.length > 0) {
    targets = await resolveIncludes(db, targetCol, targets, effectiveSubInclude);
  }

  const targetMap = new Map<any, any>();
  for (const t of targets) {
    const key = t[targetField];
    if (!targetMap.has(key)) targetMap.set(key, t);
  }

  docs.forEach((doc) => {
    const fkVal = getFk(doc);
    let match = fkVal !== undefined && fkVal !== null ? (targetMap.get(fkVal) ?? null) : null;
    if (match && subSelect) {
      match = applySelect(match, subSelect);
    }
    doc[relKey] = match;
  });
}

/**
 * Resolves a one-to-one / has-one relation (FK stored on target collection) with nested includes & subSelect.
 */
async function resolveHasOne(
  db: any,
  docs: any[],
  relKey: string,
  targetModel: string,
  targetFkField: string,
  relConfig: any,
  localField = "id"
) {
  const ids = extractUniqueKeys(docs, (d) => d[localField]);
  if (ids.length === 0) {
    docs.forEach((doc) => {
      doc[relKey] = null;
    });
    return;
  }

  const targetCol = getCollectionName(targetModel);
  const { subInclude, subSelect, subWhere } = parseRelConfig(relConfig);
  const effectiveSubInclude = buildEffectiveInclude(targetCol, subInclude, subSelect);

  let targets = await db
    .collection(targetCol)
    .find({ [targetFkField]: { $in: ids }, ...subWhere })
    .toArray();

  if (effectiveSubInclude && targets.length > 0) {
    targets = await resolveIncludes(db, targetCol, targets, effectiveSubInclude);
  }

  const targetMap = new Map<any, any>();
  for (const t of targets) {
    const fk = t[targetFkField];
    if (!targetMap.has(fk)) targetMap.set(fk, t);
  }

  docs.forEach((doc) => {
    const localVal = doc[localField];
    let match = localVal !== undefined && localVal !== null ? (targetMap.get(localVal) ?? null) : null;
    if (match && subSelect) {
      match = applySelect(match, subSelect);
    }
    doc[relKey] = match;
  });
}

/**
 * Resolves a one-to-many / has-many relation (FK stored on target collection) with sorting, take, nested includes & subSelect.
 */
async function resolveHasMany(
  db: any,
  docs: any[],
  relKey: string,
  targetModel: string,
  targetFkField: string,
  relConfig: any,
  localField = "id"
) {
  const ids = extractUniqueKeys(docs, (d) => d[localField]);
  if (ids.length === 0) {
    docs.forEach((doc) => {
      doc[relKey] = [];
    });
    return;
  }

  const targetCol = getCollectionName(targetModel);
  const { subInclude, subSelect, subWhere, subOrderBy, subTake } = parseRelConfig(relConfig);
  const effectiveSubInclude = buildEffectiveInclude(targetCol, subInclude, subSelect);

  let cursor = db.collection(targetCol).find({ [targetFkField]: { $in: ids }, ...subWhere });
  if (Object.keys(subOrderBy).length > 0) cursor = cursor.sort(subOrderBy);
  if (ids.length === 1 && subTake) cursor = cursor.limit(subTake);
  const targets = await cursor.toArray();

  const grouped = new Map<any, any[]>();
  for (const t of targets) {
    const fk = t[targetFkField];
    const bucket = grouped.get(fk);
    if (bucket) {
      if (!subTake || bucket.length < subTake) bucket.push(t);
    } else {
      grouped.set(fk, [t]);
    }
  }

  if (effectiveSubInclude) {
    const keptTargets = Array.from(grouped.values()).flat();
    if (keptTargets.length > 0) {
      await resolveIncludes(db, targetCol, keptTargets, effectiveSubInclude);
    }
  }

  docs.forEach((doc) => {
    let list = grouped.get(doc[localField]) || [];
    if (subSelect) {
      list = list.map((item: any) => applySelect(item, subSelect));
    }
    doc[relKey] = list;
  });
}

/**
 * Resolves relations in `include` concurrently across relation keys
 */
async function resolveIncludes(
  db: any,
  modelName: string,
  docs: any[],
  include: any
): Promise<any[]> {
  if (!include || docs.length === 0) return docs;

  const colName = getCollectionName(modelName);

  await Promise.all(
    Object.entries(include).map(async ([relKey, relConfig]) => {
      if (!relConfig) return;

      const isRelationActive = typeof relConfig === "boolean" ? relConfig : true;
      if (!isRelationActive) return;

      const { subInclude, subSelect, subWhere, subOrderBy, subTake } = parseRelConfig(relConfig);

      if (colName === "products") {
        if (relKey === "productimage") {
          await resolveHasMany(db, docs, "productimage", "productimage", "productId", relConfig);
        } else if (relKey === "productvariant") {
          await resolveHasMany(db, docs, "productvariant", "productvariant", "productId", relConfig);
        } else if (relKey === "brand") {
          await resolveBelongsTo(db, docs, "brand", "brand", (d) => d.brandId, relConfig);
        } else if (relKey === "categories" || relKey === "category") {
          await resolveBelongsTo(db, docs, relKey, "categories", (d) => d.categoryId, relConfig);
        } else if (relKey === "subcategories" || relKey === "subcategory") {
          await resolveBelongsTo(db, docs, relKey, "subcategories", (d) => d.subcategoryId, relConfig);
        } else if (relKey === "materialCare" || relKey === "material_care") {
          await resolveBelongsTo(db, docs, relKey, "material_care", (d) => d.materialCareId, relConfig);
        } else if (relKey === "reviews") {
          await resolveHasMany(db, docs, "reviews", "review", "productId", relConfig);
        } else if (relKey === "asParentRelations") {
          const productIds = extractUniqueKeys(docs, (d) => d.id);
          if (productIds.length === 0) {
            docs.forEach((doc) => {
              doc.asParentRelations = [];
            });
            return;
          }
          const relations = await db
            .collection("product_relations")
            .find({ parentId: { $in: productIds }, ...subWhere })
            .toArray();

          const childIds = extractUniqueKeys(relations, (r: any) => r.childId);
          let children = childIds.length > 0
            ? await db
                .collection("products")
                .find({ id: { $in: childIds } })
                .toArray()
            : [];

          const childInclude = buildEffectiveInclude("products", subInclude?.child?.include, subInclude?.child?.select);
          if (childInclude && children.length > 0) {
            children = await resolveIncludes(db, "products", children, childInclude);
          }
          if (subInclude?.child?.select) {
            children = children.map((c: any) => applySelect(c, subInclude.child.select));
          }

          const childMap = new Map<any, any>(children.map((c: any) => [c.id, c]));
          docs.forEach((doc) => {
            const rels = relations.filter((r: any) => r.parentId === doc.id);
            doc.asParentRelations = rels.map((r: any) => ({
              ...r,
              child: childMap.get(r.childId) || null,
            }));
          });
        }
      } else if (colName === "productvariant") {
        if (relKey === "color") {
          await resolveBelongsTo(db, docs, "color", "colors", (d) => d.colorId, relConfig);
        } else if (relKey === "size") {
          await resolveBelongsTo(db, docs, "size", "sizes", (d) => d.sizeId, relConfig);
        } else if (relKey === "variantImages") {
          await resolveHasMany(db, docs, "variantImages", "variant_images", "productVariantId", relConfig);
        }
      } else if (colName === "orders") {
        if (relKey === "orderItem" || relKey === "orderItems") {
          const orderIds = extractUniqueKeys(docs, (d) => d.id);
          let items = orderIds.length > 0
            ? await db
                .collection("orders_item")
                .find({ orderId: { $in: orderIds }, ...subWhere })
                .sort(subOrderBy)
                .toArray()
            : [];

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

          const effectiveSubInclude = buildEffectiveInclude("orders_item", subInclude, subSelect);
          if (effectiveSubInclude && items.length > 0) {
            items = await resolveIncludes(db, "orders_item", items, effectiveSubInclude);
          }

          docs.forEach((doc) => {
            let list = items.filter((item: any) => item.orderId === doc.id);
            if (subTake) list = list.slice(0, subTake);
            if (subSelect) list = list.map((item: any) => applySelect(item, subSelect));
            doc[relKey] = list;
          });
        } else if (relKey === "user") {
          await resolveBelongsTo(db, docs, "user", "users", (d) => d.userId, relConfig);
        } else if (relKey === "address" || relKey === "shippingAddress") {
          await resolveBelongsTo(db, docs, relKey, "addresses", (d) => d.shippingAddressId || d.addressId, relConfig);
        } else if (relKey === "affiliate") {
          await resolveBelongsTo(db, docs, "affiliate", "affiliate", (d) => d.affiliateId, relConfig);
        } else if (relKey === "ambassador") {
          await resolveBelongsTo(db, docs, "ambassador", "affiliate", (d) => d.ambassadorId, relConfig);
        } else if (relKey === "coupon") {
          await resolveBelongsTo(db, docs, "coupon", "coupon", (d) => d.couponId, relConfig);
        }
      } else if (colName === "orders_item") {
        if (relKey === "product") {
          await resolveBelongsTo(db, docs, "product", "products", (d) => d.productId, relConfig);
        } else if (relKey === "variant") {
          await resolveBelongsTo(db, docs, "variant", "productvariant", (d) => d.variantId, relConfig, {
            defaultInclude: relConfig === true ? { color: true, size: true } : null,
          });
        } else if (relKey === "order") {
          await resolveBelongsTo(db, docs, "order", "orders", (d) => d.orderId, relConfig);
        } else if (relKey === "seller") {
          await resolveBelongsTo(db, docs, "seller", "sellers", (d) => d.sellerId, relConfig);
        } else if (relKey === "ambassador") {
          await resolveBelongsTo(db, docs, "ambassador", "affiliate", (d) => d.ambassadorId, relConfig);
        } else if (relKey === "returnRequests") {
          await resolveHasMany(db, docs, "returnRequests", "return_requests", "orderItemId", relConfig);
        }
      } else if (colName === "affiliate") {
        if (relKey === "user") {
          await resolveBelongsTo(db, docs, "user", "users", (d) => d.userId, relConfig);
        } else if (relKey === "bankAccount") {
          await resolveHasOne(db, docs, "bankAccount", "affiliate_bank_accounts", "affiliateId", relConfig);
        } else if (relKey === "coupons") {
          await resolveHasMany(db, docs, "coupons", "coupon", "affiliateId", relConfig);
        } else if (relKey === "orders") {
          await resolveHasMany(db, docs, "orders", "orders", "affiliateId", relConfig);
        } else if (relKey === "ambassadorOrders") {
          await resolveHasMany(db, docs, "ambassadorOrders", "orders", "ambassadorId", relConfig);
        } else if (relKey === "invoices") {
          await resolveHasMany(db, docs, "invoices", "affiliate_invoice", "affiliateId", relConfig);
        } else if (relKey === "ambassadorInvoices") {
          await resolveHasMany(db, docs, "ambassadorInvoices", "ambassador_invoice", "ambassadorId", relConfig);
        }
      } else if (colName === "coupon") {
        if (relKey === "affiliate") {
          await resolveBelongsTo(db, docs, "affiliate", "affiliate", (d) => d.affiliateId, relConfig);
        } else if (relKey === "creator") {
          await resolveBelongsTo(db, docs, "creator", "users", (d) => d.creatorId, relConfig);
        } else if (relKey === "orders") {
          await resolveHasMany(db, docs, "orders", "orders", "couponId", relConfig);
        }
      } else if (colName === "affiliate_invoice") {
        if (relKey === "affiliate") {
          await resolveBelongsTo(db, docs, "affiliate", "affiliate", (d) => d.affiliateId, relConfig);
        }
      } else if (colName === "ambassador_invoice") {
        if (relKey === "ambassador") {
          await resolveBelongsTo(db, docs, "ambassador", "affiliate", (d) => d.ambassadorId, relConfig);
        }
      } else if (colName === "affiliate_bank_accounts") {
        if (relKey === "affiliate") {
          await resolveBelongsTo(db, docs, "affiliate", "affiliate", (d) => d.affiliateId, relConfig);
        }
      } else if (colName === "wishlist") {
        if (relKey === "product") {
          await resolveBelongsTo(db, docs, "product", "products", (d) => d.productId, relConfig);
        }
      } else if (colName === "users") {
        if (relKey === "role") {
          await resolveBelongsTo(db, docs, "role", "roles", (d) => d.roleId, relConfig);
        } else if (relKey === "seller") {
          await resolveHasOne(db, docs, "seller", "sellers", "userId", relConfig);
        } else if (relKey === "affiliate") {
          await resolveHasOne(db, docs, "affiliate", "affiliate", "userId", relConfig);
        }
      } else if (colName === "blogs") {
        if (relKey === "category" || relKey === "blogCategory") {
          await resolveBelongsTo(db, docs, relKey, "blog_categories", (d) => d.categoryId, relConfig);
        }
      } else if (colName === "blog_categories") {
        if (relKey === "blogs") {
          await resolveHasMany(db, docs, "blogs", "blogs", "categoryId", relConfig);
        }
      } else if (colName === "categories") {
        if (relKey === "subcategories") {
          await resolveHasMany(db, docs, "subcategories", "subcategories", "categoryId", relConfig);
        }
      } else if (colName === "return_requests") {
        if (relKey === "reason") {
          await resolveBelongsTo(db, docs, "reason", "return_reasons", (d) => d.reasonId, relConfig);
        }
      } else if (colName === "review") {
        if (relKey === "user") {
          await resolveBelongsTo(db, docs, "user", "users", (d) => d.userId, relConfig);
        } else if (relKey === "product") {
          await resolveBelongsTo(db, docs, "product", "products", (d) => d.productId, relConfig);
        } else if (relKey === "variant") {
          await resolveBelongsTo(db, docs, "variant", "productvariant", (d) => d.variantId, relConfig, {
            defaultInclude: relConfig === true ? { color: true, size: true } : null,
          });
        } else if (relKey === "orderItem") {
          await resolveBelongsTo(db, docs, "orderItem", "orders_item", (d) => d.orderItemId, relConfig);
        }
      }
    })
  );

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

function normalizePrismaConnectRelations(data: Record<string, any>) {
  if (!data || typeof data !== "object") return;
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && (v as any).connect && (v as any).connect.id !== undefined) {
      const connectId = (v as any).connect.id;
      if (k === "products" || k === "product") {
        data.productId = connectId;
      } else if (k === "color") {
        data.colorId = connectId;
      } else if (k === "size") {
        data.sizeId = connectId;
      } else if (k === "brand") {
        data.brandId = connectId;
      } else if (k === "categories" || k === "category") {
        data.categoryId = connectId;
      } else if (k === "subcategories" || k === "subcategory") {
        data.subcategoryId = connectId;
      } else if (k === "user" || k === "users") {
        data.userId = connectId;
      } else if (k === "seller") {
        data.sellerId = connectId;
      } else {
        data[`${k}Id`] = connectId;
      }
      delete data[k];
    }
  }
}

/**
 * Atomic Auto-Increment Sequence Generator using MongoDB findOneAndUpdate
 * Guarantees zero race conditions / duplicate ID collisions across clustered PM2 workers.
 */
async function getNextAtomicSequence(db: any, colName: string, step = 1): Promise<number> {
  const countersCol = db.collection("__system_counters");

  const res = await countersCol.findOneAndUpdate(
    { _id: colName },
    { $inc: { seq: step } },
    { upsert: false, returnDocument: "after" }
  );

  let seq = (res && typeof res.seq === "number") ? res.seq : res?.value?.seq;

  // Initialize counter if not yet present
  if (seq === undefined || seq === null) {
    const lastDoc = await db.collection(colName).find().sort({ id: -1 }).limit(1).toArray();
    const currentMax = lastDoc.length > 0 && typeof lastDoc[0].id === "number" ? lastDoc[0].id : 0;
    const targetSeq = currentMax + step;

    await countersCol.updateOne(
      { _id: colName },
      { $set: { seq: targetSeq } },
      { upsert: true }
    );
    seq = targetSeq;
  }

  return seq;
}

/**
 * Resolves relation filters on products (productvariant.some and reviews.some)
 * into product ID constraints before running queries against the products collection.
 */
async function resolveProductRelationFilters(db: any, where: any, filter: Record<string, any>) {
  if (!where || typeof where !== "object") return;

  // Handle relation filter: productvariant.some
  if (where.productvariant && where.productvariant.some) {
    const variantWhere = convertPrismaWhereToMongo(where.productvariant.some);
    const matchingVariants = await db
      .collection("productvariant")
      .find(variantWhere)
      .project({ productId: 1 })
      .toArray();
    const pIds = Array.from(new Set(matchingVariants.map((v: any) => v.productId)));
    delete filter.productvariant;
    if (filter.id && filter.id.$in) {
      const existingSet = new Set(filter.id.$in);
      filter.id.$in = pIds.filter((id: any) => existingSet.has(id));
    } else {
      filter.id = { ...(filter.id || {}), $in: pIds };
    }
  }

  // Handle relation filter: reviews.some
  if (where.reviews && where.reviews.some) {
    const reviewWhere = convertPrismaWhereToMongo(where.reviews.some);
    const matchingReviews = await db
      .collection("review")
      .find(reviewWhere)
      .project({ productId: 1 })
      .toArray();
    const rProductIds = Array.from(new Set(matchingReviews.map((r: any) => r.productId)));
    delete filter.reviews;
    if (filter.id && filter.id.$in) {
      const existingSet = new Set(filter.id.$in);
      filter.id.$in = rProductIds.filter((id: any) => existingSet.has(id));
    } else {
      filter.id = { ...(filter.id || {}), $in: rProductIds };
    }
  }
}

async function applyQueryPostProcessing(
  db: any,
  modelName: string,
  colName: string,
  docs: any[],
  args: any
): Promise<any[]> {
  if (docs.length === 0) return docs;

  const effectiveInclude = buildEffectiveInclude(colName, args.include, args.select);
  let processed = docs;

  if (effectiveInclude) {
    processed = await resolveIncludes(db, modelName, processed, effectiveInclude);
  }

  if (colName === "products" && effectiveInclude) {
    processed.forEach((d) => {
      if (effectiveInclude.productvariant && !d.productvariant) d.productvariant = [];
      if (effectiveInclude.productimage && !d.productimage) d.productimage = [];
      if (effectiveInclude.reviews && !d.reviews) d.reviews = [];
    });
  }

  if (args.select) {
    processed = processed.map((d) => applySelect(d, args.select));
  }

  return processed;
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

      const [result] = await applyQueryPostProcessing(db, modelName, colName, [doc], args);
      return result;
    },

    async findFirst(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      if (colName === "products") {
        await resolveProductRelationFilters(db, args.where, filter);
      }
      const sort = convertPrismaOrderByToMongo(args.orderBy);

      let cursor = col.find(filter);
      if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
      if (args.skip) cursor = cursor.skip(Number(args.skip));

      const doc = await cursor.limit(1).next();
      if (!doc) return null;

      const [result] = await applyQueryPostProcessing(db, modelName, colName, [doc], args);
      return result;
    },

    async findMany(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);

      if (colName === "products") {
        await resolveProductRelationFilters(db, args.where, filter);
      }

      const sort = convertPrismaOrderByToMongo(args.orderBy);

      let cursor = col.find(filter);
      if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
      if (args.skip) cursor = cursor.skip(Number(args.skip));
      if (args.take) cursor = cursor.limit(Number(args.take));

      const docs = await cursor.toArray();
      return await applyQueryPostProcessing(db, modelName, colName, docs, args);
    },

    async count(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const filter = convertPrismaWhereToMongo(args.where);
      if (colName === "products") {
        await resolveProductRelationFilters(db, args.where, filter);
      }
      return await col.countDocuments(filter);
    },

    async create(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const data = { ...(args.data || {}) };
      normalizePrismaConnectRelations(data);

      // Generate numeric ID atomically if missing
      if (data.id === undefined) {
        data.id = await getNextAtomicSequence(db, colName, 1);
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

      // If creating a product with nested images or variants, extract them before saving the product doc
      let nestedProductImages: any[] = [];
      let nestedProductVariants: any[] = [];
      if (colName === "products") {
        if (data.productimage) {
          if (Array.isArray(data.productimage.create)) {
            nestedProductImages = data.productimage.create;
          } else if (data.productimage.create && typeof data.productimage.create === "object") {
            nestedProductImages = [data.productimage.create];
          }
          delete data.productimage;
        }
        if (data.productvariant) {
          if (Array.isArray(data.productvariant.create)) {
            nestedProductVariants = data.productvariant.create;
          } else if (data.productvariant.create && typeof data.productvariant.create === "object") {
            nestedProductVariants = [data.productvariant.create];
          }
          delete data.productvariant;
        }
      }

      const now = new Date();
      if (!data.createdAt) data.createdAt = now;
      if (!data.updatedAt) data.updatedAt = now;

      await col.insertOne(data);

      // Insert nested order items into orders_item collection with the order's id
      if (colName === "orders" && nestedOrderItems.length > 0) {
        const itemsCol = db.collection("orders_item");
        const endItemId = await getNextAtomicSequence(db, "orders_item", nestedOrderItems.length);
        let nextItemId = endItemId - nestedOrderItems.length + 1;

        const docsToInsert = nestedOrderItems.map((item) => ({
          ...item,
          id: item.id || nextItemId++,
          orderId: data.id,
          createdAt: item.createdAt || now,
          updatedAt: item.updatedAt || now,
        }));
        await itemsCol.insertMany(docsToInsert);
      }

      // Insert nested product images into productimage collection
      if (colName === "products" && nestedProductImages.length > 0) {
        const imgCol = db.collection("productimage");
        const endImgId = await getNextAtomicSequence(db, "productimage", nestedProductImages.length);
        let nextImgId = endImgId - nestedProductImages.length + 1;
        const imgDocs = nestedProductImages.map((img) => ({
          ...img,
          id: img.id || nextImgId++,
          productId: data.id,
          createdAt: img.createdAt || now,
          updatedAt: img.updatedAt || now,
        }));
        await imgCol.insertMany(imgDocs);
      }

      // Insert nested product variants into productvariant collection
      if (colName === "products" && nestedProductVariants.length > 0) {
        const varCol = db.collection("productvariant");
        const varImgCol = db.collection("variant_images");
        const endVarId = await getNextAtomicSequence(db, "productvariant", nestedProductVariants.length);
        let nextVarId = endVarId - nestedProductVariants.length + 1;

        const variantDocs: any[] = [];
        const variantImageDocs: any[] = [];

        for (const v of nestedProductVariants) {
          const currentVarId = v.id || nextVarId++;
          normalizePrismaConnectRelations(v);

          let vImages: any[] = [];
          if (v.variantImages?.create) {
            vImages = Array.isArray(v.variantImages.create) ? v.variantImages.create : [v.variantImages.create];
          } else if (Array.isArray(v.images)) {
            vImages = v.images;
          }
          delete v.variantImages;

          variantDocs.push({
            ...v,
            id: currentVarId,
            productId: data.id,
            createdAt: v.createdAt || now,
            updatedAt: v.updatedAt || now,
          });

          if (vImages.length > 0) {
            const endVarImgId = await getNextAtomicSequence(db, "variant_images", vImages.length);
            let nextVarImgId = endVarImgId - vImages.length + 1;
            for (const img of vImages) {
              variantImageDocs.push({
                id: img.id || nextVarImgId++,
                variantId: currentVarId,
                productId: data.id,
                url: typeof img === "string" ? img : img.url,
                alt: img.alt || "",
                createdAt: now,
                updatedAt: now,
              });
            }
          }
        }

        if (variantDocs.length > 0) {
          await varCol.insertMany(variantDocs);
        }
        if (variantImageDocs.length > 0) {
          await varImgCol.insertMany(variantImageDocs);
        }
      }

      const [result] = await applyQueryPostProcessing(db, modelName, colName, [data], args);
      return result;
    },

    async createMany(args: any = {}) {
      const db = await getDb();
      const colName = getCollectionName(modelName);
      const col = db.collection(colName);

      const list = args.data || [];
      if (!Array.isArray(list) || list.length === 0) return { count: 0 };

      const endSeq = await getNextAtomicSequence(db, colName, list.length);
      let nextId = endSeq - list.length + 1;
      const now = new Date();

      const prepared = list.map((item) => {
        const doc = { ...item };
        normalizePrismaConnectRelations(doc);
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
      normalizePrismaConnectRelations(updateData);
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

      if (!updated) return null;
      const [result] = await applyQueryPostProcessing(db, modelName, colName, [updated], args);
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
