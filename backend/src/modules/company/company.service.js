const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/mysql');
const { AppError } = require('../../middleware/error.middleware');

const COMPANY_JWT_SECRET = process.env.JWT_SECRET + '_company';

const generateCompanyToken = (userId, companyId, clientId) =>
  jwt.sign({ userId, companyId, clientId, role: 'COMPANY_ADMIN' }, COMPANY_JWT_SECRET, { expiresIn: '8h' });

const generateInnerToken = (userId, role, companyId) =>
  jwt.sign({ userId, role, companyId }, process.env.JWT_SECRET, { expiresIn: '8h' });

// ─── Login (uses users table — user must have companyId) ──────────────────────
const companyLogin = async ({ email, password }) => {
  const [[user]] = await db.query(
    'SELECT id, name, email, passwordHash, role, isActive, companyId, clientId FROM users WHERE email = ?',
    [email]
  );
  if (!user) throw new AppError('Invalid email or password', 401);
  if (!user.isActive) throw new AppError('Your account has been deactivated.', 401);
  if (!user.companyId) throw new AppError('This account is not linked to a company.', 403);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401);

  // Get company details
  const [[company]] = await db.query(
    'SELECT id, name, code, isActive FROM companies WHERE id = ?', [user.companyId]
  );
  if (!company || !company.isActive) throw new AppError('Company account is inactive.', 401);

  const token = generateCompanyToken(user.id, user.companyId, user.clientId);
  const innerToken = generateInnerToken(user.id, user.role, user.companyId);
  return {
    token,
    innerToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    company: { ...company, isActive: !!company.isActive },
  };
};

// ─── Kitchens ────────────────────────────────────────────────────────────────
const listKitchens = async (companyId) => {
  const [rows] = await db.query(
    `SELECT k.id, k.name, k.address, k.isActive, k.createdAt,
            COUNT(s.id) AS storesCount
     FROM kitchens k
     LEFT JOIN stores s ON s.kitchenId = k.id
     WHERE k.companyId = ?
     GROUP BY k.id
     ORDER BY k.createdAt DESC`,
    [companyId]
  );
  return rows.map(r => ({ ...r, isActive: !!r.isActive, storesCount: Number(r.storesCount) }));
};

const createKitchen = async (companyId, clientId, { name, address }) => {
  const id = uuidv4();
  await db.query(
    'INSERT INTO kitchens (id, name, address, companyId, clientId, isActive) VALUES (?, ?, ?, ?, ?, 1)',
    [id, name, address || null, companyId, clientId]
  );
  const [[kitchen]] = await db.query(
    'SELECT id, name, address, isActive, createdAt FROM kitchens WHERE id = ?', [id]
  );
  return { ...kitchen, isActive: !!kitchen.isActive };
};

