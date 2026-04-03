const rootService = require('./root.service');
const { success, created, error } = require('../../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email and password required', 400);
    const result = await rootService.rootLogin({ email, password });
    return success(res, result, 'Root login successful');
  } catch (err) { next(err); }
};

const listClients = async (req, res, next) => {
  try {
    const clients = await rootService.listClients();
    return success(res, { clients }, 'Clients retrieved');
  } catch (err) { next(err); }
};

const createClient = async (req, res, next) => {
  try {
    const { name, adminEmail, adminPassword } = req.body;
    if (!name || !adminEmail || !adminPassword)
      return error(res, 'name, adminEmail, adminPassword are required', 400);
    const client = await rootService.createClient({ name, adminEmail, adminPassword });
    return created(res, { client }, 'Client registered successfully');
  } catch (err) { next(err); }
};

const updateClient = async (req, res, next) => {
  try {
    const client = await rootService.updateClient(req.params.id, req.body);
    return success(res, { client }, 'Client updated');
  } catch (err) { next(err); }
};

const deleteClient = async (req, res, next) => {
  try {
    await rootService.deleteClient(req.params.id);
    return success(res, {}, 'Client deleted');
  } catch (err) { next(err); }
};

module.exports = { login, listClients, createClient, updateClient, deleteClient };
