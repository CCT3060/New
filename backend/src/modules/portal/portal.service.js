const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/mysql');
const { AppError } = require('../../middleware/error.middleware');

const SALT_ROUNDS = 12;
const PORTAL_JWT_SECRET = process.env.JWT_SECRET + '_portal';

const generatePortalToken = (clientId) =>
  jwt.sign({ clientId, role: 'CLIENT_ADMIN' }, PORTAL_JWT_SECRET, { expiresIn: '8h' });

// ─── Login ────────────────────────────────────────────────────────────────────
const portalLogin = async ({ email, password }) => {
  const [[client]] = await db.query(
    'SELECT id, name, adminEmail, passwordHash, isActive FROM clients WHERE adminEmail = ?',
    [email]
  );
  if (!client) throw new AppError('Invalid email or password', 401);
  if (!client.isActive) throw new AppError('Your client account is inactive. Contact root admin.', 401);

  const valid = await bcrypt.compare(password, client.passwordHash);
  if (!valid) throw new AppError('Invalid email or password', 401);

  const token = generatePortalToken(client.id);
  const { passwordHash: _, ...clientData } = client;
  return { token, client: { ...clientData, isActive: !!clientData.isActive } };
};

// ─── Companies ───────────────────────────────────────────────────────────────
const listCompanies = async (clientId) => {
  const [rows] = await db.query(
    'SELECT id, name, code, isActive, createdAt FROM companies WHERE clientId = ? ORDER BY createdAt DESC',
    [clientId]
  );
  return rows.map(r => ({ ...r, isActive: !!r.isActive }));
};

const createCompany = async (clientId, { name, code }) => {
  const id = uuidv4();
  const compCode = code || name.toUpperCase().replace(/\s+/g, '_').slice(0, 20);
  await db.query(
    'INSERT INTO companies (id, name, code, clientId, isActive, updatedAt) VALUES (?, ?, ?, ?, 1, NOW())',
    [id, name, compCode, clientId]
  );
  const [[company]] = await db.query(
    'SELECT id, name, code, isActive, createdAt FROM companies WHERE id = ?', [id]
  );
  return { ...company, isActive: !!company.isActive };
};

const updateCompany = async (id, clientId, { name, code, isActive }) => {
  const [[company]] = await db.query('SELECT id FROM companies WHERE id = ? AND clientId = ?', [id, clientId]);
  if (!company) throw new AppError('Company not found', 404);

  const sets = [];
  const params = [];
  if (name !== undefined)     { sets.push('name = ?');     params.push(name); }
  if (code !== undefined)     { sets.push('code = ?');     params.push(code); }
  if (isActive !== undefined) { sets.push('isActive = ?'); params.push(isActive ? 1 : 0); }
  if (sets.length === 0) throw new AppError('Nothing to update', 400);

  params.push(id);
  await db.query(`UPDATE companies SET ${sets.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);

  const [[updated]] = await db.query(
    'SELECT id, name, code, isActive, updatedAt FROM companies WHERE id = ?', [id]
  );
  return { ...updated, isActive: !!updated.isActive };
};

const deleteCompany = async (id, clientId) => {
  const [[company]] = await db.query('SELECT id FROM companies WHERE id = ? AND clientId = ?', [id, clientId]);
  if (!company) throw new AppError('Company not found', 404);
  await db.query('UPDATE users SET companyId = NULL WHERE companyId = ?', [id]);
  await db.query('DELETE FROM companies WHERE id = ?', [id]);
};

// ─── Users ────────────────────────────────────────────────────────────────────
const listUsers = async (clientId) => {
  const [rows] = await db.query(`
    SELECT u.id, u.name, u.email, u.role, u.isActive, u.createdAt, u.companyId,
           co.name AS companyName
    FROM users u
    LEFT JOIN companies co ON co.id = u.companyId
    WHERE u.clientId = ?
    ORDER BY u.createdAt DESC
  `, [clientId]);
  return rows.map(r => ({
    ...r,
    isActive: !!r.isActive,
    companyId: r.companyId || null,
  }));
};

const createUser = async (clientId, { name, email, password, role, companyId }) => {
  const [[existing]] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) throw new AppError('A user with this email already exists', 409);

  if (companyId) {
    const [[comp]] = await db.query('SELECT id FROM companies WHERE id = ? AND clientId = ?', [companyId, clientId]);
    if (!comp) throw new AppError('Company not found', 404);
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await db.query(
    'INSERT INTO users (id, name, email, passwordHash, role, isActive, clientId, companyId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW(), NOW())',
    [id, name, email, passwordHash, role || 'KITCHEN_MANAGER', clientId, companyId || null]
  );
  const [[user]] = await db.query(
    'SELECT id, name, email, role, isActive, createdAt FROM users WHERE id = ?', [id]
  );
  return { ...user, isActive: !!user.isActive };
};

const updateUser = async (id, clientId, { name, role, isActive, companyId, password }) => {
  const [[user]] = await db.query('SELECT id FROM users WHERE id = ? AND clientId = ?', [id, clientId]);
  if (!user) throw new AppError('User not found', 404);

  const sets = [];
  const params = [];
  if (name !== undefined)     { sets.push('name = ?');         params.push(name); }
  if (role !== undefined)     { sets.push('role = ?');         params.push(role); }
  if (isActive !== undefined) { sets.push('isActive = ?');     params.push(isActive ? 1 : 0); }
  if (companyId !== undefined){ sets.push('companyId = ?');    params.push(companyId || null); }
  if (password)               { sets.push('passwordHash = ?'); params.push(await bcrypt.hash(password, SALT_ROUNDS)); }
  if (sets.length === 0) throw new AppError('Nothing to update', 400);

  params.push(id);
  await db.query(`UPDATE users SET ${sets.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);

  const [[updated]] = await db.query(
    'SELECT id, name, email, role, isActive, updatedAt FROM users WHERE id = ?', [id]
  );
  return { ...updated, isActive: !!updated.isActive };
};

const deleteUser = async (id, clientId) => {
  const [[user]] = await db.query('SELECT id FROM users WHERE id = ? AND clientId = ?', [id, clientId]);
  if (!user) throw new AppError('User not found', 404);
  await db.query('DELETE FROM users WHERE id = ?', [id]);
};

const verifyPortalToken = (token) => {
  try { return jwt.verify(token, PORTAL_JWT_SECRET); }
  catch { return null; }
};

module.exports = {
  portalLogin, listCompanies, createCompany, updateCompany, deleteCompany,
  listUsers, createUser, updateUser, deleteUser, verifyPortalToken,
};
