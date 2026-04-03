const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/mysql');
const { AppError } = require('../../middleware/error.middleware');

const SALT_ROUNDS = 12;
const ROOT_JWT_SECRET = process.env.JWT_SECRET + '_root';

const generateRootToken = () =>
  jwt.sign({ role: 'ROOT_ADMIN' }, ROOT_JWT_SECRET, { expiresIn: '8h' });

const rootLogin = async ({ email, password }) => {
  const rootEmail = process.env.ROOT_ADMIN_EMAIL || 'root@system.com';
  const rootPassword = process.env.ROOT_ADMIN_PASSWORD || 'Root@1234';
  if (email !== rootEmail || password !== rootPassword) {
    throw new AppError('Invalid root credentials', 401);
  }
  return { token: generateRootToken(), admin: { email: rootEmail, role: 'ROOT_ADMIN' } };
};

const listClients = async () => {
  const [rows] = await db.query(`
    SELECT c.id, c.name, c.adminEmail, c.isActive, c.createdAt,
           COUNT(co.id) AS companiesCount
    FROM clients c
    LEFT JOIN companies co ON co.clientId = c.id
    GROUP BY c.id
    ORDER BY c.createdAt DESC
  `);
  return rows.map(r => ({
    ...r,
    isActive: !!r.isActive,
    _count: { companies: Number(r.companiesCount) },
  }));
};

const createClient = async ({ name, adminEmail, adminPassword }) => {
  const [existing] = await db.query('SELECT id FROM clients WHERE adminEmail = ?', [adminEmail]);
  if (existing.length > 0) throw new AppError('A client with this email already exists', 409);

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
  await db.query(
    'INSERT INTO clients (id, name, adminEmail, passwordHash, isActive) VALUES (?, ?, ?, ?, 1)',
    [id, name, adminEmail, passwordHash]
  );
  const [[client]] = await db.query(
    'SELECT id, name, adminEmail, isActive, createdAt FROM clients WHERE id = ?', [id]
  );
  return { ...client, isActive: !!client.isActive };
};

const updateClient = async (id, { name, adminEmail, adminPassword, isActive }) => {
  const sets = [];
  const params = [];
  if (name !== undefined)       { sets.push('name = ?');         params.push(name); }
  if (adminEmail !== undefined) { sets.push('adminEmail = ?');   params.push(adminEmail); }
  if (isActive !== undefined)   { sets.push('isActive = ?');     params.push(isActive ? 1 : 0); }
  if (adminPassword)            { sets.push('passwordHash = ?'); params.push(await bcrypt.hash(adminPassword, SALT_ROUNDS)); }
  if (sets.length === 0) throw new AppError('Nothing to update', 400);
  params.push(id);
  await db.query(`UPDATE clients SET ${sets.join(', ')}, updatedAt = NOW() WHERE id = ?`, params);
  const [[client]] = await db.query(
    'SELECT id, name, adminEmail, isActive, updatedAt FROM clients WHERE id = ?', [id]
  );
  return { ...client, isActive: !!client.isActive };
};

const deleteClient = async (id) => {
  await db.query('DELETE FROM clients WHERE id = ?', [id]);
};

const verifyRootToken = (token) => {
  try { return jwt.verify(token, ROOT_JWT_SECRET); }
  catch { return null; }
};

module.exports = { rootLogin, listClients, createClient, updateClient, deleteClient, verifyRootToken };
