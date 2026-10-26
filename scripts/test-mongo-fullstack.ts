import { connectToDatabase, mongoose } from '../src/lib/mongoose';
import { User, Product, Category, Role } from '../src/models';

async function testMongoFullStack() {
  console.log('====================================================');
  console.log('🧪 FULLSTACK TESTER: MONGODB AUDIT & HEALTH SUITE');
  console.log('====================================================\n');

  const matrix: Array<{ test: string; status: string; detail: string }> = [];

  // 1. Connection state
  try {
    await connectToDatabase();
    const readyState = mongoose.connection.readyState;
    matrix.push({
      test: 'Mongoose DB Connectivity',
      status: readyState === 1 ? 'PASS' : 'FAIL',
      detail: `readyState: ${readyState} (1 = connected)`,
    });
  } catch (e: any) {
    matrix.push({
      test: 'Mongoose DB Connectivity',
      status: 'FAIL',
      detail: e.message,
    });
  }

  // 2. Collections count in MongoDB
  try {
    const db = mongoose.connection.db;
    const collections = await db?.listCollections().toArray();
    matrix.push({
      test: 'MongoDB Collections Discovery',
      status: (collections?.length || 0) >= 50 ? 'PASS' : 'WARN',
      detail: `Found ${collections?.length} active collections in gazaarabia DB`,
    });
  } catch (e: any) {
    matrix.push({
      test: 'MongoDB Collections Discovery',
      status: 'FAIL',
      detail: e.message,
    });
  }

  // 3. User model queries
  try {
    const userCount = await User.countDocuments();
    const adminUser: any = await User.findOne({ email: 'info@gazaarabia.com' });
    matrix.push({
      test: 'Mongoose User Model Query',
      status: adminUser && userCount > 0 ? 'PASS' : 'FAIL',
      detail: `Total users: ${userCount}, Found Admin: "${adminUser?.name}" (Role ID: ${adminUser?.roleId})`,
    });
  } catch (e: any) {
    matrix.push({
      test: 'Mongoose User Model Query',
      status: 'FAIL',
      detail: e.message,
    });
  }

  // 4. Category model queries
  try {
    const categories = await Category.find().limit(5);
    matrix.push({
      test: 'Mongoose Category Model Query',
      status: categories.length > 0 ? 'PASS' : 'FAIL',
      detail: `Retrieved ${categories.length} sample categories: [${categories.map((c: any) => c.name).join(', ')}]`,
    });
  } catch (e: any) {
    matrix.push({
      test: 'Mongoose Category Model Query',
      status: 'FAIL',
      detail: e.message,
    });
  }

  // 5. Product model queries
  try {
    const products = await Product.find().limit(5);
    matrix.push({
      test: 'Mongoose Product Model Query',
      status: products.length > 0 ? 'PASS' : 'FAIL',
      detail: `Retrieved ${products.length} sample products: [${products.map((p: any) => p.title).join(', ')}]`,
    });
  } catch (e: any) {
    matrix.push({
      test: 'Mongoose Product Model Query',
      status: 'FAIL',
      detail: e.message,
    });
  }

  // 6. HTTP /api/health Endpoint
  try {
    const res = await fetch('http://localhost:3000/api/health');
    const json = await res.json();
    matrix.push({
      test: 'API Health Endpoint (/api/health)',
      status: res.ok && json.status === 'healthy' ? 'PASS' : 'FAIL',
      detail: `HTTP ${res.status}: status="${json.status}", readyState=${json.readyState}`,
    });
  } catch (e: any) {
    matrix.push({
      test: 'API Health Endpoint (/api/health)',
      status: 'FAIL',
      detail: e.message,
    });
  }

  console.table(matrix);

  const passed = matrix.filter((m) => m.status === 'PASS').length;
  console.log(`\nResults: ${passed}/${matrix.length} Passed.`);

  await mongoose.disconnect();
}

testMongoFullStack().catch((err) => {
  console.error(err);
  process.exit(1);
});
