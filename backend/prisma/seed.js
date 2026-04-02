/**
 * Prisma Seed Data
 * Central Kitchen Recipe Management System
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ──────────────────────────────────────────
  // WAREHOUSE
  // ──────────────────────────────────────────
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'CK-MAIN' },
    update: {},
    create: {
      name: 'Central Kitchen - Main',
      code: 'CK-MAIN',
      address: '123 Kitchen Road, Food District',
      isActive: true,
    },
  });
  console.log(`✅ Warehouse: ${warehouse.name}`);

  // ──────────────────────────────────────────
  // USERS
  // ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@centralkitchen.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@centralkitchen.com',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const opsManager = await prisma.user.upsert({
    where: { email: 'ops@centralkitchen.com' },
    update: {},
    create: {
      name: 'Rakesh Kumar (Ops Manager)',
      email: 'ops@centralkitchen.com',
      passwordHash,
      role: 'OPS_MANAGER',
      isActive: true,
    },
  });

  const approver = await prisma.user.upsert({
    where: { email: 'chef@centralkitchen.com' },
    update: {},
    create: {
      name: 'Chef Sharma (Head Chef / Approver)',
      email: 'chef@centralkitchen.com',
      passwordHash,
      role: 'APPROVER',
      isActive: true,
    },
  });

  const kitchenManager = await prisma.user.upsert({
    where: { email: 'kitchen@centralkitchen.com' },
    update: {},
    create: {
      name: 'Priya Singh (Kitchen Manager)',
      email: 'kitchen@centralkitchen.com',
      passwordHash,
      role: 'KITCHEN_MANAGER',
      isActive: true,
    },
  });

  const storeManager = await prisma.user.upsert({
    where: { email: 'store@centralkitchen.com' },
    update: {},
    create: {
      name: 'Anuj Sharma (Store Manager)',
      email: 'store@centralkitchen.com',
      passwordHash,
      role: 'STORE_MANAGER',
      isActive: true,
    },
  });

  console.log('✅ Users created');

  // ──────────────────────────────────────────
  // INVENTORY ITEMS
  // ──────────────────────────────────────────
  const inventoryItems = [
    { itemCode: 'INV-RICE-001', itemName: 'Basmati Rice', category: 'Grains', unit: 'kg', costPerUnit: 85.0, currentStock: 500, minimumStock: 50 },
    { itemCode: 'INV-VEG-001', itemName: 'Mixed Vegetables', category: 'Vegetables', unit: 'kg', costPerUnit: 40.0, currentStock: 100, minimumStock: 20 },
    { itemCode: 'INV-OIL-001', itemName: 'Refined Oil', category: 'Oils', unit: 'litre', costPerUnit: 110.0, currentStock: 50, minimumStock: 10 },
    { itemCode: 'INV-SAL-001', itemName: 'Salt (Iodized)', category: 'Spices', unit: 'kg', costPerUnit: 18.0, currentStock: 30, minimumStock: 5 },
    { itemCode: 'INV-SPC-001', itemName: 'Whole Spices Mix', category: 'Spices', unit: 'kg', costPerUnit: 320.0, currentStock: 10, minimumStock: 2 },
    { itemCode: 'INV-POH-001', itemName: 'Poha (Flattened Rice)', category: 'Grains', unit: 'kg', costPerUnit: 55.0, currentStock: 80, minimumStock: 15 },
    { itemCode: 'INV-POT-001', itemName: 'Potato', category: 'Vegetables', unit: 'kg', costPerUnit: 25.0, currentStock: 200, minimumStock: 30 },
    { itemCode: 'INV-ONI-001', itemName: 'Onion', category: 'Vegetables', unit: 'kg', costPerUnit: 30.0, currentStock: 150, minimumStock: 20 },
    { itemCode: 'INV-MUS-001', itemName: 'Mustard Seeds', category: 'Spices', unit: 'kg', costPerUnit: 180.0, currentStock: 5, minimumStock: 1 },
    { itemCode: 'INV-CUR-001', itemName: 'Curry Leaves', category: 'Herbs', unit: 'kg', costPerUnit: 200.0, currentStock: 3, minimumStock: 0.5 },
    { itemCode: 'INV-GRN-001', itemName: 'Green Chilli', category: 'Vegetables', unit: 'kg', costPerUnit: 60.0, currentStock: 10, minimumStock: 2 },
    { itemCode: 'INV-TUR-001', itemName: 'Turmeric Powder', category: 'Spices', unit: 'kg', costPerUnit: 250.0, currentStock: 5, minimumStock: 1 },
    { itemCode: 'INV-SUG-001', itemName: 'Sugar', category: 'Sweeteners', unit: 'kg', costPerUnit: 42.0, currentStock: 50, minimumStock: 10 },
    { itemCode: 'INV-LEM-001', itemName: 'Lemon', category: 'Condiments', unit: 'kg', costPerUnit: 80.0, currentStock: 15, minimumStock: 3 },
    { itemCode: 'INV-COR-001', itemName: 'Coriander Leaves', category: 'Herbs', unit: 'kg', costPerUnit: 150.0, currentStock: 8, minimumStock: 2 },
    { itemCode: 'INV-WAT-001', itemName: 'Water', category: 'Liquids', unit: 'litre', costPerUnit: 0.5, currentStock: 9999, minimumStock: 100 },
    { itemCode: 'INV-GHE-001', itemName: 'Ghee', category: 'Oils', unit: 'kg', costPerUnit: 550.0, currentStock: 20, minimumStock: 5 },
    { itemCode: 'INV-CUM-001', itemName: 'Cumin Seeds', category: 'Spices', unit: 'kg', costPerUnit: 280.0, currentStock: 5, minimumStock: 1 },
    { itemCode: 'INV-TOM-001', itemName: 'Tomato', category: 'Vegetables', unit: 'kg', costPerUnit: 25.0, currentStock: 80, minimumStock: 15 },
    { itemCode: 'INV-PEA-001', itemName: 'Green Peas (Frozen)', category: 'Vegetables', unit: 'kg', costPerUnit: 65.0, currentStock: 40, minimumStock: 10 },
  ];

  const createdItems = {};
  for (const item of inventoryItems) {
    const created = await prisma.inventoryItem.upsert({
      where: { itemCode: item.itemCode },
      update: {},
      create: { ...item, warehouseId: warehouse.id },
    });
    createdItems[item.itemCode] = created;
  }
  console.log(`✅ ${inventoryItems.length} Inventory items created`);

  // ──────────────────────────────────────────
  // RECIPE 1: VEG PULAO
  // ──────────────────────────────────────────
  const existingPulao = await prisma.recipe.findUnique({ where: { recipeCode: 'REC-VEG-PULAO-001' } });
  if (!existingPulao) {
    const vegPulao = await prisma.recipe.create({
      data: {
        recipeCode: 'REC-VEG-PULAO-001',
        recipeName: 'Veg Pulao',
        category: 'Rice Dishes',
        mealType: 'LUNCH',
        foodType: 'VEG',
        cuisineType: 'North Indian',
        description: 'Aromatic basmati rice cooked with mixed vegetables and whole spices. A staple lunch item for bulk catering.',
        standardPax: 100,
        yieldQty: 25,
        yieldUnit: 'kg',
        portionPerPax: 250,
        prepTimeMin: 30,
        cookTimeMin: 45,
        status: 'ACTIVE',
        versionNumber: 1,
        isCurrentVersion: true,
        warehouseId: warehouse.id,
        createdBy: opsManager.id,
        approvedBy: approver.id,
        approvedAt: new Date(),
        approvalNote: 'Standard recipe approved for production.',
      },
    });

    // Pulao Ingredients
    const pulaoIngredients = [
      { itemCode: 'INV-RICE-001', grossQty: 10, grossUnit: 'kg', wastagePercent: 0, seqNo: 1 },
      { itemCode: 'INV-VEG-001', grossQty: 5, grossUnit: 'kg', wastagePercent: 20, seqNo: 2 },
      { itemCode: 'INV-OIL-001', grossQty: 1, grossUnit: 'litre', wastagePercent: 0, seqNo: 3 },
      { itemCode: 'INV-SAL-001', grossQty: 0.2, grossUnit: 'kg', wastagePercent: 0, seqNo: 4 },
      { itemCode: 'INV-SPC-001', grossQty: 0.15, grossUnit: 'kg', wastagePercent: 0, seqNo: 5 },
      { itemCode: 'INV-GHE-001', grossQty: 0.5, grossUnit: 'kg', wastagePercent: 0, seqNo: 6 },
      { itemCode: 'INV-CUM-001', grossQty: 0.05, grossUnit: 'kg', wastagePercent: 0, seqNo: 7 },
      { itemCode: 'INV-WAT-001', grossQty: 20, grossUnit: 'litre', wastagePercent: 0, seqNo: 8 },
    ];

    let ingredientCost = 0;
    for (const ing of pulaoIngredients) {
      const item = createdItems[ing.itemCode];
      const netQty = ing.grossQty - (ing.grossQty * ing.wastagePercent / 100);
      const lineCost = netQty * parseFloat(item.costPerUnit);
      ingredientCost += lineCost;

      await prisma.recipeIngredient.create({
        data: {
          recipeId: vegPulao.id,
          inventoryItemId: item.id,
          sequenceNo: ing.seqNo,
          grossQty: ing.grossQty,
          grossUnit: ing.grossUnit,
          wastagePercent: ing.wastagePercent,
          netQty,
          netUnit: ing.grossUnit,
          unitCostSnapshot: parseFloat(item.costPerUnit),
          lineCost,
        },
      });
    }

    // Pulao Steps
    const pulaoSteps = [
      { stepNo: 1, stepType: 'PREP', instruction: 'Wash basmati rice thoroughly under cold running water until water runs clear. Soak for 20 minutes.', estimatedTimeMin: 25, equipmentName: 'Large Container' },
      { stepNo: 2, stepType: 'PREP', instruction: 'Clean and cut mixed vegetables into uniform 1-inch pieces. Wash thoroughly.', estimatedTimeMin: 15, equipmentName: 'Cutting Board, Knife' },
      { stepNo: 3, stepType: 'COOK', instruction: 'Heat ghee and refined oil in large kadai over medium flame. Add cumin seeds and allow to splutter.', estimatedTimeMin: 3, equipmentName: 'Large Kadai / Bulk Cooker', temperatureNote: 'Medium heat, approx 160°C', qcCheckNote: 'Cumin must splutter fully before next step' },
      { stepNo: 4, stepType: 'COOK', instruction: 'Add whole spices and sauté until aromatic (about 60 seconds). Do not burn spices.', estimatedTimeMin: 2, equipmentName: 'Large Kadai', temperatureNote: 'Medium heat', qcCheckNote: 'Aroma check — spices should be fragrant, not burnt' },
      { stepNo: 5, stepType: 'COOK', instruction: 'Add mixed vegetables and sauté on high flame for 3-4 minutes until slightly cooked.', estimatedTimeMin: 4, equipmentName: 'Large Kadai' },
      { stepNo: 6, stepType: 'COOK', instruction: 'Add drained rice and gently sauté for 2 minutes to coat rice with oil and spices.', estimatedTimeMin: 2, equipmentName: 'Large Kadai', qcCheckNote: 'Rice should not break during sautéing' },
      { stepNo: 7, stepType: 'COOK', instruction: 'Add measured water (for 100 pax: 20 litres), salt, and bring to boil. Cover and cook on low flame for 20-25 minutes.', estimatedTimeMin: 30, equipmentName: 'Large Pressure Cooker / Bulk Cooker', temperatureNote: 'Reduce to low heat after boiling' },
      { stepNo: 8, stepType: 'HOLD', instruction: 'Rest cooked pulao covered for 10 minutes. Gently fluff with large fork before service.', estimatedTimeMin: 10, qcCheckNote: 'Each grain should be separate. Check salt and texture before service.' },
    ];

    for (const step of pulaoSteps) {
      await prisma.recipeStep.create({ data: { recipeId: vegPulao.id, ...step } });
    }

    // Pulao Cost
    const totalCost = ingredientCost + 50 + 200 + 30; // + fuel + labor + packaging
    await prisma.recipeCost.create({
      data: {
        recipeId: vegPulao.id,
        ingredientCost,
        fuelCost: 50,
        laborCost: 200,
        packagingCost: 30,
        otherCost: 0,
        totalCost,
        costPerPax: totalCost / 100,
      },
    });

    // Pulao Tags
    for (const tag of ['lunch', 'veg', 'north_indian', 'bulk_catering', 'rice_dish']) {
      await prisma.recipeTag.create({ data: { recipeId: vegPulao.id, tagName: tag } });
    }

    // Version log
    await prisma.recipeVersion.create({
      data: {
        recipeId: vegPulao.id,
        versionNumber: 1,
        changeSummary: 'Initial recipe creation',
        changedBy: opsManager.id,
        isCurrent: true,
      },
    });

    console.log('✅ Recipe: Veg Pulao created');
  }

  // ──────────────────────────────────────────
  // RECIPE 2: POHA (BREAKFAST)
  // ──────────────────────────────────────────
  const existingPoha = await prisma.recipe.findUnique({ where: { recipeCode: 'REC-POH-BRKFST-001' } });
  if (!existingPoha) {
    const poha = await prisma.recipe.create({
      data: {
        recipeCode: 'REC-POH-BRKFST-001',
        recipeName: 'Kanda Batata Poha',
        category: 'Light Meals',
        mealType: 'BREAKFAST',
        foodType: 'VEG',
        cuisineType: 'Maharashtrian',
        description: 'Classic Maharashtra-style flattened rice (poha) with onion, potato, and fresh herbs. Light and nutritious breakfast.',
        standardPax: 100,
        yieldQty: 18,
        yieldUnit: 'kg',
        portionPerPax: 180,
        prepTimeMin: 20,
        cookTimeMin: 25,
        status: 'ACTIVE',
        versionNumber: 1,
        isCurrentVersion: true,
        warehouseId: warehouse.id,
        createdBy: opsManager.id,
        approvedBy: approver.id,
        approvedAt: new Date(),
        approvalNote: 'Approved for daily breakfast production.',
      },
    });

    const pohaIngredients = [
      { itemCode: 'INV-POH-001', grossQty: 10, grossUnit: 'kg', wastagePercent: 5, seqNo: 1 },
      { itemCode: 'INV-ONI-001', grossQty: 3, grossUnit: 'kg', wastagePercent: 15, seqNo: 2 },
      { itemCode: 'INV-POT-001', grossQty: 2.5, grossUnit: 'kg', wastagePercent: 20, seqNo: 3 },
      { itemCode: 'INV-OIL-001', grossQty: 0.8, grossUnit: 'litre', wastagePercent: 0, seqNo: 4 },
      { itemCode: 'INV-MUS-001', grossQty: 0.04, grossUnit: 'kg', wastagePercent: 0, seqNo: 5 },
      { itemCode: 'INV-CUR-001', grossQty: 0.1, grossUnit: 'kg', wastagePercent: 10, seqNo: 6 },
      { itemCode: 'INV-GRN-001', grossQty: 0.15, grossUnit: 'kg', wastagePercent: 5, seqNo: 7 },
      { itemCode: 'INV-TUR-001', grossQty: 0.02, grossUnit: 'kg', wastagePercent: 0, seqNo: 8 },
      { itemCode: 'INV-SAL-001', grossQty: 0.15, grossUnit: 'kg', wastagePercent: 0, seqNo: 9 },
      { itemCode: 'INV-SUG-001', grossQty: 0.1, grossUnit: 'kg', wastagePercent: 0, seqNo: 10 },
      { itemCode: 'INV-LEM-001', grossQty: 0.3, grossUnit: 'kg', wastagePercent: 10, seqNo: 11 },
      { itemCode: 'INV-COR-001', grossQty: 0.2, grossUnit: 'kg', wastagePercent: 20, seqNo: 12 },
    ];

    let ingredientCostPoha = 0;
    for (const ing of pohaIngredients) {
      const item = createdItems[ing.itemCode];
      const netQty = ing.grossQty - (ing.grossQty * ing.wastagePercent / 100);
      const lineCost = netQty * parseFloat(item.costPerUnit);
      ingredientCostPoha += lineCost;

      await prisma.recipeIngredient.create({
        data: {
          recipeId: poha.id,
          inventoryItemId: item.id,
          sequenceNo: ing.seqNo,
          grossQty: ing.grossQty,
          grossUnit: ing.grossUnit,
          wastagePercent: ing.wastagePercent,
          netQty,
          netUnit: ing.grossUnit,
          unitCostSnapshot: parseFloat(item.costPerUnit),
          lineCost,
        },
      });
    }

    const pohaSteps = [
      { stepNo: 1, stepType: 'PREP', instruction: 'Wash poha in a colander under running water for 1-2 minutes. Let drain for 5 minutes. Poha should be soft but not mushy.', estimatedTimeMin: 7, qcCheckNote: 'Press a grain — should be soft and not break. Not too wet.' },
      { stepNo: 2, stepType: 'PREP', instruction: 'Peel and dice potatoes into small 0.5-inch cubes. Slice onions thinly. Slit green chillies.', estimatedTimeMin: 15, equipmentName: 'Cutting Board, Peeler, Knife' },
      { stepNo: 3, stepType: 'COOK', instruction: 'Heat oil in large kadai. Add mustard seeds and let splutter completely.', estimatedTimeMin: 2, equipmentName: 'Large Kadai', temperatureNote: 'Medium-high heat', qcCheckNote: 'All mustard seeds must splutter before proceeding' },
      { stepNo: 4, stepType: 'COOK', instruction: 'Add curry leaves and green chillies. Sauté for 30 seconds.', estimatedTimeMin: 1, equipmentName: 'Large Kadai' },
      { stepNo: 5, stepType: 'COOK', instruction: 'Add diced potatoes. Sauté on medium flame for 8-10 minutes until potatoes are cooked through.', estimatedTimeMin: 10, equipmentName: 'Large Kadai', qcCheckNote: 'Check potato doneness — should be cooked but not crumbly' },
      { stepNo: 6, stepType: 'COOK', instruction: 'Add sliced onions. Sauté until translucent (4-5 minutes).', estimatedTimeMin: 5, equipmentName: 'Large Kadai' },
      { stepNo: 7, stepType: 'COOK', instruction: 'Add turmeric powder, salt, and sugar. Mix well.', estimatedTimeMin: 2, equipmentName: 'Large Kadai' },
      { stepNo: 8, stepType: 'COOK', instruction: 'Add drained poha and gently mix to coat evenly with spice mixture. Cover and steam on low heat for 3-4 minutes.', estimatedTimeMin: 5, qcCheckNote: 'Mix gently to avoid breaking poha grains' },
      { stepNo: 9, stepType: 'GARNISH', instruction: 'Squeeze lemon juice over poha. Add fresh chopped coriander. Mix gently and check seasoning.', estimatedTimeMin: 3, qcCheckNote: 'Taste check: balanced taste of salt, sour, and mild sweetness' },
    ];

    for (const step of pohaSteps) {
      await prisma.recipeStep.create({ data: { recipeId: poha.id, ...step } });
    }

    const totalCostPoha = ingredientCostPoha + 35 + 180 + 25;
    await prisma.recipeCost.create({
      data: {
        recipeId: poha.id,
        ingredientCost: ingredientCostPoha,
        fuelCost: 35,
        laborCost: 180,
        packagingCost: 25,
        otherCost: 0,
        totalCost: totalCostPoha,
        costPerPax: totalCostPoha / 100,
      },
    });

    for (const tag of ['breakfast', 'veg', 'maharashtrian', 'light_meal', 'quick_cook']) {
      await prisma.recipeTag.create({ data: { recipeId: poha.id, tagName: tag } });
    }

    await prisma.recipeVersion.create({
      data: {
        recipeId: poha.id,
        versionNumber: 1,
        changeSummary: 'Initial recipe creation',
        changedBy: opsManager.id,
        isCurrent: true,
      },
    });

    console.log('✅ Recipe: Kanda Batata Poha created');
  }

  // ──────────────────────────────────────────
  // RECIPE 3: DRAFT RECIPE (for workflow demo)
  // ──────────────────────────────────────────
  const existingDraft = await prisma.recipe.findUnique({ where: { recipeCode: 'REC-TOM-RICE-001' } });
  if (!existingDraft) {
    const tomRice = await prisma.recipe.create({
      data: {
        recipeCode: 'REC-TOM-RICE-001',
        recipeName: 'Tomato Rice',
        category: 'Rice Dishes',
        mealType: 'LUNCH',
        foodType: 'VEG',
        cuisineType: 'South Indian',
        description: 'Tangy and spiced tomato rice — a South Indian specialty.',
        standardPax: 100,
        yieldQty: 22,
        yieldUnit: 'kg',
        portionPerPax: 220,
        prepTimeMin: 20,
        cookTimeMin: 35,
        status: 'DRAFT',
        versionNumber: 1,
        isCurrentVersion: true,
        warehouseId: warehouse.id,
        createdBy: opsManager.id,
      },
    });

    await prisma.recipeIngredient.create({
      data: {
        recipeId: tomRice.id,
        inventoryItemId: createdItems['INV-RICE-001'].id,
        sequenceNo: 1,
        grossQty: 10,
        grossUnit: 'kg',
        wastagePercent: 0,
        netQty: 10,
        netUnit: 'kg',
        unitCostSnapshot: 85.0,
        lineCost: 850.0,
      },
    });

    await prisma.recipeIngredient.create({
      data: {
        recipeId: tomRice.id,
        inventoryItemId: createdItems['INV-TOM-001'].id,
        sequenceNo: 2,
        grossQty: 8,
        grossUnit: 'kg',
        wastagePercent: 10,
        netQty: 7.2,
        netUnit: 'kg',
        unitCostSnapshot: 25.0,
        lineCost: 180.0,
      },
    });

    await prisma.recipeVersion.create({
      data: {
        recipeId: tomRice.id,
        versionNumber: 1,
        changeSummary: 'Initial draft created',
        changedBy: opsManager.id,
        isCurrent: true,
      },
    });

    console.log('✅ Recipe: Tomato Rice (Draft) created');
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Login Credentials (all use Password@123):');
  console.log('  Admin:           admin@centralkitchen.com');
  console.log('  Ops Manager:     ops@centralkitchen.com');
  console.log('  Head Chef:       chef@centralkitchen.com');
  console.log('  Kitchen Manager: kitchen@centralkitchen.com');
  console.log('  Store Manager:   store@centralkitchen.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
