const { v4: uuidv4 } = require('uuid');
const db = require('../../db/mysql');

//  helpers 

const getDefaultWarehouseId = async () => {
  const [[w]] = await db.query('SELECT id FROM warehouses WHERE isActive = 1 LIMIT 1');
  if (!w) throw Object.assign(new Error('No warehouse configured'), { status: 400 });
  return w.id;
};

const PLAN_COLS = `
  mp.id, mp.planName, mp.planDate, mp.mealType, mp.description,
  mp.warehouseId, mp.unitId, mp.createdBy, mp.isActive, mp.createdAt, mp.updatedAt,
  w.id AS w_id, w.name AS w_name, w.code AS w_code,
  u.id AS u_id, u.name AS u_name,
  un.id AS un_id, un.name AS un_name, un.code AS un_code`;

const mapPlan = (p) => ({
  id: p.id, planName: p.planName, planDate: p.planDate, mealType: p.mealType,
  description: p.description, warehouseId: p.warehouseId, unitId: p.unitId,
  createdBy: p.createdBy, isActive: !!p.isActive, createdAt: p.createdAt, updatedAt: p.updatedAt,
  warehouse: p.w_id ? { id: p.w_id, name: p.w_name, code: p.w_code } : null,
  creator: p.u_id ? { id: p.u_id, name: p.u_name } : null,
  unit: p.un_id ? { id: p.un_id, name: p.un_name, code: p.un_code } : null,
});

const ITEM_RECIPE_COLS = `
  r.id, r.recipeCode, r.recipeName, r.category, r.mealType AS r_mealType,
  r.foodType, r.status, r.standardPax, r.yieldQty, r.yieldUnit`;

const getPlanItems = async (menuPlanId, includeIngredients = false) => {
  const [items] = await db.query(`
    SELECT mpi.id, mpi.menuPlanId, mpi.recipeId, mpi.servings, mpi.notes, mpi.sortOrder,
           ${ITEM_RECIPE_COLS}
    FROM menu_plan_items mpi
    LEFT JOIN recipes r ON r.id = mpi.recipeId
    WHERE mpi.menuPlanId = ? ORDER BY mpi.sortOrder ASC`, [menuPlanId]);

  if (!includeIngredients) {
    return items.map(i => ({
      id: i.id, menuPlanId: i.menuPlanId, recipeId: i.recipeId,
      servings: i.servings, notes: i.notes, sortOrder: i.sortOrder,
      recipe: i.id ? {
        id: i.recipeId, recipeCode: i.recipeCode, recipeName: i.recipeName,
        category: i.category, mealType: i.r_mealType, foodType: i.foodType,
        status: i.status, standardPax: i.standardPax, yieldQty: i.yieldQty, yieldUnit: i.yieldUnit,
      } : null,
    }));
  }

  // Include ingredients for report
  return Promise.all(items.map(async (i) => {
    const [ingredients] = await db.query(`
      SELECT ri.id, ri.inventoryItemId, ri.sequenceNo, ri.grossQty, ri.grossUnit,
             ri.wastagePercent, ri.netQty, ri.netUnit, ri.unitCostSnapshot, ri.lineCost,
             ii.id AS ii_id, ii.itemCode, ii.itemName, ii.unit, ii.costPerUnit
      FROM recipe_ingredients ri
      LEFT JOIN inventory_items ii ON ii.id = ri.inventoryItemId
      WHERE ri.recipeId = ? ORDER BY ri.sequenceNo ASC`, [i.recipeId]);

    return {
      id: i.id, menuPlanId: i.menuPlanId, recipeId: i.recipeId,
      servings: i.servings, notes: i.notes, sortOrder: i.sortOrder,
      recipe: {
        id: i.recipeId, recipeCode: i.recipeCode, recipeName: i.recipeName,
        category: i.category, mealType: i.r_mealType, foodType: i.foodType,
        status: i.status, standardPax: i.standardPax, yieldQty: i.yieldQty, yieldUnit: i.yieldUnit,
        ingredients: ingredients.map(ri => ({
          ...ri,
          inventoryItem: ri.ii_id ? { id: ri.ii_id, itemCode: ri.itemCode, itemName: ri.itemName, unit: ri.unit, costPerUnit: ri.costPerUnit } : null,
        })),
      },
    };
  }));
};

//  listMenuPlans 

