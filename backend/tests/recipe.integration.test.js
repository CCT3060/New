/**
 * Integration Tests: Recipe API
 * Tests HTTP endpoints using supertest with a real database.
 * Requires TEST_DATABASE_URL to be set.
 */

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/db/prisma');
const bcrypt = require('bcryptjs');

let adminToken;
let opsToken;
let approverToken;
let testWarehouseId;
let testInventoryItemId;
let testRecipeId;

// ─────────────────────────────────────────────────────────────────────────────
// Setup & Teardown
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  // Create test warehouse
  const warehouse = await prisma.warehouse.create({
    data: { name: 'Test Kitchen', code: `TEST-${Date.now()}`, isActive: true },
  });
  testWarehouseId = warehouse.id;

  const pwHash = await bcrypt.hash('TestPass@123', 12);

  // Create test users
  const admin = await prisma.user.create({
    data: { name: 'Test Admin', email: `admin-${Date.now()}@test.com`, passwordHash: pwHash, role: 'ADMIN' },
  });

  const ops = await prisma.user.create({
    data: { name: 'Test Ops', email: `ops-${Date.now()}@test.com`, passwordHash: pwHash, role: 'OPS_MANAGER' },
  });

  const approver = await prisma.user.create({
    data: { name: 'Test Approver', email: `approver-${Date.now()}@test.com`, passwordHash: pwHash, role: 'APPROVER' },
  });

  // Create test inventory item
  const item = await prisma.inventoryItem.create({
    data: {
      itemCode: `INV-TEST-${Date.now()}`,
      itemName: 'Test Rice',
      category: 'Grains',
      unit: 'kg',
      costPerUnit: 85,
      warehouseId: testWarehouseId,
      isActive: true,
    },
  });
  testInventoryItemId = item.id;

  // Get tokens
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: admin.email, password: 'TestPass@123' });
  adminToken = adminLogin.body.data.token;

  const opsLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: ops.email, password: 'TestPass@123' });
  opsToken = opsLogin.body.data.token;

  const approverLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: approver.email, password: 'TestPass@123' });
  approverToken = approverLogin.body.data.token;
});

afterAll(async () => {
  // Cleanup test data
  if (testRecipeId) {
    await prisma.recipe.updateMany({ where: { id: testRecipeId }, data: { deletedAt: new Date() } });
  }
  await prisma.inventoryItem.delete({ where: { id: testInventoryItemId } }).catch(() => {});
  await prisma.warehouse.delete({ where: { id: testWarehouseId } }).catch(() => {});
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('should return 422 for missing email', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'test' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('should return 401 for invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('should return token for valid credentials', async () => {
    expect(adminToken).toBeDefined();
    expect(typeof adminToken).toBe('string');
  });
});

describe('GET /api/auth/profile', () => {
  test('should return 401 without auth token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  test('should return user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('ADMIN');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recipe CRUD
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/recipes — Create Recipe', () => {
  test('should return 401 if not authenticated', async () => {
    const res = await request(app).post('/api/recipes').send({});
    expect(res.status).toBe(401);
  });

  test('should return 403 if role is Kitchen Manager', async () => {
    const pwHash = await bcrypt.hash('TestPass@123', 12);
    const km = await prisma.user.create({
      data: {
        name: 'KM Test',
        email: `km-${Date.now()}@test.com`,
        passwordHash: pwHash,
        role: 'KITCHEN_MANAGER',
      },
    });
    const kmLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: km.email, password: 'TestPass@123' });

    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${kmLogin.body.data.token}`)
      .send({ recipeName: 'Test', recipeCode: 'TST-001' });

    expect(res.status).toBe(403);
    await prisma.user.delete({ where: { id: km.id } });
  });

  test('should return 422 for validation errors', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ recipeName: '' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test('should create recipe successfully as Ops Manager', async () => {
    const res = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        recipeCode: `REC-INT-${Date.now()}`,
        recipeName: 'Integration Test Recipe',
        category: 'Test Category',
        mealType: 'LUNCH',
        foodType: 'VEG',
        standardPax: 50,
        yieldQty: 12.5,
        yieldUnit: 'kg',
        portionPerPax: 250,
        prepTimeMin: 20,
        cookTimeMin: 30,
        warehouseId: testWarehouseId,
        tags: ['test', 'integration'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.versionNumber).toBe(1);
    testRecipeId = res.body.data.id;
  });
});

describe('GET /api/recipes', () => {
  test('should return paginated list', async () => {
    const res = await request(app)
      .get('/api/recipes')
      .set('Authorization', `Bearer ${opsToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pagination).toBeDefined();
    expect(Array.isArray(res.body.data.recipes)).toBe(true);
  });

  test('should filter by status', async () => {
    const res = await request(app)
      .get('/api/recipes?status=DRAFT')
      .set('Authorization', `Bearer ${opsToken}`);
    expect(res.status).toBe(200);
    const recipes = res.body.data.recipes;
    recipes.forEach((r) => expect(r.status).toBe('DRAFT'));
  });
});

