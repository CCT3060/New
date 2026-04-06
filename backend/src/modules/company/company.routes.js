const express = require('express');
const router = express.Router();
const ctrl = require('./company.controller');
const { verifyCompanyToken } = require('./company.service');
const recipeService = require('../recipe/recipe.service');
const { AppError } = require('../../middleware/error.middleware');
const { success } = require('../../utils/response');
const db = require('../../db/mysql');
const { v4: uuidv4 } = require('uuid');

// Middleware: verify company JWT
const companyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }
  const payload = verifyCompanyToken(authHeader.slice(7));
  if (!payload) return next(new AppError('Invalid or expired token', 401));
  req.companyUser = payload; // { userId, companyId, clientId, role }
  next();
};

router.post('/login', ctrl.login);

// ─── Pax Scale ────────────────────────────────────────────────────────────────
router.get('/pax/recipes', companyAuth, async (req, res, next) => {
  try {
    const { recipes } = await recipeService.lookupRecipes({ limit: 200, page: 1 });
    return success(res, { recipes });
  } catch (err) { next(err); }
});

router.get('/pax/scale/:recipeId', companyAuth, async (req, res, next) => {
  try {
    const targetPax = parseInt(req.query.pax, 10);
    if (!targetPax || targetPax <= 0) return next(new AppError('pax must be a positive integer', 400));
    const result = await recipeService.scaleRecipe(req.params.recipeId, targetPax);
    return success(res, result);
  } catch (err) { next(err); }
});

// ─── Pax Count Matrix ─────────────────────────────────────────────────────────
// GET /api/company/pax/matrix?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns units for the company + grouped rows (date → mealType → recipe → entries per unit)
router.get('/pax/matrix', companyAuth, async (req, res, next) => {
  try {
    const { companyId } = req.companyUser;
    const { from, to } = req.query;
    if (!from || !to) return next(new AppError('from and to dates are required', 400));

    // 1. Get all delivery units for this company
    const [units] = await db.query(
      'SELECT id, name, code FROM units WHERE companyId = ? AND isActive = 1 ORDER BY name ASC',
      [companyId]
    );

    // 2. Get recipes from menu plans for this date range (linked via unitId to this company, OR via creator's companyId)
    const [planRecipes] = await db.query(`
      SELECT DISTINCT mpi.recipeId, r.recipeName, r.category, r.mealType AS recipeMealType,
             mp.planDate, mp.mealType AS planMealType
      FROM menu_plan_items mpi
      JOIN menu_plans mp ON mp.id = mpi.menuPlanId
      JOIN recipes r ON r.id = mpi.recipeId
      LEFT JOIN units un ON un.id = mp.unitId
      WHERE mp.isActive = 1
        AND mp.planDate >= ? AND mp.planDate <= ?
        AND (un.companyId = ? OR mp.unitId IS NULL)
      ORDER BY mp.planDate ASC, mp.mealType ASC, r.recipeName ASC`,
      [from, to, companyId]
    );

    // 3. Get all pax entries for this company in the date range
    const [entries] = await db.query(
      `SELECT id, date, recipeId, mealType, unitId, paxCount, uom FROM pax_entries
       WHERE companyId = ? AND date >= ? AND date <= ?`,
      [companyId, from, to]
    );

    // Build lookup: "date|recipeId|mealType" → { unitId: entryObj }
    const lookup = {};
    for (const e of entries) {
      const d = e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date).split('T')[0];
      const key = `${d}|${e.recipeId}|${e.mealType}`;
      if (!lookup[key]) lookup[key] = {};
      lookup[key][e.unitId] = { id: e.id, paxCount: Number(e.paxCount), uom: e.uom };
    }

    // 4. Group into matrix rows: date → mealType → recipes
    const dateMap = {};
    for (const pr of planRecipes) {
      const dateStr = pr.planDate instanceof Date ? pr.planDate.toISOString().split('T')[0] : String(pr.planDate).split('T')[0];
      const mealType = pr.planMealType || pr.recipeMealType || 'LUNCH';
      if (!dateMap[dateStr]) dateMap[dateStr] = {};
      if (!dateMap[dateStr][mealType]) dateMap[dateStr][mealType] = [];
      // avoid duplicates
      const already = dateMap[dateStr][mealType].find(x => x.recipeId === pr.recipeId);
      if (!already) {
        const entryKey = `${dateStr}|${pr.recipeId}|${mealType}`;
        dateMap[dateStr][mealType].push({
          recipeId: pr.recipeId,
          recipeName: pr.recipeName,
          category: pr.category,
          mealType,
          entries: lookup[entryKey] || {},
        });
      }
    }

    // 5. Also include pax entries that exist but may not have a menu plan (manual entries)
    for (const e of entries) {
      const d = e.date instanceof Date ? e.date.toISOString().split('T')[0] : String(e.date).split('T')[0];
      const mealType = e.mealType;
      if (!dateMap[d]) dateMap[d] = {};
      if (!dateMap[d][mealType]) dateMap[d][mealType] = [];
      const already = dateMap[d][mealType].find(x => x.recipeId === e.recipeId);
      if (!already) {
        // fetch recipe name
        const [[recipeRow]] = await db.query('SELECT recipeName, category FROM recipes WHERE id = ?', [e.recipeId]);
        if (recipeRow) {
          const entryKey = `${d}|${e.recipeId}|${mealType}`;
          dateMap[d][mealType].push({
            recipeId: e.recipeId,
            recipeName: recipeRow.recipeName,
            category: recipeRow.category,
            mealType,
            entries: lookup[entryKey] || {},
          });
        }
      }
    }

    // Sort dates and build array
    const dayNames = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
    const rows = Object.keys(dateMap).sort().map(dateStr => ({
      date: dateStr,
      dayLabel: dayNames[new Date(dateStr).getDay()],
      mealGroups: Object.keys(dateMap[dateStr])
        .sort()
        .map(mt => ({ mealType: mt, recipes: dateMap[dateStr][mt] })),
    }));

    return success(res, { units, rows });
  } catch (err) { next(err); }
});

