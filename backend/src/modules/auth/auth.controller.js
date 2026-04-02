const authService = require('./auth.service');
const { loginSchema, registerSchema, changePasswordSchema } = require('./auth.validation');
const { success, created, validationError } = require('../../utils/response');

const login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) return validationError(res, error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));

    const result = await authService.login(value);
    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) return validationError(res, error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));

    const user = await authService.register(value);
    return created(res, user, 'User registered successfully');
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return success(res, user);
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body, { abortEarly: false });
    if (error) return validationError(res, error.details.map((d) => ({ field: d.path.join('.'), message: d.message })));

    await authService.changePassword(req.user.id, value);
    return success(res, {}, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const users = await authService.listUsers();
    return success(res, users);
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, getProfile, changePassword, listUsers };
