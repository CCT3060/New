const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/mysql');
const { AppError } = require('../../middleware/error.middleware');

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const generateToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const generateRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

const register = async ({ name, email, password, role }) => {
  const [[existing]] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) throw new AppError('A user with this email already exists', 409);

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await db.query(
    'INSERT INTO users (id, name, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())',
    [id, name, email, passwordHash, role || 'KITCHEN_MANAGER']
  );
  const [[user]] = await db.query('SELECT id, name, email, role, createdAt FROM users WHERE id = ?', [id]);
  return user;
};

const login = async ({ email, password }) => {
  const [[user]] = await db.query(
    'SELECT id, name, email, role, isActive, passwordHash, kitchenId FROM users WHERE email = ?',
    [email]
  );
  if (!user) throw new AppError('Invalid email or password', 401);
  if (!user.isActive) throw new AppError('Your account has been deactivated. Contact admin.', 401);

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) throw new AppError('Invalid email or password', 401);

  const token = generateToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  const { passwordHash: _, ...userWithoutPassword } = user;
  userWithoutPassword.isActive = !!userWithoutPassword.isActive;

  let kitchen = null;
  if (user.kitchenId) {
    const [[k]] = await db.query('SELECT id, name FROM kitchens WHERE id = ?', [user.kitchenId]);
    kitchen = k || null;
  }

  return { user: userWithoutPassword, token, refreshToken, kitchen };
};

const getProfile = async (userId) => {
  const [[user]] = await db.query(
    'SELECT id, name, email, role, isActive, createdAt FROM users WHERE id = ?', [userId]
  );
  if (!user) throw new AppError('User not found', 404);
  return { ...user, isActive: !!user.isActive };
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const [[user]] = await db.query('SELECT id, passwordHash FROM users WHERE id = ?', [userId]);
  if (!user) throw new AppError('User not found', 404);

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new AppError('Current password is incorrect', 400);

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.query('UPDATE users SET passwordHash = ?, updatedAt = NOW() WHERE id = ?', [newHash, userId]);
};

const listUsers = async () => {
  const [rows] = await db.query(
    'SELECT id, name, email, role, isActive, createdAt FROM users ORDER BY createdAt DESC'
  );
  return rows.map(r => ({ ...r, isActive: !!r.isActive }));
};

module.exports = { register, login, getProfile, changePassword, listUsers };
