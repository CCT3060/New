const portalService = require('./portal.service');
const { success, created, error } = require('../../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email and password required', 400);
    const result = await portalService.portalLogin({ email, password });
    return success(res, result, 'Portal login successful');
  } catch (err) { next(err); }
};

// ── Companies ──────────────────────────────────────────────────────────────

const listCompanies = async (req, res, next) => {
  try {
    const companies = await portalService.listCompanies(req.portalClient.clientId);
    return success(res, { companies });
  } catch (err) { next(err); }
};

const createCompany = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    if (!name) return error(res, 'Company name is required', 400);
    const company = await portalService.createCompany(req.portalClient.clientId, { name, code });
    return created(res, { company }, 'Company created');
  } catch (err) { next(err); }
};

const updateCompany = async (req, res, next) => {
  try {
    const company = await portalService.updateCompany(req.params.id, req.portalClient.clientId, req.body);
    return success(res, { company }, 'Company updated');
  } catch (err) { next(err); }
};

const deleteCompany = async (req, res, next) => {
  try {
    await portalService.deleteCompany(req.params.id, req.portalClient.clientId);
    return success(res, {}, 'Company deleted');
  } catch (err) { next(err); }
};

// ── Users ──────────────────────────────────────────────────────────────────

const listUsers = async (req, res, next) => {
  try {
    const { companyId } = req.query;
    const users = await portalService.listUsers(req.portalClient.clientId, companyId);
    return success(res, { users });
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, companyId } = req.body;
    if (!name || !email || !password) return error(res, 'name, email, password are required', 400);
    const user = await portalService.createUser(req.portalClient.clientId, { name, email, password, role, companyId });
    return created(res, { user }, 'User created');
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await portalService.updateUser(req.params.id, req.portalClient.clientId, req.body);
    return success(res, { user }, 'User updated');
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    await portalService.deleteUser(req.params.id, req.portalClient.clientId);
    return success(res, {}, 'User deleted');
  } catch (err) { next(err); }
};

module.exports = { login, listCompanies, createCompany, updateCompany, deleteCompany, listUsers, createUser, updateUser, deleteUser };
