const jwt = require("jsonwebtoken");
const env = require("../config/env");
const Student = require("../models/Student");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

function publicStudent(student) {
  return {
    id: student._id, fullName: student.fullName, email: student.email, role: student.role,
    targetCountries: student.targetCountries, interestedFields: student.interestedFields,
    preferredIntake: student.preferredIntake, maxBudgetUsd: student.maxBudgetUsd,
    englishTest: student.englishTest, profileComplete: student.profileComplete, createdAt: student.createdAt,
  };
}

function createToken(student) {
  return jwt.sign({ role: student.role }, env.jwtSecret, {
    subject: student._id.toString(), expiresIn: env.jwtExpiresIn,
  });
}

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, targetCountries, interestedFields, preferredIntake, maxBudgetUsd, englishTest } = req.body;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (typeof fullName !== "string" || fullName.trim().length < 2) throw new HttpError(400, "Full name must contain at least 2 characters.");
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new HttpError(400, "A valid email address is required.");
  if (typeof password !== "string" || password.length < 8) throw new HttpError(400, "Password must contain at least 8 characters.");
  if (await Student.exists({ email: normalizedEmail })) throw new HttpError(409, "An account with this email already exists.");
  const student = await Student.create({
    fullName: fullName.trim(), email: normalizedEmail, password, role: "student",
    targetCountries: Array.isArray(targetCountries) ? targetCountries : [],
    interestedFields: Array.isArray(interestedFields) ? interestedFields : [],
    preferredIntake: typeof preferredIntake === "string" ? preferredIntake.trim() : "",
    maxBudgetUsd: Number.isFinite(Number(maxBudgetUsd)) ? Number(maxBudgetUsd) : undefined,
    englishTest: englishTest && typeof englishTest === "object" ? englishTest : undefined,
    profileComplete: Boolean(targetCountries?.length && interestedFields?.length && preferredIntake),
  });
  res.status(201).json({ success: true, data: { student: publicStudent(student), token: createToken(student) } });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!normalizedEmail || typeof password !== "string") throw new HttpError(400, "Email and password are required.");
  const student = await Student.findOne({ email: normalizedEmail });
  if (!student || !(await student.comparePassword(password))) throw new HttpError(401, "Email or password is incorrect.");
  res.json({ success: true, data: { student: publicStudent(student), token: createToken(student) } });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { student: publicStudent(req.user) } });
});

module.exports = { register, login, me };
