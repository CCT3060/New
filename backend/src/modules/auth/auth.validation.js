const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(50).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
    'string.pattern.base': 'Password must contain uppercase, lowercase, and a number',
  }),
  role: Joi.string().valid('ADMIN', 'OPS_MANAGER', 'KITCHEN_MANAGER', 'STORE_MANAGER', 'APPROVER').required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(50).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required(),
});

module.exports = { loginSchema, registerSchema, changePasswordSchema };
