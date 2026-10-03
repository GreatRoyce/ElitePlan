// validators/planner.schema.js
const Joi = require("joi");

const plannerRegisterSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string()
    .pattern(/^\d{11}$/)
    .required(), // must be 11 digits
  businessname: Joi.string().optional(),
  specialization: Joi.string().optional(),
  howHeard: Joi.string().optional(),
  notes: Joi.string().optional(),
});

module.exports = plannerRegisterSchema;
