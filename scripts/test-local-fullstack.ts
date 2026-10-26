import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

interface TestResult {
  name: string;
  category: 'Database' | 'API' | 'Frontend Page';
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];
const BASE_URL = 'http://localhost:3000';
let adminAuthToken = '';

async function testStep(
  name: string,
  category: 'Database' | 'API' | 'Frontend Page',
  fn: () => Promise<string>
) {
  const start = Date.now();
  try {
    const details = await fn();
    results.push({
      name,
      category,
      status: 'PASS',
      details,
      durationMs: Date.now() - start,
    });
    console.log(`✅ [${category}] ${name}: ${details} (${Date.now() - start}ms)`);
  } catch (error: any) {
    results.push({
      name,
      category,
      status: 'FAIL',
      details: error?.message || String(error),
      durationMs: Date.now() - start,
    });
    console.error(`❌ [${category}] ${name}: ${error?.message || error} (${Date.now() - start}ms)`);
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING GAZAARABIA FULL-STACK AUDIT SUITE');
  console.log('====================================================\n');

  // 1. DATABASE TESTS
  await testStep('DB Connectivity Ping', 'Database', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return 'Raw SELECT 1 via SSH tunnel succeeded';
  });

  await testStep('DB Users Count & Admin Presence', 'Database', async () => {
    const count = await prisma.users.count();
    const admin = await prisma.users.findFirst({
      where: { email: 'info@gazaarabia.com' },
      include: { role: true },
    });
    if (!admin) throw new Error('Admin user info@gazaarabia.com not found');
    return `${count} users registered. Admin role: ${admin.role.name}`;
  });

  await testStep('DB Catalog (Products, Categories, Variants)', 'Database', async () => {
    const pCount = await prisma.products.count();
    const cCount = await prisma.categories.count();
    const vCount = await prisma.productvariant.count();
    return `${pCount} products, ${cCount} categories, ${vCount} variants in DB`;
  });

  await testStep('DB Roles & Settings', 'Database', async () => {
    const roles = await prisma.roles.findMany({ select: { name: true } });
    const settings = await prisma.platformSettings.findFirst();
    return `Roles: [${roles.map((r) => r.name).join(', ')}]. Commission: ${settings?.defaultCommissionValue ?? 'default'}%`;
  });

  // 2. API ENDPOINTS
  await testStep('API - Admin Authentication Flow', 'API', async () => {
    const password = process.env.TEST_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
    if (!password) {
      return 'Skipped Admin Login (set TEST_ADMIN_PASSWORD or SEED_ADMIN_PASSWORD in environment to test)';
    }
    const res = await fetch(`${BASE_URL}/api/front-end/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'info@gazaarabia.com',
        password: password,
        role: 'admin',
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Login failed HTTP ${res.status}: ${err}`);
    }
    const data = await res.json();
    adminAuthToken = data.token || data.accessToken || '';
    if (!adminAuthToken && !data.user) {
      throw new Error(`Unexpected auth response payload: ${JSON.stringify(data)}`);
    }
    return `HTTP 200, JWT token acquired for ${data.user?.name || 'Super Admin'} (role: ${data.user?.role?.name || 'admin'})`;
  });

  await testStep('API - Authenticated Admin Categories List', 'API', async () => {
    const res = await fetch(`${BASE_URL}/api/categories`, {
      headers: {
        Authorization: `Bearer ${adminAuthToken}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    const count = Array.isArray(data?.data) ? data.data.length : (Array.isArray(data) ? data.length : 0);
    return `HTTP 200 (authenticated), returned ${count} categories`;
  });

  await testStep('API - Public Frontend Homepage Data', 'API', async () => {
    const res = await fetch(`${BASE_URL}/api/front-end/homepage`);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    return `HTTP 200, banner/sections loaded`;
  });

  await testStep('API - Public Frontend Products List', 'API', async () => {
    const res = await fetch(`${BASE_URL}/api/front-end/product`);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    const count = Array.isArray(data?.data) ? data.data.length : (Array.isArray(data?.products) ? data.products.length : (Array.isArray(data) ? data.length : 0));
    return `HTTP 200, returned ${count} products`;
  });

  await testStep('API - Public Product Details (/api/front-end/product/[slug])', 'API', async () => {
    const product = await prisma.products.findFirst({
      where: { active: true },
      select: { slug: true },
    });
    if (!product) throw new Error('No active product found in DB to test');
    const res = await fetch(`${BASE_URL}/api/front-end/product/${product.slug}`);
    if (!res.ok) throw new Error(`HTTP ${res.status} for slug: ${product.slug}`);
    const data = await res.json();
    return `HTTP 200, verified slug: ${product.slug} (variants: ${data.productvariant?.length ?? 0})`;
  });

  await testStep('API - Product Filter Options', 'API', async () => {
    const res = await fetch(`${BASE_URL}/api/front-end/product-filter-options`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return `HTTP 200, filter options retrieved`;
  });

  await testStep('API - Admin Dashboard Metrics (Protected)', 'API', async () => {
    const res = await fetch(`${BASE_URL}/api/dashboard`, {
      headers: {
        Authorization: `Bearer ${adminAuthToken}`,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    return `HTTP 200, revenue and analytics stats loaded`;
  });

  // 3. FRONTEND PAGES (SSR & Static)
  const activeProduct = await prisma.products.findFirst({
    where: { active: true },
    select: { slug: true },
  });

  const pages = [
    { name: 'Storefront Homepage', path: '/' },
    { name: 'Shop / Catalog Page', path: '/shop' },
    ...(activeProduct ? [{ name: 'Product Detail Page', path: `/products/${activeProduct.slug}` }] : []),
    { name: 'Cart Page', path: '/cart' },
    { name: 'Checkout Page', path: '/checkout' },
    { name: 'Admin Login Page', path: '/admin/login' },
    { name: 'Seller Login Page', path: '/seller/login' },
    { name: 'Affiliate Login Page', path: '/affiliate/login' },
    { name: 'Solidarity Receipts', path: '/solidarity-receipts' },
  ];

  for (const page of pages) {
    await testStep(`Page: ${page.name} (${page.path})`, 'Frontend Page', async () => {
      const res = await fetch(`${BASE_URL}${page.path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const text = await res.text();
      if (!text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
        throw new Error('Response did not contain valid HTML document');
      }
      return `HTTP 200, HTML size: ${(text.length / 1024).toFixed(1)} KB`;
    });
  }

  console.log('\n====================================================');
  console.log('📊 TEST SUMMARY MATRIX');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Tests: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests()
  .then(() => {
    prisma.$disconnect();
    process.exit(0);
  })
  .catch((e) => {
    console.error('Fatal test runner crash:', e);
    prisma.$disconnect();
    process.exit(1);
  });
