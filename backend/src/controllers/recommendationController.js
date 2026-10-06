const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");
const { buildProgramRecommendations } = require("../services/recommendationService");

const getRecommendations = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  if (req.user.role !== "counselor" && req.user.id !== studentId) {
    throw new HttpError(403, "You can only view your own recommendations.");
  }
  res.json({ success: true, ...(await buildProgramRecommendations(studentId)) });
});
module.exports = { getRecommendations };
