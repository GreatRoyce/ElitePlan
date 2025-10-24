const express = require("express");
const router = express.Router();
const {
  createConsultation,
} = require("../controllers/initialConsultation.controller");

router.post("/initial-consultation", createConsultation);

module.exports = router;
