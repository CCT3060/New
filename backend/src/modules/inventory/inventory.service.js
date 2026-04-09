const { v4: uuidv4 } = require('uuid');
const db = require('../../db/mysql');
const { AppError } = require('../../middleware/error.middleware');

const getItems = async ({ search, category, isActive, warehouseId, storeId, page = 1, limit = 50 } = {}) => {
  const conditions = [];
  const params = [];
  if (search) {
    conditions.push('(i.itemName LIKE ? OR i.itemCode LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) { conditions.push('i.category = ?'); params.push(category); }
  if (isActive !== undefined) { conditions.push('i.isActive = ?'); params.push((isActive === 'true' || isActive === true) ? 1 : 0); }
  if (warehouseId) { conditions.push('i.warehouseId = ?'); params.push(warehouseId); }
  if (storeId) { conditions.push('i.storeId = ?'); params.push(storeId); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const skip = (page - 1) * limit;

  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM inventory_items i ${where}`, params);
  const [items] = await db.query(`
    SELECT i.*, w.id AS wId, w.name AS wName, w.code AS wCode, s.id AS sId, s.name AS sName, s.code AS sCode
    FROM inventory_items i
    LEFT JOIN warehouses w ON w.id = i.warehouseId
    LEFT JOIN stores s ON s.id = i.storeId
    ${where} ORDER BY i.itemName ASC LIMIT ? OFFSET ?`,
    [...params, limit, skip]
  );
  return { items: items.map(mapItem), total };
};

const getItemById = async (id) => {
  const [[item]] = await db.query(`
    SELECT i.*, w.id AS wId, w.name AS wName, w.code AS wCode, s.id AS sId, s.name AS sName, s.code AS sCode
    FROM inventory_items i
    LEFT JOIN warehouses w ON w.id = i.warehouseId
    LEFT JOIN stores s ON s.id = i.storeId
    WHERE i.id = ?`, [id]
  );
  if (!item) throw new AppError('Inventory item not found', 404);
  return mapItem(item);
};

const createItem = async (data) => {
  const [[existing]] = await db.query('SELECT id FROM inventory_items WHERE itemCode = ?', [data.itemCode]);
  if (existing) throw new AppError(`Item with code '${data.itemCode}' already exists`, 409);

  const id = uuidv4();
  await db.query(
    'INSERT INTO inventory_items (id, itemCode, itemName, unit, costPerUnit, category, isActive, warehouseId, storeId, currentStock, minimumStock, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
    [id, data.itemCode, data.itemName, data.unit, data.costPerUnit ?? 0, data.category || null, data.isActive !== false ? 1 : 0, data.warehouseId || null, data.storeId || null, data.currentStock ?? 0, data.minimumStock ?? 0]
  );
  return getItemById(id);
};

const updateItem = async (id, data) => {
  await getItemById(id);
  const sets = [];
  const params = [];
  const fields = ['itemCode','itemName','unit','costPerUnit','category','isActive','warehouseId','storeId','currentStock','minimumStock'];
  for (const f of fields) {
    if (data[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(f === 'isActive' ? (data[f] ? 1 : 0) : data[f]);
    }
  }
  if (sets.length) {
    params.push(id);
    await db.query(`UPDATE inventory_items SET ${sets.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);
  }
  return getItemById(id);
};

const getActiveItemsForRecipe = async (warehouseId) => {
  if (warehouseId) {
    const [rows] = await db.query(
      'SELECT id, itemCode, itemName, unit, costPerUnit, category, currentStock FROM inventory_items WHERE isActive = 1 AND warehouseId = ? ORDER BY itemName ASC',
      [warehouseId]
    );
    return rows;
  }
  const [rows] = await db.query(
    'SELECT id, itemCode, itemName, unit, costPerUnit, category, currentStock FROM inventory_items WHERE isActive = 1 ORDER BY itemName ASC'
  );
  return rows;
};

const getWarehouses = async () => {
  const [rows] = await db.query('SELECT id, name, code FROM warehouses WHERE isActive = 1 ORDER BY name ASC');
  return rows;
};

const getStoresByCompany = async (companyId) => {
  const params = [];
  let where = 'WHERE isActive = 1';
  if (companyId) { where += ' AND companyId = ?'; params.push(companyId); }
  const [rows] = await db.query(`SELECT id, name, code, companyId FROM stores ${where} ORDER BY name ASC`, params);
  return rows;
};

const mapItem = (r) => ({
  id: r.id, itemCode: r.itemCode, itemName: r.itemName, unit: r.unit,
  costPerUnit: r.costPerUnit, category: r.category, isActive: !!r.isActive,
  currentStock: parseFloat(r.currentStock) || 0,
  minimumStock: parseFloat(r.minimumStock) || 0,
  warehouseId: r.warehouseId, createdAt: r.createdAt, updatedAt: r.updatedAt,
  warehouse: r.wId ? { id: r.wId, name: r.wName, code: r.wCode } : null,
  storeId: r.storeId || null,
  store: r.sId ? { id: r.sId, name: r.sName, code: r.sCode } : null,
});

module.exports = { getItems, getItemById, createItem, updateItem, getActiveItemsForRecipe, getWarehouses, getStoresByCompany };
