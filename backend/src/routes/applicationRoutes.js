const express = require("express");
const { createApplication, listApplications, updateApplicationStatus } = require("../controllers/applicationController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.get("/", requireAuth, listApplications);
router.post("/", requireAuth, createApplication);
router.patch("/:id/status", requireAuth, updateApplicationStatus);
module.exports = router;
