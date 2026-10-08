const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");
const c = require("../controllers/adverts.controller");
const auth = require("../middleware/authMiddleware");
const { memberRoles } = require("../services/staffAccess.service");
router.use(c.noStore);
router.get("/public", rateLimit({ windowMs: 60000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false, message: { success: false, message: "Too many advert requests. Please try again shortly." } }), c.listPublic);
router.get("/mine", auth(memberRoles), c.listMine);
module.exports = router;
