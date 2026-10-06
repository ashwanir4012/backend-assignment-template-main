const express = require("express");
const { getRecommendations } = require("../controllers/recommendationController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.get("/:studentId", requireAuth, getRecommendations);
module.exports = router;
