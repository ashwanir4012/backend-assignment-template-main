const Application = require("../models/Application");
const Program = require("../models/Program");
const Student = require("../models/Student");
const { applicationStatuses, validStatusTransitions } = require("../config/constants");
const cacheService = require("../services/cacheService");
const asyncHandler = require("../utils/asyncHandler");
const HttpError = require("../utils/httpError");

const listApplications = asyncHandler(async (req, res) => {
  const filters = {};
  if (req.user.role === "student") filters.student = req.user._id;
  else if (req.query.studentId) filters.student = req.query.studentId;
  if (req.query.status) {
    if (!applicationStatuses.includes(req.query.status)) throw new HttpError(400, "Unknown application status.");
    filters.status = req.query.status;
  }
  const applications = await Application.find(filters).populate("student", "fullName email role")
    .populate("program", "title degreeLevel tuitionFeeUsd").populate("university", "name country city")
    .sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: applications });
});

const createApplication = asyncHandler(async (req, res) => {
  const { programId, intake, studentId } = req.body;
  if (!programId || typeof intake !== "string" || !intake.trim()) throw new HttpError(400, "programId and intake are required.");
  const student = req.user.role === "counselor" && studentId ? await Student.findById(studentId) : req.user;
  if (!student) throw new HttpError(404, "Student not found.");
  const program = await Program.findById(programId).lean();
  if (!program) throw new HttpError(404, "Program not found.");
  const normalizedIntake = intake.trim();
  if (!program.intakes.includes(normalizedIntake)) throw new HttpError(400, "The selected intake is not available for this program.");
  try {
    const application = await Application.create({ student: student._id, program: program._id, university: program.university, destinationCountry: program.country, intake: normalizedIntake });
    cacheService.delete("dashboard-overview");
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    if (error.code === 11000) throw new HttpError(409, "An application for this program and intake already exists.");
    throw error;
  }
});

const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!applicationStatuses.includes(status)) throw new HttpError(400, "Unknown application status.");
  const application = await Application.findById(req.params.id);
  if (!application) throw new HttpError(404, "Application not found.");
  if (req.user.role !== "counselor" && application.student.toString() !== req.user.id) throw new HttpError(403, "You cannot update this application.");
  if (req.user.role === "student" && status !== "submitted") throw new HttpError(403, "Students can only submit a draft application.");
  if (!validStatusTransitions[application.status].includes(status)) throw new HttpError(409, `Cannot move an application from ${application.status} to ${status}.`);
  application.status = status;
  application.timeline.push({ status, note: typeof note === "string" ? note.trim() : "" });
  await application.save();
  cacheService.delete("dashboard-overview");
  res.json({ success: true, data: application });
});
module.exports = { createApplication, listApplications, updateApplicationStatus };
