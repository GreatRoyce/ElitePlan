const Joi = require("joi");

const plannerLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

module.exports = plannerLoginSchema;