const listMenuPlans = async ({ warehouseId, mealType, planDate, planDateFrom, planDateTo, search, skip = 0, take = 20 }) => {
  const conds = ['mp.isActive = 1'];
  const params = [];

  if (warehouseId) { conds.push('mp.warehouseId = ?'); params.push(warehouseId); }
  if (mealType) { conds.push('mp.mealType = ?'); params.push(mealType); }

  if (planDateFrom && planDateTo) {
    conds.push('mp.planDate >= ? AND mp.planDate <= ?');
    params.push(planDateFrom, planDateTo);
  } else if (planDate) {
    conds.push('mp.planDate = ?');
    params.push(planDate);
  }

  if (search) {
    conds.push('(mp.planName LIKE ? OR mp.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = 'WHERE ' + conds.join(' AND ');
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM menu_plans mp ${where}`, params);

  const [rows] = await db.query(`
    SELECT ${PLAN_COLS}, (SELECT COUNT(*) FROM menu_plan_items WHERE menuPlanId = mp.id) AS itemCount
    FROM menu_plans mp
    LEFT JOIN warehouses w ON w.id = mp.warehouseId
    LEFT JOIN users u ON u.id = mp.createdBy
    LEFT JOIN units un ON un.id = mp.unitId
    ${where} ORDER BY mp.planDate DESC LIMIT ? OFFSET ?`,
    [...params, take, skip]
  );

  const menuPlans = await Promise.all(rows.map(async (p) => {
    const base = mapPlan(p);
    base._count = { items: p.itemCount };
    if (planDateFrom && planDateTo) {
      base.items = await getPlanItems(p.id);
    }
    return base;
  }));

  return { menuPlans, total };
};

//  getMenuPlanById 

const getMenuPlanById = async (id) => {
  const [[p]] = await db.query(`
    SELECT ${PLAN_COLS}
    FROM menu_plans mp
    LEFT JOIN warehouses w ON w.id = mp.warehouseId
    LEFT JOIN users u ON u.id = mp.createdBy
    LEFT JOIN units un ON un.id = mp.unitId
    WHERE mp.id = ? AND mp.isActive = 1`, [id]);
  if (!p) throw Object.assign(new Error('Menu plan not found'), { status: 404 });
  const items = await getPlanItems(id);
  return { ...mapPlan(p), items };
};

//  createMenuPlan 

const createMenuPlan = async (data, userId) => {
  const id = uuidv4();
  if (!data.warehouseId) data.warehouseId = await getDefaultWarehouseId();

  await db.query(`
    INSERT INTO menu_plans (id, planName, planDate, mealType, description, unitId, warehouseId, createdBy, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [id, data.planName, data.planDate, data.mealType, data.description || null, data.unitId || null, data.warehouseId, userId]
  );

  if (data.items && data.items.length > 0) {
    for (let idx = 0; idx < data.items.length; idx++) {
      const item = data.items[idx];
      await db.query(
        'INSERT INTO menu_plan_items (id, menuPlanId, recipeId, servings, notes, sortOrder) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), id, item.recipeId, item.servings || 1, item.notes || null, item.sortOrder ?? idx]
      );
    }
  }

  return getMenuPlanById(id);
};

//  updateMenuPlan 

const updateMenuPlan = async (id, data, userId) => {
  const [[plan]] = await db.query('SELECT id FROM menu_plans WHERE id = ? AND isActive = 1', [id]);
  if (!plan) throw Object.assign(new Error('Menu plan not found'), { status: 404 });

  const allowed = ['planName','planDate','mealType','description','warehouseId','unitId'];
  const sets = [];
  const params = [];
  for (const f of allowed) {
    if (data[f] !== undefined) { sets.push(`${f} = ?`); params.push(data[f]); }
  }
  if (sets.length) { params.push(id); await db.query(`UPDATE menu_plans SET ${sets.join(', ')}, updatedAt = NOW() WHERE id = ?`, params); }

  return getMenuPlanById(id);
};

//  deleteMenuPlan 

const deleteMenuPlan = async (id) => {
  const [[plan]] = await db.query('SELECT id FROM menu_plans WHERE id = ? AND isActive = 1', [id]);
  if (!plan) throw Object.assign(new Error('Menu plan not found'), { status: 404 });
  await db.query('UPDATE menu_plans SET isActive = 0 WHERE id = ?', [id]);
};

//  addItem 

const addItem = async (menuPlanId, data) => {
  const [[plan]] = await db.query('SELECT id FROM menu_plans WHERE id = ? AND isActive = 1', [menuPlanId]);
  if (!plan) throw Object.assign(new Error('Menu plan not found'), { status: 404 });

  const [[recipe]] = await db.query('SELECT id FROM recipes WHERE id = ? AND deletedAt IS NULL', [data.recipeId]);
  if (!recipe) throw Object.assign(new Error('Recipe not found'), { status: 404 });

  const [[existing]] = await db.query('SELECT id FROM menu_plan_items WHERE menuPlanId = ? AND recipeId = ?', [menuPlanId, data.recipeId]);
  if (existing) throw Object.assign(new Error('Recipe already in this menu plan'), { status: 409 });

  const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM menu_plan_items WHERE menuPlanId = ?', [menuPlanId]);
  const id = uuidv4();

  await db.query(
    'INSERT INTO menu_plan_items (id, menuPlanId, recipeId, servings, notes, sortOrder) VALUES (?, ?, ?, ?, ?, ?)',
    [id, menuPlanId, data.recipeId, data.servings || 1, data.notes || null, data.sortOrder ?? count]
  );

  const [[item]] = await db.query(`
    SELECT mpi.id, mpi.menuPlanId, mpi.recipeId, mpi.servings, mpi.notes, mpi.sortOrder,
           ${ITEM_RECIPE_COLS}
    FROM menu_plan_items mpi LEFT JOIN recipes r ON r.id = mpi.recipeId
    WHERE mpi.id = ?`, [id]);

  return {
    id: item.id, menuPlanId: item.menuPlanId, recipeId: item.recipeId,
    servings: item.servings, notes: item.notes, sortOrder: item.sortOrder,
    recipe: { id: item.recipeId, recipeCode: item.recipeCode, recipeName: item.recipeName, mealType: item.r_mealType, foodType: item.foodType, status: item.status, standardPax: item.standardPax },
  };
};

//  updateItem 

const updateItem = async (menuPlanId, itemId, data) => {
  const [[item]] = await db.query('SELECT id FROM menu_plan_items WHERE id = ? AND menuPlanId = ?', [itemId, menuPlanId]);
  if (!item) throw Object.assign(new Error('Menu plan item not found'), { status: 404 });

  const sets = [];
  const params = [];
  if (data.servings !== undefined) { sets.push('servings = ?'); params.push(data.servings); }
  if (data.notes !== undefined) { sets.push('notes = ?'); params.push(data.notes); }
  if (data.sortOrder !== undefined) { sets.push('sortOrder = ?'); params.push(data.sortOrder); }

  if (sets.length) { params.push(itemId); await db.query(`UPDATE menu_plan_items SET ${sets.join(', ')} WHERE id = ?`, params); }

  const [[updated]] = await db.query(`
    SELECT mpi.id, mpi.menuPlanId, mpi.recipeId, mpi.servings, mpi.notes, mpi.sortOrder,
           ${ITEM_RECIPE_COLS}
    FROM menu_plan_items mpi LEFT JOIN recipes r ON r.id = mpi.recipeId
    WHERE mpi.id = ?`, [itemId]);

  return {
    id: updated.id, menuPlanId: updated.menuPlanId, recipeId: updated.recipeId,
    servings: updated.servings, notes: updated.notes, sortOrder: updated.sortOrder,
    recipe: { id: updated.recipeId, recipeCode: updated.recipeCode, recipeName: updated.recipeName, mealType: updated.r_mealType, foodType: updated.foodType },
  };
};

//  removeItem 

const removeItem = async (menuPlanId, itemId) => {
  const [[item]] = await db.query('SELECT id FROM menu_plan_items WHERE id = ? AND menuPlanId = ?', [itemId, menuPlanId]);
  if (!item) throw Object.assign(new Error('Menu plan item not found'), { status: 404 });
  await db.query('DELETE FROM menu_plan_items WHERE id = ?', [itemId]);
};

//  findOrCreatePlan 

const findOrCreatePlan = async (planDate, mealType, warehouseId, userId) => {
  const resolvedWarehouseId = warehouseId || await getDefaultWarehouseId();
  const dateStr = typeof planDate === 'string' ? planDate.split('T')[0] : new Date(planDate).toISOString().split('T')[0];

  const [[existing]] = await db.query(
    'SELECT id, planName, planDate, mealType, warehouseId FROM menu_plans WHERE mealType = ? AND warehouseId = ? AND isActive = 1 AND DATE(planDate) = ?',
    [mealType, resolvedWarehouseId, dateStr]
  );

  if (existing) return existing;

  const id = uuidv4();
  const dateObj = new Date(planDate);
  const fmt = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const planName = `${mealType.charAt(0) + mealType.slice(1).toLowerCase()} — ${fmt}`;

  await db.query(
    'INSERT INTO menu_plans (id, planName, planDate, mealType, warehouseId, createdBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
    [id, planName, dateStr, mealType, resolvedWarehouseId, userId]
  );

  return { id, planName, planDate: dateStr, mealType, warehouseId: resolvedWarehouseId };
};

//  dropRecipeOnSlot 

const dropRecipeOnSlot = async ({ planDate, mealType, warehouseId, recipeId, servings = 1 }, userId) => {
  const plan = await findOrCreatePlan(planDate, mealType, warehouseId, userId);

  const [[existing]] = await db.query('SELECT id FROM menu_plan_items WHERE menuPlanId = ? AND recipeId = ?', [plan.id, recipeId]);
  if (existing) return { plan, item: existing, alreadyExists: true };

  const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM menu_plan_items WHERE menuPlanId = ?', [plan.id]);
  const id = uuidv4();
  await db.query(
    'INSERT INTO menu_plan_items (id, menuPlanId, recipeId, servings, sortOrder) VALUES (?, ?, ?, ?, ?)',
    [id, plan.id, recipeId, servings, count]
  );

  const [[item]] = await db.query(`
    SELECT mpi.id, mpi.menuPlanId, mpi.recipeId, mpi.servings, mpi.notes, mpi.sortOrder,
           ${ITEM_RECIPE_COLS}
    FROM menu_plan_items mpi LEFT JOIN recipes r ON r.id = mpi.recipeId
    WHERE mpi.id = ?`, [id]);

  return {
    plan,
    item: {
      id: item.id, menuPlanId: item.menuPlanId, recipeId: item.recipeId,
      servings: item.servings, notes: item.notes, sortOrder: item.sortOrder,
      recipe: { id: item.recipeId, recipeCode: item.recipeCode, recipeName: item.recipeName, mealType: item.r_mealType, foodType: item.foodType, standardPax: item.standardPax },
    },
    alreadyExists: false,
  };
};

//  moveItemBetweenSlots 

const moveItemBetweenSlots = async ({ itemId, sourcePlanId, targetDate, targetMealType, warehouseId }, userId) => {
  const [[item]] = await db.query('SELECT id, recipeId FROM menu_plan_items WHERE id = ? AND menuPlanId = ?', [itemId, sourcePlanId]);
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });

  const resolvedWarehouseId = warehouseId || await getDefaultWarehouseId();
  const targetPlan = await findOrCreatePlan(targetDate, targetMealType, resolvedWarehouseId, userId);

  if (targetPlan.id === sourcePlanId) return;

  const [[exists]] = await db.query('SELECT id FROM menu_plan_items WHERE menuPlanId = ? AND recipeId = ?', [targetPlan.id, item.recipeId]);
  if (exists) {
    await db.query('DELETE FROM menu_plan_items WHERE id = ?', [itemId]);
    return;
  }

  await db.query('UPDATE menu_plan_items SET menuPlanId = ? WHERE id = ?', [targetPlan.id, itemId]);
};

