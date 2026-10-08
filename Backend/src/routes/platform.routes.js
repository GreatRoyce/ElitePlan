const router = require("express").Router();
const rateLimit = require("express-rate-limit").rateLimit;
const platform = require("../controllers/platform.controller");
router.use(platform.noStore);
router.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false, message: { success: false, message: "Too many availability checks. Please try again shortly." } }));
router.get("/availability", platform.publicSettings);
router.get("/ready", platform.readiness);
module.exports = router;