// PUT /api/company/pax/entry — upsert a pax count entry
router.put('/pax/entry', companyAuth, async (req, res, next) => {
  try {
    const { companyId } = req.companyUser;
    const { date, recipeId, mealType, unitId, paxCount, uom } = req.body;
    if (!date || !recipeId || !unitId || paxCount == null) {
      return next(new AppError('date, recipeId, unitId, paxCount are required', 400));
    }

    // Check if entry already exists
    const [[existing]] = await db.query(
      'SELECT id FROM pax_entries WHERE companyId = ? AND date = ? AND recipeId = ? AND unitId = ?',
      [companyId, date, recipeId, unitId]
    );

    if (existing) {
      await db.query(
        'UPDATE pax_entries SET paxCount = ?, uom = ?, mealType = ?, updatedAt = NOW() WHERE id = ?',
        [paxCount, uom || 'pax', mealType || 'LUNCH', existing.id]
      );
      return success(res, { id: existing.id, updated: true });
    } else {
      const id = uuidv4();
      await db.query(
        'INSERT INTO pax_entries (id, companyId, date, recipeId, mealType, unitId, paxCount, uom) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, companyId, date, recipeId, mealType || 'LUNCH', unitId, paxCount, uom || 'pax']
      );
      return success(res, { id, created: true });
    }
  } catch (err) { next(err); }
});

// POST /api/company/pax/add-recipe — add a recipe to the pax matrix manually
router.post('/pax/add-recipe', companyAuth, async (req, res, next) => {
  try {
    const { date, recipeId, mealType } = req.body;
    if (!date || !recipeId || !mealType) return next(new AppError('date, recipeId, mealType required', 400));
    // We don't need to create a menu plan entry — just verify recipe exists
    const [[recipe]] = await db.query('SELECT id, recipeName, category FROM recipes WHERE id = ? AND deletedAt IS NULL', [recipeId]);
    if (!recipe) return next(new AppError('Recipe not found', 404));
    return success(res, { recipe });
  } catch (err) { next(err); }
});

router.get('/kitchens',       companyAuth, ctrl.listKitchens);
router.post('/kitchens',      companyAuth, ctrl.createKitchen);
router.put('/kitchens/:id',   companyAuth, ctrl.updateKitchen);
router.delete('/kitchens/:id',companyAuth, ctrl.deleteKitchen);

