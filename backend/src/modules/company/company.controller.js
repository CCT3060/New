const svc = require('./company.service');
const { success, created, error } = require('../../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email and password required', 400);
    const result = await svc.companyLogin({ email, password });
    return success(res, result, 'Login successful');
  } catch (err) { next(err); }
};

// ── Kitchens ──────────────────────────────────────────────────────────────────
const listKitchens = async (req, res, next) => {
  try {
    const kitchens = await svc.listKitchens(req.companyUser.companyId);
    return success(res, { kitchens });
  } catch (err) { next(err); }
};

const createKitchen = async (req, res, next) => {
  try {
    const { name, address } = req.body;
    if (!name) return error(res, 'Kitchen name is required', 400);
    const kitchen = await svc.createKitchen(req.companyUser.companyId, req.companyUser.clientId, { name, address });
    return created(res, { kitchen }, 'Kitchen created');
  } catch (err) { next(err); }
};

const updateKitchen = async (req, res, next) => {
  try {
    const kitchen = await svc.updateKitchen(req.params.id, req.companyUser.companyId, req.body);
    return success(res, { kitchen }, 'Kitchen updated');
  } catch (err) { next(err); }
};

const deleteKitchen = async (req, res, next) => {
  try {
    await svc.deleteKitchen(req.params.id, req.companyUser.companyId);
    return success(res, {}, 'Kitchen deleted');
  } catch (err) { next(err); }
};

// ── Stores ────────────────────────────────────────────────────────────────────
const listStores = async (req, res, next) => {
  try {
    const stores = await svc.listStores(req.companyUser.companyId, req.query.kitchenId);
    return success(res, { stores });
  } catch (err) { next(err); }
};

const createStore = async (req, res, next) => {
  try {
    const { name, code, kitchenId } = req.body;
    if (!name || !kitchenId) return error(res, 'name and kitchenId are required', 400);
    const store = await svc.createStore(req.companyUser.companyId, req.companyUser.clientId, { name, code, kitchenId });
    return created(res, { store }, 'Store created');
  } catch (err) { next(err); }
};

const updateStore = async (req, res, next) => {
  try {
    const store = await svc.updateStore(req.params.id, req.companyUser.companyId, req.body);
    return success(res, { store }, 'Store updated');
  } catch (err) { next(err); }
};

const deleteStore = async (req, res, next) => {
  try {
    await svc.deleteStore(req.params.id, req.companyUser.companyId);
    return success(res, {}, 'Store deleted');
  } catch (err) { next(err); }
};

// ── Units ─────────────────────────────────────────────────────────────────────
const listUnits = async (req, res, next) => {
  try {
    const units = await svc.listUnits(req.companyUser.companyId);
    return success(res, { units });
  } catch (err) { next(err); }
};

const createUnit = async (req, res, next) => {
  try {
    const { name, code, address } = req.body;
    if (!name) return error(res, 'Unit name is required', 400);
    const unit = await svc.createUnit(req.companyUser.companyId, req.companyUser.clientId, { name, code, address });
    return created(res, { unit }, 'Unit created');
  } catch (err) { next(err); }
};

const updateUnit = async (req, res, next) => {
  try {
    const unit = await svc.updateUnit(req.params.id, req.companyUser.companyId, req.body);
    return success(res, { unit }, 'Unit updated');
  } catch (err) { next(err); }
};

const deleteUnit = async (req, res, next) => {
  try {
    await svc.deleteUnit(req.params.id, req.companyUser.companyId);
    return success(res, {}, 'Unit deleted');
  } catch (err) { next(err); }
};

// ── Kitchen Users ─────────────────────────────────────────────────────────────
const listKitchenUsers = async (req, res, next) => {
  try {
    const users = await svc.listKitchenUsers(req.companyUser.companyId, req.query.kitchenId);
    return success(res, { users });
  } catch (err) { next(err); }
};

const createKitchenUser = async (req, res, next) => {
  try {
    const { name, email, password, role, kitchenId } = req.body;
    if (!name || !email || !password || !kitchenId) return error(res, 'name, email, password, kitchenId are required', 400);
    const user = await svc.createKitchenUser(req.companyUser.companyId, req.companyUser.clientId, { name, email, password, role, kitchenId });
    return created(res, { user }, 'Kitchen user created');
  } catch (err) { next(err); }
};

const updateKitchenUser = async (req, res, next) => {
  try {
    const user = await svc.updateKitchenUser(req.params.id, req.companyUser.companyId, req.body);
    return success(res, { user }, 'User updated');
  } catch (err) { next(err); }
};

const deleteKitchenUser = async (req, res, next) => {
  try {
    await svc.deleteKitchenUser(req.params.id, req.companyUser.companyId);
    return success(res, {}, 'User deleted');
  } catch (err) { next(err); }
};

module.exports = {
  login,
  listKitchens, createKitchen, updateKitchen, deleteKitchen,
  listStores, createStore, updateStore, deleteStore,
  listUnits, createUnit, updateUnit, deleteUnit,
  listKitchenUsers, createKitchenUser, updateKitchenUser, deleteKitchenUser,
};