//  getReport 

const getReport = async (dateFrom, dateTo) => {
  const fromStr = typeof dateFrom === 'string' ? dateFrom.split('T')[0] : new Date(dateFrom).toISOString().split('T')[0];
  const toStr = typeof dateTo === 'string' ? dateTo.split('T')[0] : new Date(dateTo).toISOString().split('T')[0];

  const [planRows] = await db.query(`
    SELECT ${PLAN_COLS}
    FROM menu_plans mp
    LEFT JOIN warehouses w ON w.id = mp.warehouseId
    LEFT JOIN users u ON u.id = mp.createdBy
    WHERE mp.isActive = 1 AND DATE(mp.planDate) >= ? AND DATE(mp.planDate) <= ?
    ORDER BY mp.planDate ASC, mp.mealType ASC`, [fromStr, toStr]);

  const plans = await Promise.all(planRows.map(async (p) => {
    const items = await getPlanItems(p.id, true);
    return { ...mapPlan(p), items };
  }));

  // Aggregate ingredient totals
  const ingredientMap = {};
  plans.forEach((plan) => {
    plan.items.forEach((item) => {
      const scaleFactor = (item.servings && item.recipe.standardPax > 0)
        ? item.servings / item.recipe.standardPax : 1;
      (item.recipe.ingredients || []).forEach((ing) => {
        const key = ing.inventoryItemId;
        if (!ingredientMap[key]) {
          ingredientMap[key] = {
            inventoryItemId: key,
            itemCode: ing.inventoryItem?.itemCode,
            itemName: ing.inventoryItem?.itemName,
            unit: ing.inventoryItem?.unit,
            costPerUnit: parseFloat(ing.inventoryItem?.costPerUnit || 0),
            totalNetQty: 0, totalGrossQty: 0, totalLineCost: 0,
          };
        }
        ingredientMap[key].totalNetQty += parseFloat(ing.netQty) * scaleFactor;
        ingredientMap[key].totalGrossQty += parseFloat(ing.grossQty) * scaleFactor;
        ingredientMap[key].totalLineCost += parseFloat(ing.lineCost) * scaleFactor;
      });
    });
  });

  return {
    plans, dateFrom, dateTo,
    ingredientSummary: Object.values(ingredientMap).sort((a, b) => a.itemName?.localeCompare(b.itemName || '') || 0),
  };
};