router.get('/stores',         companyAuth, ctrl.listStores);
router.post('/stores',        companyAuth, ctrl.createStore);
router.put('/stores/:id',     companyAuth, ctrl.updateStore);
router.delete('/stores/:id',  companyAuth, ctrl.deleteStore);

router.get('/units',          companyAuth, ctrl.listUnits);
router.post('/units',         companyAuth, ctrl.createUnit);
router.put('/units/:id',      companyAuth, ctrl.updateUnit);
router.delete('/units/:id',   companyAuth, ctrl.deleteUnit);

// Kitchen Users
router.get('/kitchen-users',        companyAuth, ctrl.listKitchenUsers);
router.post('/kitchen-users',       companyAuth, ctrl.createKitchenUser);
router.put('/kitchen-users/:id',    companyAuth, ctrl.updateKitchenUser);
router.delete('/kitchen-users/:id', companyAuth, ctrl.deleteKitchenUser);

// ─── Requisition ──────────────────────────────────────────────────────────────
// GET /api/company/pax/requisition?from=YYYY-MM-DD&to=YYYY-MM-DD
// Aggregates ingredients required for all pax entries in the given date range
router.get('/pax/requisition', companyAuth, async (req, res, next) => {
  try {
    const { companyId } = req.companyUser;
    const { from, to } = req.query;
    if (!from || !to) return next(new AppError('from and to dates are required', 400));

    const [entries] = await db.query(
      `SELECT pe.date, pe.recipeId, pe.mealType, pe.paxCount, pe.uom,
              r.recipeName, r.category, r.standardPax,
              u.name AS unitName
       FROM pax_entries pe
       JOIN recipes r ON r.id = pe.recipeId
       JOIN units u ON u.id = pe.unitId
       WHERE pe.companyId = ? AND pe.date >= ? AND pe.date <= ? AND pe.paxCount > 0
       ORDER BY pe.date ASC, pe.mealType ASC`,
      [companyId, from, to]
    );

    if (entries.length === 0) {
      return success(res, { items: [], recipeBreakdown: [], from, to });
    }

    const ingredientMap = {};
    const recipeBreakdown = [];

    for (const entry of entries) {
      const d = entry.date instanceof Date
        ? entry.date.toISOString().split('T')[0]
        : String(entry.date).split('T')[0];
      try {
        const scaled = await recipeService.scaleRecipe(entry.recipeId, Number(entry.paxCount));
        recipeBreakdown.push({
          date: d,
          mealType: entry.mealType,
          recipeName: entry.recipeName,
          unitName: entry.unitName,
          paxCount: Number(entry.paxCount),
          standardPax: Number(entry.standardPax),
          scaleFactor: scaled.scaleFactor,
          ingredientCount: scaled.scaledIngredients.length,
          ingredients: scaled.scaledIngredients.map(ing => ({
            inventoryItemId: ing.inventoryItemId,
            itemCode: ing.itemCode || '',
            itemName: ing.itemName || 'Unknown',
            grossQty: parseFloat(ing.grossQty.toFixed(3)),
            grossUnit: ing.grossUnit || '',
            netQty: parseFloat(ing.netQty.toFixed(3)),
            netUnit: ing.netUnit || ing.grossUnit || '',
            wastagePercent: ing.wastagePercent,
          })),
        });
        for (const ing of scaled.scaledIngredients) {
          const key = ing.inventoryItemId;
          if (!ingredientMap[key]) {
            ingredientMap[key] = {
              inventoryItemId: ing.inventoryItemId,
              itemCode: ing.itemCode || '',
              itemName: ing.itemName || 'Unknown',
              unit: ing.grossUnit || '',
              totalGrossQty: 0,
              totalNetQty: 0,
            };
          }
          ingredientMap[key].totalGrossQty += ing.grossQty;
          ingredientMap[key].totalNetQty += ing.netQty;
        }
      } catch {
        // skip recipes with no ingredients configured
      }
    }

    const items = Object.values(ingredientMap)
      .map(i => ({
        ...i,
        totalGrossQty: parseFloat(i.totalGrossQty.toFixed(3)),
        totalNetQty: parseFloat(i.totalNetQty.toFixed(3)),
      }))
      .sort((a, b) => a.itemName.localeCompare(b.itemName));

    return success(res, { items, recipeBreakdown, from, to });
  } catch (err) { next(err); }
});

module.exports = router;
