const Joi = require("joi");

const vendorRegisterSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  companyName: Joi.string().max(100).optional(),
  email: Joi.string().email().required(),
  phone: Joi.string()
    .pattern(/^\d{11}$/)
    .required(), // exactly 11 digits
  serviceType: Joi.string().max(100).optional(),
  password: Joi.string().min(6).required(),
  howHeard: Joi.string().optional(),
  notes: Joi.string().optional(),
});

module.exports = vendorRegisterSchema;
