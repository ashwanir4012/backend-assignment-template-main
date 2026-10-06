const Program = require("../models/Program");
const Student = require("../models/Student");
const HttpError = require("../utils/httpError");

async function buildProgramRecommendations(studentId) {
  const student = await Student.findById(studentId).lean();
  if (!student) throw new HttpError(404, "Student not found.");
  const countries = (student.targetCountries || []).filter(Boolean);
  const fields = (student.interestedFields || []).filter(Boolean).map((field) => field.toLowerCase());
  const budget = Number(student.maxBudgetUsd) || 0;
  const intake = student.preferredIntake || "";
  const score = Number(student.englishTest?.score) || 0;
  const pipeline = [
    ...(countries.length ? [{ $match: { country: { $in: countries } } }] : []),
    { $addFields: { countryMatch: countries.length ? { $in: ["$country", countries] } : false, fieldMatch: fields.length ? { $in: [{ $toLower: "$field" }, fields] } : false, budgetMatch: budget > 0 ? { $lte: ["$tuitionFeeUsd", budget] } : false, intakeMatch: intake ? { $in: [intake, "$intakes"] } : false, englishMatch: { $lte: ["$minimumIelts", score] } } },
    { $addFields: { matchScore: { $add: [{ $cond: ["$countryMatch", 35, 0] }, { $cond: ["$fieldMatch", 30, 0] }, { $cond: ["$budgetMatch", 20, 0] }, { $cond: ["$intakeMatch", 10, 0] }, { $cond: ["$englishMatch", 5, 0] }] } } },
    { $match: { matchScore: { $gt: 0 } } }, { $sort: { matchScore: -1, tuitionFeeUsd: 1 } }, { $limit: 5 },
    { $project: { university: 1, universityName: 1, country: 1, city: 1, title: 1, field: 1, degreeLevel: 1, tuitionFeeUsd: 1, intakes: 1, durationMonths: 1, minimumIelts: 1, scholarshipAvailable: 1, matchScore: 1,
      reasons: { $filter: { input: [{ $cond: ["$countryMatch", { $concat: ["Preferred country: ", "$country"] }, null] }, { $cond: ["$fieldMatch", { $concat: ["Field alignment: ", "$field"] }, null] }, { $cond: ["$budgetMatch", "Within budget", null] }, { $cond: ["$intakeMatch", "Preferred intake available", null] }, { $cond: ["$englishMatch", "English score meets requirement", null] }], as: "reason", cond: { $ne: ["$$reason", null] } } } } },
  ];
  const recommendations = await Program.aggregate(pipeline);
  return { data: { student: { id: student._id, fullName: student.fullName, targetCountries: countries, interestedFields: student.interestedFields }, recommendations }, meta: { implementation: "mongodb-aggregation", resultCount: recommendations.length } };
}
module.exports = { buildProgramRecommendations };
