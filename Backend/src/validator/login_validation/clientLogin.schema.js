// clientLogin.schema.js (for login)
const Joi = require("joi");

const clientLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

module.exports = clientLoginSchema;
