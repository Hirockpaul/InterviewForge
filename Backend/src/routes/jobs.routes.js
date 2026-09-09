const express = require("express");
const auth = require("../middlewares/auth.middlewares").authUser;
const { aiLimiter } = require("../middlewares/rateLimit.middlewares");
const controller = require("../controllers/jobs.controller");

const router = express.Router();
router.get("/", auth, controller.list);
router.get("/recommended", auth, controller.recommended);
router.get("/saved", auth, controller.saved);
router.get("/:id", auth, controller.details);
router.post("/:id/save", auth, controller.save);
router.delete("/:id/save", auth, controller.unsave);
router.post("/:id/analyze", auth, aiLimiter, controller.analyze);
router.post("/:id/prepare", auth, aiLimiter, controller.prepare);
module.exports = router;