//  clearDateRangePlans 

const clearDateRangePlans = async (dateFrom, dateTo) => {
  const fromStr = typeof dateFrom === 'string' ? dateFrom.split('T')[0] : new Date(dateFrom).toISOString().split('T')[0];
  const toStr = typeof dateTo === 'string' ? dateTo.split('T')[0] : new Date(dateTo).toISOString().split('T')[0];

  const [result] = await db.query(
    'UPDATE menu_plans SET isActive = 0 WHERE isActive = 1 AND DATE(planDate) >= ? AND DATE(planDate) <= ?',
    [fromStr, toStr]
  );
  return { cleared: result.affectedRows };
};

//  duplicateWeek 

const duplicateWeek = async (sourceFrom, sourceTo, targetFrom, userId) => {
  const sfStr = typeof sourceFrom === 'string' ? sourceFrom.split('T')[0] : new Date(sourceFrom).toISOString().split('T')[0];
  const stStr = typeof sourceTo === 'string' ? sourceTo.split('T')[0] : new Date(sourceTo).toISOString().split('T')[0];
  const tfDate = new Date(targetFrom);
  const sfDate = new Date(sourceFrom);
  const diffMs = tfDate.getTime() - sfDate.getTime();

  const [sourcePlans] = await db.query(
    'SELECT * FROM menu_plans WHERE isActive = 1 AND DATE(planDate) >= ? AND DATE(planDate) <= ?',
    [sfStr, stStr]
  );

  let createdCount = 0;
  let skippedCount = 0;

  for (const plan of sourcePlans) {
    const newDate = new Date(new Date(plan.planDate).getTime() + diffMs);
    const newDateStr = newDate.toISOString().split('T')[0];

    const [[exists]] = await db.query(
      'SELECT id FROM menu_plans WHERE mealType = ? AND warehouseId = ? AND isActive = 1 AND DATE(planDate) = ?',
      [plan.mealType, plan.warehouseId, newDateStr]
    );
    if (exists) { skippedCount++; continue; }

    const newPlanId = uuidv4();
    await db.query(
      'INSERT INTO menu_plans (id, planName, planDate, mealType, description, warehouseId, createdBy, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
      [newPlanId, plan.planName, newDateStr, plan.mealType, plan.description || null, plan.warehouseId, userId]
    );

    const [items] = await db.query('SELECT * FROM menu_plan_items WHERE menuPlanId = ?', [plan.id]);
    for (const item of items) {
      await db.query(
        'INSERT INTO menu_plan_items (id, menuPlanId, recipeId, servings, notes, sortOrder) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), newPlanId, item.recipeId, item.servings, item.notes || null, item.sortOrder]
      );
    }
    createdCount++;
  }

  return { created: createdCount, skipped: skippedCount };
};

module.exports = {
  listMenuPlans, getMenuPlanById, createMenuPlan, updateMenuPlan, deleteMenuPlan,
  addItem, updateItem, removeItem,
  dropRecipeOnSlot, moveItemBetweenSlots,
  getReport, clearDateRangePlans, duplicateWeek,
};