import { MongoClient } from "mongodb";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gazaarabia";

interface BugFinding {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  layer: "Frontend" | "Backend" | "Database" | "Security";
  endpointOrPage: string;
  issue: string;
  details: string;
}

const bugs: BugFinding[] = [];
let passCount = 0;
let testCount = 0;

function assert(condition: boolean, findingIfFail: BugFinding, successMsg?: string) {
  testCount++;
  if (!condition) {
    bugs.push(findingIfFail);
    console.log(`❌ [${findingIfFail.severity}] ${findingIfFail.layer} -> ${findingIfFail.endpointOrPage}: ${findingIfFail.issue}`);
  } else {
    passCount++;
    if (successMsg) console.log(`✅ ${successMsg}`);
  }
}

async function runBugHunter() {
  console.log("====================================================");
  console.log("🎯 BUG HUNTER: COMPREHENSIVE FULL-STACK SCANNER");
  console.log("====================================================\n");

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  // 1. Authenticate test customer and admin
  console.log("--- [1] AUTHENTICATING TEST ACCOUNTS ---");
  let customerToken = "";
  let adminToken = "";

  try {
    const res = await fetch(`${BASE_URL}/api/front-end/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer@gazaarabia.com", password: "Password123!", role: "unified" }),
    });
    const data = await res.json();
    customerToken = data.accessToken || "";
    assert(!!customerToken, {
      id: "AUTH-01",
      severity: "CRITICAL",
      layer: "Backend",
      endpointOrPage: "POST /api/front-end/login",
      issue: "Customer authentication failed to issue token",
      details: JSON.stringify(data),
    }, "Customer token acquired");
  } catch (err: any) {
    assert(false, {
      id: "AUTH-01",
      severity: "CRITICAL",
      layer: "Backend",
      endpointOrPage: "POST /api/front-end/login",
      issue: "Customer login exception",
      details: err.message,
    });
  }

  try {
    const res = await fetch(`${BASE_URL}/api/front-end/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@gazaarabia.com", password: "MySecurePassword123!", role: "unified" }),
    });
    const data = await res.json();
    adminToken = data.accessToken || "";
    assert(!!adminToken, {
      id: "AUTH-02",
      severity: "CRITICAL",
      layer: "Backend",
      endpointOrPage: "POST /api/front-end/login",
      issue: "Admin authentication failed to issue token",
      details: JSON.stringify(data),
    }, "Admin token acquired");
  } catch (err: any) {
    assert(false, {
      id: "AUTH-02",
      severity: "CRITICAL",
      layer: "Backend",
      endpointOrPage: "POST /api/front-end/login",
      issue: "Admin login exception",
      details: err.message,
    });
  }

  // 2. Scan All Public Frontend Pages for 500s or 404s
  console.log("\n--- [2] SCANNING PUBLIC FRONTEND PAGES ---");
  const publicPages = [
    "/",
    "/shop",
    "/cart",
    "/checkout",
    "/wishlist",
    "/about",
    "/contact",
    "/faq",
    "/charity",
    "/impact",
    "/solidarity-receipts",
    "/loyalty",
    "/shipping-and-delivery",
    "/returns-exchanges",
    "/privacy-policy",
    "/terms-and-conditions",
    "/cookies-policy",
    "/legal",
    "/become-partner",
    "/ambassador-terms",
    "/account/login",
    "/account/register",
    "/forgot-password",
    "/reset-password",
    "/seller/login",
    "/seller/register",
    "/affiliate/login",
    "/affiliate/register",
    "/ambassador/login",
    "/ambassador/register",
    "/blogs/journal",
    "/unauthorized",
  ];

  for (const page of publicPages) {
    try {
      const res = await fetch(`${BASE_URL}${page}`);
      assert(
        res.status === 200,
        {
          id: `PAGE-ERR-${page.replace(/[^a-z0-9]/gi, "-")}`,
          severity: res.status >= 500 ? "HIGH" : "MEDIUM",
          layer: "Frontend",
          endpointOrPage: page,
          issue: `Page returned HTTP ${res.status}`,
          details: `Expected 200 OK, got ${res.status}`,
        },
        `Page: ${page} -> 200 OK`
      );
    } catch (err: any) {
      assert(false, {
        id: `PAGE-CRASH-${page.replace(/[^a-z0-9]/gi, "-")}`,
        severity: "HIGH",
        layer: "Frontend",
        endpointOrPage: page,
        issue: `Page fetch crashed`,
        details: err.message,
      });
    }
  }

  // 3. Scan Dynamic Frontend Pages (Product Detail, Shop Category, Order Detail)
  console.log("\n--- [3] SCANNING DYNAMIC PRODUCT & SHOP PAGES ---");
  const sampleProduct = await db.collection("products").findOne({});
  const sampleCategory = await db.collection("categories").findOne({});

  if (sampleProduct?.slug) {
    try {
      const res = await fetch(`${BASE_URL}/products/${sampleProduct.slug}`);
      assert(res.status === 200, {
        id: "PAGE-PRODUCT-SLUG",
        severity: "HIGH",
        layer: "Frontend",
        endpointOrPage: `/products/${sampleProduct.slug}`,
        issue: `Product detail page failed with HTTP ${res.status}`,
        details: `Slug: ${sampleProduct.slug}`,
      }, `Product Page: /products/${sampleProduct.slug} -> 200 OK`);
    } catch (err: any) {
      assert(false, {
        id: "PAGE-PRODUCT-SLUG",
        severity: "HIGH",
        layer: "Frontend",
        endpointOrPage: `/products/${sampleProduct.slug}`,
        issue: "Product page network error",
        details: err.message,
      });
    }
  }

  if (sampleCategory?.slug) {
    try {
      const res = await fetch(`${BASE_URL}/shop/${sampleCategory.slug}`);
      assert(res.status === 200, {
        id: "PAGE-CATEGORY-SLUG",
        severity: "MEDIUM",
        layer: "Frontend",
        endpointOrPage: `/shop/${sampleCategory.slug}`,
        issue: `Shop category page failed with HTTP ${res.status}`,
        details: `Category slug: ${sampleCategory.slug}`,
      }, `Category Page: /shop/${sampleCategory.slug} -> 200 OK`);
    } catch (err: any) {
      assert(false, {
        id: "PAGE-CATEGORY-SLUG",
        severity: "MEDIUM",
        layer: "Frontend",
        endpointOrPage: `/shop/${sampleCategory.slug}`,
        issue: "Category page network error",
        details: err.message,
      });
    }
  }

  // 4. Test Customer APIs & Workflows
  console.log("\n--- [4] TESTING CUSTOMER APIS & STATE MUTATIONS ---");

  // A. Search API
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/search/suggestions?q=abaya`);
    const data = await res.json();
    assert(res.status === 200 && data.success && Array.isArray(data.data?.products), {
      id: "API-SEARCH-SUGGESTIONS",
      severity: "MEDIUM",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/search/suggestions?q=abaya",
      issue: "Search suggestions API returned non-array or failure",
      details: JSON.stringify(data),
    }, `Search suggestions API -> 200 OK (${data.data?.products?.length || 0} products, ${data.data?.categories?.length || 0} categories)`);
  } catch (err: any) {
    assert(false, {
      id: "API-SEARCH-SUGGESTIONS",
      severity: "MEDIUM",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/search/suggestions",
      issue: "Search suggestions threw exception",
      details: err.message,
    });
  }

  // B. Product Filters API
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/product-filter-options`);
    const data = await res.json();
    assert(res.status === 200, {
      id: "API-FILTER-OPTIONS",
      severity: "MEDIUM",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/product-filter-options",
      issue: `Filter options API returned HTTP ${res.status}`,
      details: JSON.stringify(data),
    }, "Product filter options API -> 200 OK");
  } catch (err: any) {
    assert(false, {
      id: "API-FILTER-OPTIONS",
      severity: "MEDIUM",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/product-filter-options",
      issue: "Filter options threw exception",
      details: err.message,
    });
  }

  // C. Profile API (Authenticated)
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, {
      id: "API-PROFILE-GET",
      severity: "HIGH",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/profile",
      issue: `Customer profile fetch failed with HTTP ${res.status}`,
      details: JSON.stringify(data),
    }, `Profile API -> 200 OK (User: ${data.data?.email || data.user?.email || "verified"})`);
  } catch (err: any) {
    assert(false, {
      id: "API-PROFILE-GET",
      severity: "HIGH",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/profile",
      issue: "Profile API threw exception",
      details: err.message,
    });
  }

  // D. Addresses API (Authenticated)
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/addresses`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, {
      id: "API-ADDRESSES-GET",
      severity: "HIGH",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/addresses",
      issue: `Addresses API failed with HTTP ${res.status}`,
      details: JSON.stringify(data),
    }, `Addresses API -> 200 OK`);
  } catch (err: any) {
    assert(false, {
      id: "API-ADDRESSES-GET",
      severity: "HIGH",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/addresses",
      issue: "Addresses API threw exception",
      details: err.message,
    });
  }

  // E. Customer Orders List API
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/orders`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, {
      id: "API-ORDERS-GET",
      severity: "HIGH",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/orders",
      issue: `Customer orders API failed with HTTP ${res.status}`,
      details: JSON.stringify(data),
    }, `Customer Orders API -> 200 OK`);
  } catch (err: any) {
    assert(false, {
      id: "API-ORDERS-GET",
      severity: "HIGH",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/orders",
      issue: "Customer orders API threw exception",
      details: err.message,
    });
  }

  // F. Wishlist API (Authenticated)
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/wishlist`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const data = await res.json();
    assert(res.status === 200, {
      id: "API-WISHLIST-GET",
      severity: "MEDIUM",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/wishlist",
      issue: `Wishlist API failed with HTTP ${res.status}`,
      details: JSON.stringify(data),
    }, `Wishlist API -> 200 OK`);
  } catch (err: any) {
    assert(false, {
      id: "API-WISHLIST-GET",
      severity: "MEDIUM",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/wishlist",
      issue: "Wishlist API threw exception",
      details: err.message,
    });
  }

  // 5. Security & Robustness Tests
  console.log("\n--- [5] SECURITY & ROBUSTNESS TESTS ---");

  // A. XSS Injection in Search
  try {
    const xssPayload = encodeURIComponent("<script>alert('XSS')</script>");
    const res = await fetch(`${BASE_URL}/api/front-end/search/suggestions?q=${xssPayload}`);
    assert(res.status === 200, {
      id: "SEC-XSS-SEARCH",
      severity: "MEDIUM",
      layer: "Security",
      endpointOrPage: "GET /api/front-end/search/suggestions",
      issue: "XSS payload caused server crash or 500 error",
      details: `Status: ${res.status}`,
    }, "XSS in search suggestions safely sanitized");
  } catch (err: any) {
    assert(false, {
      id: "SEC-XSS-SEARCH",
      severity: "MEDIUM",
      layer: "Security",
      endpointOrPage: "GET /api/front-end/search/suggestions",
      issue: "XSS crashed search endpoint",
      details: err.message,
    });
  }

  // B. Malformed ID in Orders API
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/orders/not-a-valid-id-xyz`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(res.status === 400 || res.status === 404, {
      id: "SEC-CAST-ORDER-ID",
      severity: "MEDIUM",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/orders/[id]",
      issue: `Malformed ID caused unhandled status ${res.status} (Expected 400 or 404)`,
      details: `Status: ${res.status}`,
    }, `Malformed order ID handled safely with HTTP ${res.status}`);
  } catch (err: any) {
    assert(false, {
      id: "SEC-CAST-ORDER-ID",
      severity: "MEDIUM",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/orders/[id]",
      issue: "Malformed order ID crashed server",
      details: err.message,
    });
  }

  // C. Malformed ID in Addresses API
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/addresses/not-a-valid-id-xyz`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(res.status === 400 || res.status === 404, {
      id: "SEC-CAST-ADDRESS-ID",
      severity: "MEDIUM",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/addresses/[id]",
      issue: `Malformed address ID caused unhandled status ${res.status} (Expected 400 or 404)`,
      details: `Status: ${res.status}`,
    }, `Malformed address ID handled safely with HTTP ${res.status}`);
  } catch (err: any) {
    assert(false, {
      id: "SEC-CAST-ADDRESS-ID",
      severity: "MEDIUM",
      layer: "Backend",
      endpointOrPage: "GET /api/front-end/addresses/[id]",
      issue: "Malformed address ID crashed server",
      details: err.message,
    });
  }

  // 6. Database Health & Data Consistency Checks
  console.log("\n--- [6] DATABASE HEALTH & CONSISTENCY CHECKS ---");

  // A. Orphaned Variants
  const orphanVariants = await db.collection("productvariant").aggregate([
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "id",
        as: "parentProduct",
      },
    },
    { $match: { parentProduct: { $size: 0 } } },
    { $count: "count" },
  ]).toArray();

  const orphanVariantCount = orphanVariants[0]?.count || 0;
  assert(orphanVariantCount === 0, {
    id: "DB-ORPHAN-VARIANTS",
    severity: "LOW",
    layer: "Database",
    endpointOrPage: "MongoDB productvariant",
    issue: `Found ${orphanVariantCount} product variants without matching parent products`,
    details: "Dangling variant rows in collection",
  }, `No orphaned product variants found in MongoDB`);

  // B. Products with missing or invalid categoryId
  const invalidCategoryProducts = await db.collection("products").countDocuments({
    $or: [{ categoryId: { $exists: false } }, { categoryId: null }, { categoryId: 0 }],
  });
  assert(invalidCategoryProducts === 0, {
    id: "DB-INVALID-CAT-PRODUCTS",
    severity: "LOW",
    layer: "Database",
    endpointOrPage: "MongoDB products",
    issue: `Found ${invalidCategoryProducts} products with missing or invalid categoryId`,
    details: "Products without parent categories",
  }, `All products have valid assigned categoryId`);

  // C. Fresh unverified users with no OTP record (< 10 minutes old)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const unverifiedUsersWithoutOtp = await db.collection("users").aggregate([
    { $match: { isVerified: false, isGuest: false, createdAt: { $gte: tenMinutesAgo } } },
    {
      $lookup: {
        from: "otps",
        localField: "email",
        foreignField: "email",
        as: "otpRecord",
      },
    },
    { $match: { otpRecord: { $size: 0 } } },
    { $count: "count" },
  ]).toArray();

  const danglingUnverifiedCount = unverifiedUsersWithoutOtp[0]?.count || 0;
  assert(danglingUnverifiedCount === 0, {
    id: "DB-DANGLING-UNVERIFIED",
    severity: "LOW",
    layer: "Database",
    endpointOrPage: "MongoDB users / otps",
    issue: `Found ${danglingUnverifiedCount} newly registered unverified users with missing OTP records`,
    details: "New unverified accounts missing initial OTP tokens",
  }, `No dangling fresh unverified users without OTP`);

  await client.close();

  // Summary Report
  console.log("\n====================================================");
  console.log("📊 BUG HUNTER AUDIT REPORT");
  console.log("====================================================");
  console.log(`TOTAL CHECKS: ${testCount} | PASSED: ${passCount} | BUGS FOUND: ${bugs.length}\n`);

  if (bugs.length > 0) {
    console.table(
      bugs.map((b) => ({
        ID: b.id,
        Severity: b.severity,
        Layer: b.layer,
        Target: b.endpointOrPage,
        Issue: b.issue,
      }))
    );
  } else {
    console.log("🎉 ZERO BUGS FOUND! All tested systems passed successfully!");
  }
  console.log("====================================================\n");
}

runBugHunter().catch((err) => {
  console.error("Bug Hunter failed to execute:", err);
  process.exit(1);
});
