const { v4: uuidv4 } = require('uuid');
const db = require('../../db/mysql');

//  Column list for recipe SELECT 
const RECIPE_COLS = `
  r.id, r.recipeCode, r.recipeName, r.category, r.mealType, r.foodType, r.cuisineType,
  r.description, r.standardPax, r.yieldQty, r.yieldUnit, r.portionPerPax,
  r.prepTimeMin, r.cookTimeMin, r.status, r.versionNumber, r.isCurrentVersion,
  r.baseRecipeId, r.warehouseId, r.createdBy, r.approvedBy, r.approvedAt,
  r.approvalNote, r.createdAt, r.updatedAt,
  w.id AS w_id, w.name AS w_name, w.code AS w_code,
  cu.id AS cu_id, cu.name AS cu_name, cu.email AS cu_email,
  au.id AS au_id, au.name AS au_name, au.email AS au_email`;

const mapRecipe = (r) => ({
  id: r.id, recipeCode: r.recipeCode, recipeName: r.recipeName, category: r.category,
  mealType: r.mealType, foodType: r.foodType, cuisineType: r.cuisineType, description: r.description,
  standardPax: r.standardPax, yieldQty: r.yieldQty, yieldUnit: r.yieldUnit,
  portionPerPax: r.portionPerPax, prepTimeMin: r.prepTimeMin, cookTimeMin: r.cookTimeMin,
  status: r.status, versionNumber: r.versionNumber, isCurrentVersion: !!r.isCurrentVersion,
  baseRecipeId: r.baseRecipeId, warehouseId: r.warehouseId,
  createdBy: r.createdBy, approvedBy: r.approvedBy, approvedAt: r.approvedAt,
  approvalNote: r.approvalNote, createdAt: r.createdAt, updatedAt: r.updatedAt,
  warehouse: r.w_id ? { id: r.w_id, name: r.w_name, code: r.w_code } : null,
  creator: r.cu_id ? { id: r.cu_id, name: r.cu_name, email: r.cu_email } : null,
  approver: r.au_id ? { id: r.au_id, name: r.au_name, email: r.au_email } : null,
});

const _mapIngredient = (ri) => ({
  id: ri.id, recipeId: ri.recipeId, inventoryItemId: ri.inventoryItemId,
  sequenceNo: ri.sequenceNo, grossQty: ri.grossQty, grossUnit: ri.grossUnit,
  wastagePercent: ri.wastagePercent, netQty: ri.netQty, netUnit: ri.netUnit,
  unitCostSnapshot: ri.unitCostSnapshot, lineCost: ri.lineCost, notes: ri.notes,
  inventoryItem: ri.ii_id ? {
    id: ri.ii_id, itemCode: ri.itemCode, itemName: ri.itemName,
    unit: ri.ii_unit, costPerUnit: ri.costPerUnit, isActive: !!ri.ii_active,
  } : null,
});

const getRecipeExtras = async (id) => {
  const [ingredients] = await db.query(`
    SELECT ri.id, ri.recipeId, ri.inventoryItemId, ri.sequenceNo,
           ri.grossQty, ri.grossUnit, ri.wastagePercent, ri.netQty, ri.netUnit,
           ri.unitCostSnapshot, ri.lineCost, ri.notes,
           ii.id AS ii_id, ii.itemCode, ii.itemName, ii.unit AS ii_unit,
           ii.costPerUnit, ii.isActive AS ii_active
    FROM recipe_ingredients ri
    LEFT JOIN inventory_items ii ON ii.id = ri.inventoryItemId
    WHERE ri.recipeId = ? ORDER BY ri.sequenceNo ASC`, [id]);

  const [steps] = await db.query(
    `SELECT id, recipeId, stepNo, stepType, instruction, estimatedTimeMin,
            equipmentName, temperatureNote, qcCheckNote
     FROM recipe_steps WHERE recipeId = ? ORDER BY stepNo ASC`, [id]);

  const [costs] = await db.query(
    `SELECT * FROM recipe_costs WHERE recipeId = ? ORDER BY calculatedAt DESC LIMIT 1`, [id]);

  const [tags] = await db.query(
    `SELECT id, recipeId, tagName FROM recipe_tags WHERE recipeId = ?`, [id]);

  return { ingredients: ingredients.map(_mapIngredient), steps, costs, tags };
};