const updateKitchen = async (id, companyId, { name, address, isActive }) => {
  const [[k]] = await db.query('SELECT id FROM kitchens WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!k) throw new AppError('Kitchen not found', 404);

  const sets = [];
  const params = [];
  if (name !== undefined)     { sets.push('name = ?');     params.push(name); }
  if (address !== undefined)  { sets.push('address = ?');  params.push(address); }
  if (isActive !== undefined) { sets.push('isActive = ?'); params.push(isActive ? 1 : 0); }
  if (sets.length === 0) throw new AppError('Nothing to update', 400);

  params.push(id);
  await db.query(`UPDATE kitchens SET ${sets.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);
  const [[updated]] = await db.query('SELECT id, name, address, isActive, updatedAt FROM kitchens WHERE id = ?', [id]);
  return { ...updated, isActive: !!updated.isActive };
};

const deleteKitchen = async (id, companyId) => {
  const [[k]] = await db.query('SELECT id FROM kitchens WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!k) throw new AppError('Kitchen not found', 404);
  await db.query('DELETE FROM kitchens WHERE id = ?', [id]);
};

// ─── Stores ───────────────────────────────────────────────────────────────────
const listStores = async (companyId, kitchenId) => {
  const where = kitchenId
    ? 'WHERE s.companyId = ? AND s.kitchenId = ?'
    : 'WHERE s.companyId = ?';
  const params = kitchenId ? [companyId, kitchenId] : [companyId];
  const [rows] = await db.query(
    `SELECT s.id, s.name, s.code, s.isActive, s.createdAt, s.kitchenId, k.name AS kitchenName
     FROM stores s
     LEFT JOIN kitchens k ON k.id = s.kitchenId
     ${where}
     ORDER BY s.createdAt DESC`,
    params
  );
  return rows.map(r => ({ ...r, isActive: !!r.isActive }));
};

const createStore = async (companyId, clientId, { name, code, kitchenId }) => {
  const [[kitchen]] = await db.query('SELECT id FROM kitchens WHERE id = ? AND companyId = ?', [kitchenId, companyId]);
  if (!kitchen) throw new AppError('Kitchen not found', 404);

  const id = uuidv4();
  await db.query(
    'INSERT INTO stores (id, name, code, kitchenId, companyId, clientId, isActive) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [id, name, code || name.toUpperCase().replace(/\s+/g, '_').slice(0, 20), kitchenId, companyId, clientId]
  );
  const [[store]] = await db.query(
    `SELECT s.id, s.name, s.code, s.isActive, s.createdAt, s.kitchenId, k.name AS kitchenName
     FROM stores s LEFT JOIN kitchens k ON k.id = s.kitchenId WHERE s.id = ?`, [id]
  );
  return { ...store, isActive: !!store.isActive };
};

const updateStore = async (id, companyId, { name, code, isActive, kitchenId }) => {
  const [[s]] = await db.query('SELECT id FROM stores WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!s) throw new AppError('Store not found', 404);

  const sets = [];
  const params = [];
  if (name !== undefined)      { sets.push('name = ?');      params.push(name); }
  if (code !== undefined)      { sets.push('code = ?');      params.push(code); }
  if (isActive !== undefined)  { sets.push('isActive = ?');  params.push(isActive ? 1 : 0); }
  if (kitchenId !== undefined) { sets.push('kitchenId = ?'); params.push(kitchenId); }
  if (sets.length === 0) throw new AppError('Nothing to update', 400);

  params.push(id);
  await db.query(`UPDATE stores SET ${sets.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);
  const [[updated]] = await db.query(
    `SELECT s.id, s.name, s.code, s.isActive, s.updatedAt, s.kitchenId, k.name AS kitchenName
     FROM stores s LEFT JOIN kitchens k ON k.id = s.kitchenId WHERE s.id = ?`, [id]
  );
  return { ...updated, isActive: !!updated.isActive };
};

const deleteStore = async (id, companyId) => {
  const [[s]] = await db.query('SELECT id FROM stores WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!s) throw new AppError('Store not found', 404);
  await db.query('DELETE FROM stores WHERE id = ?', [id]);
};

// ─── Units (delivery destinations) ───────────────────────────────────────────
const listUnits = async (companyId) => {
  const [rows] = await db.query(
    'SELECT id, name, code, address, isActive, createdAt FROM units WHERE companyId = ? ORDER BY name ASC',
    [companyId]
  );
  return rows.map(r => ({ ...r, isActive: !!r.isActive }));
};

const createUnit = async (companyId, clientId, { name, code, address }) => {
  const id = uuidv4();
  await db.query(
    'INSERT INTO units (id, name, code, address, companyId, clientId, isActive) VALUES (?, ?, ?, ?, ?, ?, 1)',
    [id, name, code || null, address || null, companyId, clientId]
  );
  const [[unit]] = await db.query(
    'SELECT id, name, code, address, isActive, createdAt FROM units WHERE id = ?', [id]
  );
  return { ...unit, isActive: !!unit.isActive };
};

const updateUnit = async (id, companyId, { name, code, address, isActive }) => {
  const [[u]] = await db.query('SELECT id FROM units WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!u) throw new AppError('Unit not found', 404);

  const sets = [];
  const params = [];
  if (name !== undefined)     { sets.push('name = ?');     params.push(name); }
  if (code !== undefined)     { sets.push('code = ?');     params.push(code); }
  if (address !== undefined)  { sets.push('address = ?');  params.push(address); }
  if (isActive !== undefined) { sets.push('isActive = ?'); params.push(isActive ? 1 : 0); }
  if (sets.length === 0) throw new AppError('Nothing to update', 400);

  params.push(id);
  await db.query(`UPDATE units SET ${sets.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);
  const [[updated]] = await db.query(
    'SELECT id, name, code, address, isActive, updatedAt FROM units WHERE id = ?', [id]
  );
  return { ...updated, isActive: !!updated.isActive };
};

const deleteUnit = async (id, companyId) => {
  const [[u]] = await db.query('SELECT id FROM units WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!u) throw new AppError('Unit not found', 404);
  await db.query('DELETE FROM units WHERE id = ?', [id]);
};

// ─── Kitchen Users ────────────────────────────────────────────────────────────
const listKitchenUsers = async (companyId, kitchenId) => {
  const where = kitchenId ? 'WHERE u.companyId = ? AND u.kitchenId = ?' : 'WHERE u.companyId = ?';
  const params = kitchenId ? [companyId, kitchenId] : [companyId];
  const [rows] = await db.query(`
    SELECT u.id, u.name, u.email, u.role, u.isActive, u.createdAt, u.kitchenId,
           k.name AS kitchenName
    FROM users u
    LEFT JOIN kitchens k ON k.id = u.kitchenId
    ${where}
    ORDER BY u.createdAt DESC
  `, params);
  return rows.map(r => ({ ...r, isActive: !!r.isActive }));
};

const createKitchenUser = async (companyId, clientId, { name, email, password, role, kitchenId }) => {
  // Validate kitchen belongs to this company
  const [[kitchen]] = await db.query('SELECT id FROM kitchens WHERE id = ? AND companyId = ?', [kitchenId, companyId]);
  if (!kitchen) throw new AppError('Kitchen not found', 404);

  const [[existing]] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) throw new AppError('A user with this email already exists', 409);

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);
  await db.query(
    'INSERT INTO users (id, name, email, passwordHash, role, isActive, clientId, companyId, kitchenId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, NOW(), NOW())',
    [id, name, email, passwordHash, role || 'KITCHEN_MANAGER', clientId, companyId, kitchenId]
  );
  const [[user]] = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.isActive, u.createdAt, u.kitchenId, k.name AS kitchenName
     FROM users u LEFT JOIN kitchens k ON k.id = u.kitchenId WHERE u.id = ?`, [id]
  );
  return { ...user, isActive: !!user.isActive };
};

const updateKitchenUser = async (id, companyId, { name, role, isActive, password }) => {
  const [[user]] = await db.query('SELECT id FROM users WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!user) throw new AppError('User not found', 404);

  const sets = [];
  const params = [];
  if (name !== undefined)     { sets.push('name = ?');         params.push(name); }
  if (role !== undefined)     { sets.push('role = ?');         params.push(role); }
  if (isActive !== undefined) { sets.push('isActive = ?');     params.push(isActive ? 1 : 0); }
  if (password)               { sets.push('passwordHash = ?'); params.push(await bcrypt.hash(password, 12)); }
  if (sets.length === 0) throw new AppError('Nothing to update', 400);

  params.push(id);
  await db.query(`UPDATE users SET ${sets.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);
  const [[updated]] = await db.query(
    `SELECT u.id, u.name, u.email, u.role, u.isActive, u.updatedAt, u.kitchenId, k.name AS kitchenName
     FROM users u LEFT JOIN kitchens k ON k.id = u.kitchenId WHERE u.id = ?`, [id]
  );
  return { ...updated, isActive: !!updated.isActive };
};

const deleteKitchenUser = async (id, companyId) => {
  const [[user]] = await db.query('SELECT id FROM users WHERE id = ? AND companyId = ?', [id, companyId]);
  if (!user) throw new AppError('User not found', 404);
  await db.query('DELETE FROM users WHERE id = ?', [id]);
};

// ─── Verify token ─────────────────────────────────────────────────────────────
const verifyCompanyToken = (token) => {
  try { return jwt.verify(token, COMPANY_JWT_SECRET); }
  catch { return null; }
};

module.exports = {
  companyLogin,
  listKitchens, createKitchen, updateKitchen, deleteKitchen,
  listStores, createStore, updateStore, deleteStore,
  listUnits, createUnit, updateUnit, deleteUnit,
  listKitchenUsers, createKitchenUser, updateKitchenUser, deleteKitchenUser,
  verifyCompanyToken,
};
