import { MongoClient } from "mongodb";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/gazaarabia";

interface TestResult {
  suite: string;
  test: string;
  status: "PASS" | "FAIL" | "WARN";
  detail: string;
}

const results: TestResult[] = [];

function record(suite: string, test: string, status: "PASS" | "FAIL" | "WARN", detail: string) {
  results.push({ suite, test, status, detail });
  const icon = status === "PASS" ? "✅" : status === "WARN" ? "⚠️" : "❌";
  console.log(`${icon} [${suite}] ${test} -> ${status}: ${detail}`);
}

async function runBlogsFeatureAudit() {
  console.log("====================================================");
  console.log("🧪 FULLSTACK TESTER: BLOGS FEATURE COMPREHENSIVE AUDIT");
  console.log("====================================================\n");

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();

  // 1. Database Inspection
  console.log("--- [1] DATABASE COLLECTIONS & RECORDS ---");
  const blogCount = await db.collection("blogs").countDocuments();
  const catCount = await db.collection("blog_categories").countDocuments();
  record("Database", "Blogs Collection Count", blogCount > 0 ? "PASS" : "WARN", `Found ${blogCount} blogs in collection`);
  record("Database", "Blog Categories Collection Count", catCount > 0 ? "PASS" : "WARN", `Found ${catCount} categories in collection`);

  // 2. Obtain real session tokens via login API
  console.log("\n--- [2] AUTHENTICATION & ACCESS TOKENS ---");
  let adminToken = "";
  let customerToken = "";

  try {
    const adminLoginRes = await fetch(`${BASE_URL}/api/front-end/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@gazaarabia.com", password: "MySecurePassword123!", role: "unified" }),
    });
    const adminData = await adminLoginRes.json();
    adminToken = adminData.accessToken || "";
    record("Auth Token", "Admin Authentication", adminToken ? "PASS" : "FAIL", adminToken ? "Acquired valid admin JWT" : `Failed: ${JSON.stringify(adminData)}`);
  } catch (err: any) {
    record("Auth Token", "Admin Authentication", "FAIL", err.message);
  }

  try {
    const custLoginRes = await fetch(`${BASE_URL}/api/front-end/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "customer@gazaarabia.com", password: "Password123!", role: "unified" }),
    });
    const custData = await custLoginRes.json();
    customerToken = custData.accessToken || "";
    record("Auth Token", "Customer Authentication", customerToken ? "PASS" : "FAIL", customerToken ? "Acquired valid customer JWT" : `Failed: ${JSON.stringify(custData)}`);
  } catch (err: any) {
    record("Auth Token", "Customer Authentication", "FAIL", err.message);
  }

  // 3. Public API: Categories
  console.log("\n--- [3] PUBLIC BLOGS APIS ---");
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/blog-categories`);
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.data)) {
      record("Public API", "GET /api/front-end/blog-categories", "PASS", `HTTP 200: Retrieved ${data.data.length} categories`);
    } else {
      record("Public API", "GET /api/front-end/blog-categories", "FAIL", `HTTP ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err: any) {
    record("Public API", "GET /api/front-end/blog-categories", "FAIL", err.message);
  }

  // 4. Public API: Blogs List
  let sampleBlogSlug = "";
  let sampleCategoryId: number | null = null;
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/blogs`);
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.data)) {
      const firstBlog = data.data[0];
      sampleBlogSlug = firstBlog?.slug || "";
      sampleCategoryId = firstBlog?.categoryId || null;
      const hasCategoryPopulated = firstBlog?.category && firstBlog.category.name;
      record("Public API", "GET /api/front-end/blogs", "PASS", `HTTP 200: Retrieved ${data.data.length} blogs`);
      record(
        "Public API",
        "Blog Category Relation Population",
        hasCategoryPopulated ? "PASS" : "FAIL",
        hasCategoryPopulated
          ? `Populated: "${firstBlog.category.name}" (ID: ${firstBlog.category.id})`
          : `category is ${JSON.stringify(firstBlog?.category)} (Expected populated category)`
      );
    } else {
      record("Public API", "GET /api/front-end/blogs", "FAIL", `HTTP ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err: any) {
    record("Public API", "GET /api/front-end/blogs", "FAIL", err.message);
  }

  // 5. Public API: Filter by Category & Search
  if (sampleCategoryId) {
    try {
      const res = await fetch(`${BASE_URL}/api/front-end/blogs?categoryId=${sampleCategoryId}`);
      const data = await res.json();
      record("Public API", "GET /api/front-end/blogs?categoryId", res.status === 200 ? "PASS" : "FAIL", `HTTP ${res.status}: Filtered ${data.data?.length} blogs`);
    } catch (err: any) {
      record("Public API", "GET /api/front-end/blogs?categoryId", "FAIL", err.message);
    }
  }

  try {
    const res = await fetch(`${BASE_URL}/api/front-end/blogs?search=modest`);
    const data = await res.json();
    record("Public API", "GET /api/front-end/blogs?search", res.status === 200 ? "PASS" : "FAIL", `HTTP ${res.status}: Matched ${data.data?.length} blogs`);
  } catch (err: any) {
    record("Public API", "GET /api/front-end/blogs?search", "FAIL", err.message);
  }

  // 6. Public API: Single Blog by Slug
  if (sampleBlogSlug) {
    try {
      const res = await fetch(`${BASE_URL}/api/front-end/blogs/${sampleBlogSlug}`);
      const data = await res.json();
      const hasCategoryPopulated = data.data?.category && data.data.category.name;
      record("Public API", `GET /api/front-end/blogs/${sampleBlogSlug}`, res.status === 200 ? "PASS" : "FAIL", `HTTP ${res.status}: Found "${data.data?.title}"`);
      record(
        "Public API",
        "Single Blog Category Population",
        hasCategoryPopulated ? "PASS" : "FAIL",
        hasCategoryPopulated
          ? `Populated: "${data.data.category.name}" (Slug: ${data.data.category.slug})`
          : `category is ${JSON.stringify(data.data?.category)} (Expected populated category)`
      );
    } catch (err: any) {
      record("Public API", "GET /api/front-end/blogs/[slug]", "FAIL", err.message);
    }
  }

  // 7. Public API: Non-existent Slug
  try {
    const res = await fetch(`${BASE_URL}/api/front-end/blogs/non-existent-slug-xyz-9999`);
    record("Public API", "GET /api/front-end/blogs/invalid-slug", res.status === 404 ? "PASS" : "FAIL", `HTTP ${res.status} (Expected 404 Not Found)`);
  } catch (err: any) {
    record("Public API", "GET /api/front-end/blogs/invalid-slug", "FAIL", err.message);
  }

  // 8. Protected Admin APIs: Access Control & RBAC
  console.log("\n--- [4] PROTECTED ADMIN BLOGS APIS ---");
  try {
    const res = await fetch(`${BASE_URL}/api/blogs`);
    record("Admin Auth", "GET /api/blogs (no token)", res.status === 401 ? "PASS" : "FAIL", `HTTP ${res.status} (Expected 401)`);
  } catch (err: any) {
    record("Admin Auth", "GET /api/blogs (no token)", "FAIL", err.message);
  }

  if (customerToken) {
    try {
      const res = await fetch(`${BASE_URL}/api/blogs`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      record("Admin Auth", "GET /api/blogs (customer token)", res.status === 403 ? "PASS" : "FAIL", `HTTP ${res.status} (Expected 403 Forbidden)`);
    } catch (err: any) {
      record("Admin Auth", "GET /api/blogs (customer token)", "FAIL", err.message);
    }
  }

  if (adminToken) {
    try {
      const res = await fetch(`${BASE_URL}/api/blogs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = await res.json();
      record("Admin Auth", "GET /api/blogs (admin token)", res.status === 200 ? "PASS" : "FAIL", `HTTP ${res.status}: Retrieved ${data.data?.length} blogs`);
    } catch (err: any) {
      record("Admin Auth", "GET /api/blogs (admin token)", "FAIL", err.message);
    }
  }

  // 9. Admin Blog CRUD Lifecycle
  console.log("\n--- [5] ADMIN BLOG CRUD LIFECYCLE ---");
  let createdBlogId: number | null = null;
  const testBlogSlug = `audit-test-blog-${Date.now()}`;
  if (adminToken) {
    try {
      const res = await fetch(`${BASE_URL}/api/blogs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          title: "Audit Test Blog Post",
          slug: testBlogSlug,
          content: "<p>This is automated test blog content.</p>",
          image: "/uploads/blogs/test-image.png",
          categoryId: 11,
        }),
      });
      const data = await res.json();
      if (res.status === 200 && data.success && data.data?.id) {
        createdBlogId = data.data.id;
        record("Admin CRUD", "POST /api/blogs (Create blog)", "PASS", `HTTP 200: Created blog ID ${createdBlogId}`);
      } else {
        record("Admin CRUD", "POST /api/blogs (Create blog)", "FAIL", `HTTP ${res.status}: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      record("Admin CRUD", "POST /api/blogs (Create blog)", "FAIL", err.message);
    }

    if (createdBlogId) {
      // GET by ID
      try {
        const res = await fetch(`${BASE_URL}/api/blogs/${createdBlogId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        const data = await res.json();
        record("Admin CRUD", `GET /api/blogs/${createdBlogId}`, res.status === 200 ? "PASS" : "FAIL", `HTTP ${res.status}: Retrieved "${data.data?.title}"`);
      } catch (err: any) {
        record("Admin CRUD", "GET /api/blogs/[id]", "FAIL", err.message);
      }

      // PUT Update
      try {
        const res = await fetch(`${BASE_URL}/api/blogs/${createdBlogId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            title: "Audit Test Blog Post (Updated)",
          }),
        });
        const data = await res.json();
        record("Admin CRUD", `PUT /api/blogs/${createdBlogId}`, res.status === 200 ? "PASS" : "FAIL", `HTTP ${res.status}: Updated successfully`);
      } catch (err: any) {
        record("Admin CRUD", "PUT /api/blogs/[id]", "FAIL", err.message);
      }

      // DELETE
      try {
        const res = await fetch(`${BASE_URL}/api/blogs/${createdBlogId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        record("Admin CRUD", `DELETE /api/blogs/${createdBlogId}`, res.status === 200 ? "PASS" : "FAIL", `HTTP ${res.status}: Deleted successfully`);
      } catch (err: any) {
        record("Admin CRUD", "DELETE /api/blogs/[id]", "FAIL", err.message);
      }
    }
  }

  // 10. Admin Blog Categories CRUD Lifecycle
  console.log("\n--- [6] ADMIN BLOG CATEGORIES CRUD ---");
  let createdCatId: number | null = null;
  const testCatName = `Audit Test Cat ${Date.now()}`;
  if (adminToken) {
    try {
      const res = await fetch(`${BASE_URL}/api/blog-categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: testCatName,
        }),
      });
      const data = await res.json();
      if (res.status === 201 && data.success && data.data?.id) {
        createdCatId = data.data.id;
        record("Admin CRUD", "POST /api/blog-categories", "PASS", `HTTP 201: Created category ID ${createdCatId}`);
      } else {
        record("Admin CRUD", "POST /api/blog-categories", "FAIL", `HTTP ${res.status}: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      record("Admin CRUD", "POST /api/blog-categories", "FAIL", err.message);
    }

    if (createdCatId) {
      try {
        const res = await fetch(`${BASE_URL}/api/blog-categories/${createdCatId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            name: `${testCatName} (Renamed)`,
          }),
        });
        record("Admin CRUD", `PUT /api/blog-categories/${createdCatId}`, res.status === 200 ? "PASS" : "FAIL", `HTTP ${res.status}: Updated successfully`);
      } catch (err: any) {
        record("Admin CRUD", "PUT /api/blog-categories/[id]", "FAIL", err.message);
      }

      try {
        const res = await fetch(`${BASE_URL}/api/blog-categories/${createdCatId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        record("Admin CRUD", `DELETE /api/blog-categories/${createdCatId}`, res.status === 200 ? "PASS" : "FAIL", `HTTP ${res.status}: Deleted successfully`);
      } catch (err: any) {
        record("Admin CRUD", "DELETE /api/blog-categories/[id]", "FAIL", err.message);
      }
    }
  }

  // 11. Frontend Route Accessibility & Redirection
  console.log("\n--- [7] FRONTEND & REDIRECTION ROUTE CHECKS ---");
  const routesToTest = [
    { path: "/blogs/journal", expected: [200], name: "Blog Journal Listing Page" },
    { path: sampleBlogSlug ? `/blogs/journal/${sampleBlogSlug}` : "", expected: [200], name: "Single Blog Article Page" },
    { path: "/blogs", expected: [200, 301, 302, 307, 308], name: "Blogs Shortlink / Footer Target (/blogs)" },
    { path: "/blog", expected: [200, 301, 302, 307, 308], name: "Blog Alias Shortlink (/blog)" },
    { path: "/admin/blogs", expected: [200, 307], name: "Admin Blogs Management Page (Protected 307)" },
    { path: "/admin/blogs/form", expected: [200, 307], name: "Admin Blog Form Page (Protected 307)" },
    { path: "/admin/blog-categories", expected: [200, 307], name: "Admin Blog Categories Page (Protected 307)" },
  ];

  for (const route of routesToTest) {
    if (!route.path) continue;
    try {
      const res = await fetch(`${BASE_URL}${route.path}`, { redirect: "manual" });
      const passed = route.expected.includes(res.status);
      record(
        "Frontend Routes",
        route.name,
        passed ? "PASS" : "FAIL",
        `HTTP ${res.status} for ${route.path} (Expected ${route.expected.join(" or ")})`
      );
    } catch (err: any) {
      record("Frontend Routes", route.name, "FAIL", err.message);
    }
  }

  await client.close();

  // Print Summary Table
  console.log("\n====================================================");
  console.log("📊 BLOG FEATURE AUDIT MATRIX");
  console.log("====================================================");
  console.table(
    results.map((r, i) => ({
      "#": i + 1,
      suite: r.suite,
      test: r.test,
      status: r.status,
      detail: r.detail.length > 80 ? r.detail.substring(0, 77) + "..." : r.detail,
    }))
  );

  const passedCount = results.filter((r) => r.status === "PASS").length;
  const failedCount = results.filter((r) => r.status === "FAIL").length;
  const warnCount = results.filter((r) => r.status === "WARN").length;
  console.log(`\nTOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount} | WARN: ${warnCount}`);
  console.log("====================================================\n");
}

runBlogsFeatureAudit().catch((err) => {
  console.error("Audit runner failed:", err);
  process.exit(1);
});