describe('GET /api/recipes/:id', () => {
  test('should return recipe with all relations', async () => {
    if (!testRecipeId) return;
    const res = await request(app)
      .get(`/api/recipes/${testRecipeId}`)
      .set('Authorization', `Bearer ${opsToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(testRecipeId);
    expect(Array.isArray(res.body.data.ingredients)).toBe(true);
    expect(Array.isArray(res.body.data.steps)).toBe(true);
  });

  test('should return 404 for non-existent recipe', async () => {
    const res = await request(app)
      .get('/api/recipes/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${opsToken}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ingredients
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/recipes/:id/ingredients', () => {
  test('should add ingredient to draft recipe', async () => {
    if (!testRecipeId) return;
    const res = await request(app)
      .post(`/api/recipes/${testRecipeId}/ingredients`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        inventoryItemId: testInventoryItemId,
        grossQty: 10,
        grossUnit: 'kg',
        wastagePercent: 0,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.netQty).toBeDefined();
    // Net qty = 10 * (1 - 0/100) = 10
    expect(parseFloat(res.body.data.netQty)).toBe(10);
  });

  test('should calculate net qty correctly with wastage', async () => {
    // Create another recipe for this test
    const recipeRes = await request(app)
      .post('/api/recipes')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        recipeCode: `REC-WASTE-${Date.now()}`,
        recipeName: 'Wastage Test Recipe',
        category: 'Test',
        mealType: 'LUNCH',
        foodType: 'VEG',
        standardPax: 100,
        yieldQty: 20,
        yieldUnit: 'kg',
        portionPerPax: 200,
        warehouseId: testWarehouseId,
      });

    const wasteRecipeId = recipeRes.body.data.id;

    const res = await request(app)
      .post(`/api/recipes/${wasteRecipeId}/ingredients`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        inventoryItemId: testInventoryItemId,
        grossQty: 5,
        grossUnit: 'kg',
        wastagePercent: 20,
      });

    expect(res.status).toBe(201);
    // 5 - (5 * 20/100) = 5 - 1 = 4
    expect(parseFloat(res.body.data.netQty)).toBe(4);
  });

  test('should reject duplicate ingredient', async () => {
    if (!testRecipeId) return;
    const res = await request(app)
      .post(`/api/recipes/${testRecipeId}/ingredients`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        inventoryItemId: testInventoryItemId,
        grossQty: 5,
        grossUnit: 'kg',
        wastagePercent: 0,
      });
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Approval Workflow
// ─────────────────────────────────────────────────────────────────────────────

describe('Approval Workflow', () => {
  test('should submit for review', async () => {
    if (!testRecipeId) return;
    const res = await request(app)
      .post(`/api/recipes/${testRecipeId}/submit-review`)
      .set('Authorization', `Bearer ${opsToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('UNDER_REVIEW');
  });

  test('should reject approval by Ops Manager (wrong role)', async () => {
    if (!testRecipeId) return;
    const res = await request(app)
      .post(`/api/recipes/${testRecipeId}/approve`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ note: 'Looks good' });
    expect(res.status).toBe(403);
  });

  test('should allow approval by approver role', async () => {
    if (!testRecipeId) return;
    const res = await request(app)
      .post(`/api/recipes/${testRecipeId}/approve`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ note: 'Approved — meets standards' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('APPROVED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scaling
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/recipes/:id/scale', () => {
  test('should scale recipe to target pax', async () => {
    if (!testRecipeId) return;
    const res = await request(app)
      .post(`/api/recipes/${testRecipeId}/scale`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ targetPax: 100 });

    expect(res.status).toBe(200);
    expect(res.body.data.targetPax).toBe(100);
    expect(res.body.data.scaledIngredients).toBeDefined();
    expect(Array.isArray(res.body.data.scaledIngredients)).toBe(true);
  });

  test('should return 422 if targetPax is 0', async () => {
    if (!testRecipeId) return;
    const res = await request(app)
      .post(`/api/recipes/${testRecipeId}/scale`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ targetPax: 0 });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Versioning
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/recipes/:id/new-version', () => {
  test('should create new version from approved recipe', async () => {
    if (!testRecipeId) return;
    const res = await request(app)
      .post(`/api/recipes/${testRecipeId}/new-version`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ changeSummary: 'Updated oil quantity based on QC feedback' });

    expect(res.status).toBe(201);
    expect(res.body.data.versionNumber).toBe(2);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.baseRecipeId).toBe(testRecipeId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Lookup
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/recipes/lookup', () => {
  test('should return only approved/active recipes', async () => {
    const res = await request(app)
      .get('/api/recipes/lookup')
      .set('Authorization', `Bearer ${opsToken}`);
    expect(res.status).toBe(200);
    const recipes = res.body.data.recipes;
    recipes.forEach((r) => {
      expect(['APPROVED', 'ACTIVE']).toContain(r.status);
    });
  });

  test('should filter by mealType', async () => {
    const res = await request(app)
      .get('/api/recipes/lookup?mealType=LUNCH')
      .set('Authorization', `Bearer ${opsToken}`);
    expect(res.status).toBe(200);
    res.body.data.recipes.forEach((r) => {
      expect(r.mealType).toBe('LUNCH');
    });
  });
});