//  findAll 
const findAll = async ({
  search, status, mealType, category, foodType, warehouseId,
  isCurrentVersion = true, skip = 0, take = 20,
}) => {
  const conds = ['r.deletedAt IS NULL'];
  const params = [];
  if (search) { conds.push('(r.recipeName LIKE ? OR r.recipeCode LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (status) { conds.push('r.status = ?'); params.push(status); }
  if (mealType) { conds.push('r.mealType = ?'); params.push(mealType); }
  if (category) { conds.push('r.category LIKE ?'); params.push(`%${category}%`); }
  if (foodType) { conds.push('r.foodType = ?'); params.push(foodType); }
  if (warehouseId) { conds.push('r.warehouseId = ?'); params.push(warehouseId); }
  if (isCurrentVersion !== undefined) { conds.push('r.isCurrentVersion = ?'); params.push(isCurrentVersion ? 1 : 0); }

  const where = 'WHERE ' + conds.join(' AND ');
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM recipes r ${where}`, params);
  const [rows] = await db.query(`
    SELECT ${RECIPE_COLS}
    FROM recipes r
    LEFT JOIN warehouses w ON w.id = r.warehouseId
    LEFT JOIN users cu ON cu.id = r.createdBy
    LEFT JOIN users au ON au.id = r.approvedBy
    ${where} ORDER BY r.updatedAt DESC LIMIT ? OFFSET ?`,
    [...params, take, skip]
  );

  const recipes = await Promise.all(rows.map(async (r) => {
    const base = mapRecipe(r);
    const [costs] = await db.query('SELECT * FROM recipe_costs WHERE recipeId = ? ORDER BY calculatedAt DESC LIMIT 1', [r.id]);
    const [tags] = await db.query('SELECT id, recipeId, tagName FROM recipe_tags WHERE recipeId = ?', [r.id]);
    return { ...base, costs, tags };
  }));

  return { recipes, total };
};

//  findById 
const findById = async (id) => {
  const [[r]] = await db.query(`
    SELECT ${RECIPE_COLS}
    FROM recipes r
    LEFT JOIN warehouses w ON w.id = r.warehouseId
    LEFT JOIN users cu ON cu.id = r.createdBy
    LEFT JOIN users au ON au.id = r.approvedBy
    WHERE r.id = ? AND r.deletedAt IS NULL`, [id]);
  if (!r) return null;
  const extras = await getRecipeExtras(id);
  return { ...mapRecipe(r), ...extras };
};

const findByCode = async (recipeCode) => {
  const [[r]] = await db.query('SELECT id FROM recipes WHERE recipeCode = ? AND deletedAt IS NULL', [recipeCode]);
  return r || null;
};

//  create 
const create = async (data) => {
  const id = data.id || uuidv4();
  await db.query(`
    INSERT INTO recipes
      (id, recipeCode, recipeName, category, mealType, foodType, cuisineType, description,
       standardPax, yieldQty, yieldUnit, portionPerPax, prepTimeMin, cookTimeMin,
       status, versionNumber, isCurrentVersion, baseRecipeId, warehouseId,
       createdBy, approvedBy, approvedAt, approvalNote, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [id, data.recipeCode, data.recipeName, data.category || null,
     data.mealType || null, data.foodType || null, data.cuisineType || null, data.description || null,
     data.standardPax || 1, data.yieldQty || 1, data.yieldUnit || 'portion', data.portionPerPax || 1,
     data.prepTimeMin || 0, data.cookTimeMin || 0,
     data.status || 'DRAFT', data.versionNumber || 1, data.isCurrentVersion !== false ? 1 : 0,
     data.baseRecipeId || null, data.warehouseId || null,
     data.createdBy || null, data.approvedBy || null, data.approvedAt || null, data.approvalNote || null]
  );
  return findById(id);
};

//  update 
const update = async (id, data) => {
  const allowed = ['recipeCode','recipeName','category','mealType','foodType','cuisineType','description',
    'standardPax','yieldQty','yieldUnit','portionPerPax','prepTimeMin','cookTimeMin',
    'status','versionNumber','isCurrentVersion','baseRecipeId','warehouseId',
    'createdBy','approvedBy','approvedAt','approvalNote','deletedAt'];
  const sets = [];
  const params = [];
  for (const f of allowed) {
    if (data[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(f === 'isCurrentVersion' ? (data[f] ? 1 : 0) : data[f]);
    }
  }
  if (!sets.length) return findById(id);
  params.push(id);
  await db.query(`UPDATE recipes SET ${sets.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);
  return findById(id);
};

const softDelete = async (id) => {
  await db.query('UPDATE recipes SET deletedAt = NOW() WHERE id = ?', [id]);
};

//  Ingredients 
const findIngredientById = async (id) => {
  const [[ri]] = await db.query(`
    SELECT ri.id, ri.recipeId, ri.inventoryItemId, ri.sequenceNo,
           ri.grossQty, ri.grossUnit, ri.wastagePercent, ri.netQty, ri.netUnit,
           ri.unitCostSnapshot, ri.lineCost, ri.notes,
           ii.id AS ii_id, ii.itemCode, ii.itemName, ii.unit AS ii_unit,
           ii.costPerUnit, ii.isActive AS ii_active
    FROM recipe_ingredients ri LEFT JOIN inventory_items ii ON ii.id = ri.inventoryItemId
    WHERE ri.id = ?`, [id]);
  return ri ? _mapIngredient(ri) : null;
};

const createIngredient = async (data) => {
  const id = uuidv4();
  await db.query(
    `INSERT INTO recipe_ingredients
       (id, recipeId, inventoryItemId, sequenceNo, grossQty, grossUnit, wastagePercent,
        netQty, netUnit, unitCostSnapshot, lineCost, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.recipeId, data.inventoryItemId, data.sequenceNo || 0,
     data.grossQty, data.grossUnit, data.wastagePercent || 0,
     data.netQty, data.netUnit, data.unitCostSnapshot, data.lineCost, data.notes || null]
  );
  return findIngredientById(id);
};

const updateIngredient = async (id, data) => {
  const allowed = ['sequenceNo','grossQty','grossUnit','wastagePercent','netQty','netUnit',
    'unitCostSnapshot','lineCost','notes','inventoryItemId'];
  const sets = [];
  const params = [];
  for (const f of allowed) {
    if (data[f] !== undefined) { sets.push(`${f} = ?`); params.push(data[f]); }
  }
  if (sets.length) { params.push(id); await db.query(`UPDATE recipe_ingredients SET ${sets.join(', ')} WHERE id = ?`, params); }
  return findIngredientById(id);
};

const deleteIngredient = async (id) => {
  await db.query('DELETE FROM recipe_ingredients WHERE id = ?', [id]);
};

const findIngredientByRecipeAndItem = async (recipeId, inventoryItemId, excludeId = null) => {
  const q = excludeId
    ? 'SELECT id FROM recipe_ingredients WHERE recipeId = ? AND inventoryItemId = ? AND id != ?'
    : 'SELECT id FROM recipe_ingredients WHERE recipeId = ? AND inventoryItemId = ?';
  const p = excludeId ? [recipeId, inventoryItemId, excludeId] : [recipeId, inventoryItemId];
  const [[row]] = await db.query(q, p);
  return row || null;
};

//  Steps 
const findStepById = async (id) => {
  const [[s]] = await db.query('SELECT * FROM recipe_steps WHERE id = ?', [id]);
  return s || null;
};

const createStep = async (data) => {
  const id = uuidv4();
  await db.query(
    `INSERT INTO recipe_steps
       (id, recipeId, stepNo, stepType, instruction, estimatedTimeMin,
        equipmentName, temperatureNote, qcCheckNote)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.recipeId, data.stepNo, data.stepType || 'PREP',
     data.instruction, data.estimatedTimeMin || 0,
     data.equipmentName || null, data.temperatureNote || null, data.qcCheckNote || null]
  );
  return findStepById(id);
};

const updateStep = async (id, data) => {
  const allowed = ['stepNo','stepType','instruction','estimatedTimeMin','equipmentName','temperatureNote','qcCheckNote'];
  const sets = [];
  const params = [];
  for (const f of allowed) {
    if (data[f] !== undefined) { sets.push(`${f} = ?`); params.push(data[f]); }
  }
  if (sets.length) { params.push(id); await db.query(`UPDATE recipe_steps SET ${sets.join(', ')} WHERE id = ?`, params); }
  return findStepById(id);
};

const deleteStep = async (id) => {
  await db.query('DELETE FROM recipe_steps WHERE id = ?', [id]);
};

const getSteps = async (recipeId) => {
  const [rows] = await db.query('SELECT * FROM recipe_steps WHERE recipeId = ? ORDER BY stepNo ASC', [recipeId]);
  return rows;
};

//  Costs 
const getLatestCost = async (recipeId) => {
  const [[c]] = await db.query('SELECT * FROM recipe_costs WHERE recipeId = ? ORDER BY calculatedAt DESC LIMIT 1', [recipeId]);
  return c || null;
};

const upsertCost = async (recipeId, data) => {
  const id = uuidv4();
  await db.query(
    `INSERT INTO recipe_costs
       (id, recipeId, ingredientCost, fuelCost, laborCost, packagingCost, otherCost, totalCost, costPerPax, calculatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [id, recipeId,
     data.ingredientCost || 0, data.fuelCost || 0, data.laborCost || 0,
     data.packagingCost || 0, data.otherCost || 0, data.totalCost || 0, data.costPerPax || 0]
  );
  return getLatestCost(recipeId);
};

//  Versions 
const getVersionHistory = async (baseRecipeId) => {
  const [rows] = await db.query(`
    SELECT rv.*, u.id AS u_id, u.name AS u_name, u.role AS u_role
    FROM recipe_versions rv
    LEFT JOIN users u ON u.id = rv.changedBy
    WHERE rv.recipeId = ? OR rv.baseRecipeId = ?
    ORDER BY rv.versionNumber DESC`, [baseRecipeId, baseRecipeId]);
  return rows.map(rv => ({
    ...rv,
    changer: rv.u_id ? { id: rv.u_id, name: rv.u_name, role: rv.u_role } : null,
  }));
};

const createVersionLog = async (data) => {
  const id = uuidv4();
  await db.query(
    `INSERT INTO recipe_versions
       (id, recipeId, baseRecipeId, versionNumber, changeSummary, isCurrent, changedBy)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.recipeId, data.baseRecipeId || null, data.versionNumber,
     data.changeSummary || data.changeNote || null,
     data.isCurrent !== false ? 1 : 0, data.changedBy || null]
  );
};

const markVersionsNotCurrent = async (recipeId) => {
  await db.query('UPDATE recipe_versions SET isCurrent = 0 WHERE recipeId = ?', [recipeId]);
};

//  Tags 
const syncTags = async (recipeId, tagNames) => {
  await db.query('DELETE FROM recipe_tags WHERE recipeId = ?', [recipeId]);
  if (tagNames && tagNames.length > 0) {
    const vals = tagNames.map(() => '(?, ?)').join(', ');
    await db.query(`INSERT IGNORE INTO recipe_tags (recipeId, tagName) VALUES ${vals}`,
      tagNames.flatMap(t => [recipeId, t]));
  }
};

const getTags = async (recipeId) => {
  const [rows] = await db.query('SELECT id, recipeId, tagName FROM recipe_tags WHERE recipeId = ?', [recipeId]);
  return rows;
};

//  Ingredient helpers 
const countIngredients = async (recipeId) => {
  const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM recipe_ingredients WHERE recipeId = ?', [recipeId]);
  return count;
};

const getIngredients = async (recipeId) => {
  const [rows] = await db.query(`
    SELECT ri.id, ri.recipeId, ri.inventoryItemId, ri.sequenceNo,
           ri.grossQty, ri.grossUnit, ri.wastagePercent, ri.netQty, ri.netUnit,
           ri.unitCostSnapshot, ri.lineCost, ri.notes,
           ii.id AS ii_id, ii.itemCode, ii.itemName, ii.unit AS ii_unit,
           ii.costPerUnit, ii.isActive AS ii_active
    FROM recipe_ingredients ri LEFT JOIN inventory_items ii ON ii.id = ri.inventoryItemId
    WHERE ri.recipeId = ? ORDER BY ri.sequenceNo ASC`, [recipeId]);
  return rows.map(_mapIngredient);
};

//  Version recipe list (for version history in service) 
const findVersionsByBaseId = async (baseId) => {
  const [rows] = await db.query(`
    SELECT ${RECIPE_COLS}
    FROM recipes r
    LEFT JOIN warehouses w ON w.id = r.warehouseId
    LEFT JOIN users cu ON cu.id = r.createdBy
    LEFT JOIN users au ON au.id = r.approvedBy
    WHERE (r.id = ? OR r.baseRecipeId = ?) AND r.deletedAt IS NULL
    ORDER BY r.versionNumber DESC`, [baseId, baseId]);

  return Promise.all(rows.map(async (r) => {
    const base = mapRecipe(r);
    const cost = await getLatestCost(r.id);
    return { ...base, costs: cost ? [cost] : [] };
  }));
};

module.exports = {
  findAll, findById, findByCode, create, update, softDelete,
  findIngredientById, createIngredient, updateIngredient, deleteIngredient,
  findIngredientByRecipeAndItem,
  findStepById, createStep, updateStep, deleteStep, getSteps,
  getLatestCost, upsertCost,
  getVersionHistory, createVersionLog, markVersionsNotCurrent,
  syncTags, getTags, countIngredients, getIngredients,
  findVersionsByBaseId,
};