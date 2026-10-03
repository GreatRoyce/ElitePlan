const Joi = require("joi");

const clientRegisterSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),

  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^\d{11}$/)
    .required(), // exactly 11 digits

  password: Joi.string().min(6).required(),
  howHeard: Joi.string().optional(),
  notes: Joi.string().optional(),
});

module.exports = clientRegisterSchema;
