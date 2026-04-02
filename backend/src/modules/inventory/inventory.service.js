const prisma = require('../../db/prisma');
const { AppError } = require('../../middleware/error.middleware');

/**
 * Get all inventory items with optional filters
 */
const getItems = async ({ search, category, isActive, warehouseId, page = 1, limit = 50 } = {}) => {
  const where = {};
  if (search) {
    where.OR = [
      { itemName: { contains: search, mode: 'insensitive' } },
      { itemCode: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;
  if (warehouseId) where.warehouseId = warehouseId;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      include: { warehouse: { select: { id: true, name: true, code: true } } },
      orderBy: { itemName: 'asc' },
      skip,
      take: limit,
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return { items, total };
};

/**
 * Get a single inventory item by ID
 */
const getItemById = async (id) => {
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: { warehouse: { select: { id: true, name: true, code: true } } },
  });
  if (!item) throw new AppError('Inventory item not found', 404);
  return item;
};

/**
 * Create inventory item
 */
const createItem = async (data) => {
  const existing = await prisma.inventoryItem.findUnique({ where: { itemCode: data.itemCode } });
  if (existing) throw new AppError(`Item with code '${data.itemCode}' already exists`, 409);

  return prisma.inventoryItem.create({
    data,
    include: { warehouse: { select: { id: true, name: true, code: true } } },
  });
};

/**
 * Update inventory item
 */
const updateItem = async (id, data) => {
  await getItemById(id);
  return prisma.inventoryItem.update({ where: { id }, data });
};

/**
 * Get active items for recipe ingredient selection
 */
const getActiveItemsForRecipe = async (warehouseId) => {
  return prisma.inventoryItem.findMany({
    where: { isActive: true, warehouseId },
    select: { id: true, itemCode: true, itemName: true, unit: true, costPerUnit: true, category: true },
    orderBy: { itemName: 'asc' },
  });
};

/**
 * Get warehouse list
 */
const getWarehouses = async () => {
  return prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
};

module.exports = { getItems, getItemById, createItem, updateItem, getActiveItemsForRecipe, getWarehouses };
